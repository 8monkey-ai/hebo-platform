# GreptimeDB on EKS Deployment Runbook

From-scratch runbook for deploying GreptimeDB on EKS with a mostly declarative `eksctl` flow.

It deploys: EKS 1.35, AL2023, 3x m7g.large, 3 AZs, hybrid IAM wiring (IRSA for Greptime datanodes + Pod Identity for EKS managed addons), EBS CSI, S3 object storage, EBS WAL, Aurora Postgres metadata with SSL Require.

The frontend service is exposed only via an **internal NLB** (VPC-only) using the in-tree cloud controller. ECS services reach it through the private DNS name. Human access to the dashboard is via `kubectl port-forward`.

Environment-specific values (VPC, subnets, Aurora host, S3 bucket, IAM role, etc.) are marked as `<PLACEHOLDER>` in `cluster.yaml` and `greptime-values.yaml` -- replace them before running the corresponding steps.

## 0) One-time shell setup

```bash
export GREPTIME_NS="greptime"
export HELM_RELEASE_CLUSTER="greptime-cluster"
```

## 1) Create cluster

Replace the `<PLACEHOLDER>` values in `cluster.yaml` with your VPC, subnet, and region before running.

```bash
eksctl create cluster -f infra/k8s/greptime/cluster.yaml
```

## 2) Create S3 bucket (object storage)

```bash
aws s3api create-bucket \
  --bucket "<S3_BUCKET>" \
  --region "<AWS_REGION>" \
  --create-bucket-configuration LocationConstraint="<AWS_REGION>"
```

## 3) Install GreptimeDB operator (Helm)

```bash
helm repo add greptime https://greptimeteam.github.io/helm-charts/
helm repo update

helm upgrade --install greptimedb-operator greptime/greptimedb-operator -n greptimedb-admin --create-namespace
```

## 4) Deploy Greptime cluster (Helm)

Replace the `<PLACEHOLDER>` values in `greptime-values.yaml` with your Aurora host, database, S3 bucket, and region before running.

```bash
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" --create-namespace \
  -f infra/k8s/greptime/greptime-values.yaml
```

## 5) Create IAM role for datanode S3 access (IRSA)

Use an S3 policy ARN, then let `eksctl` create the IRSA role/trust for the datanode service account.
Set `<GREPTIME_S3_ROLE_ARN>` in `greptime-values.yaml` to the printed role ARN, then run Helm upgrade again to apply it.

```bash
eksctl create iamserviceaccount \
  --cluster "<CLUSTER_NAME>" \
  --region "<AWS_REGION>" \
  --namespace "$GREPTIME_NS" \
  --name "${HELM_RELEASE_CLUSTER}-datanode" \
  --role-name "GreptimeS3Role-<CLUSTER_NAME>" \
  --attach-policy-arn "arn:aws:iam::aws:policy/AmazonS3FullAccess" \
  --role-only \
  --approve

aws iam get-role --role-name "GreptimeS3Role-<CLUSTER_NAME>" --query 'Role.Arn' --output text
```

## 6) Apply updated Helm values (role ARN)

```bash
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" \
  -f infra/k8s/greptime/greptime-values.yaml
```

## 7) Create Aurora credentials secret (metasrv backend)

```bash
kubectl -n "$GREPTIME_NS" create secret generic meta-postgresql-credentials \
  --from-literal=username="<POSTGRES_USER>" \
  --from-literal=password="<POSTGRES_PASSWORD>"
```

## 8) Restart Greptime workloads (pick up secret and updated ServiceAccount configuration)

```bash
kubectl -n "$GREPTIME_NS" rollout restart deployment,statefulset
```

## 9) Verify (pods, service, health, meta logs)

```bash
# Pods should be Running/Ready
kubectl -n "$GREPTIME_NS" get pods -o wide

# API health check (expect {})
kubectl -n "$GREPTIME_NS" run curl-test --rm -i --restart=Never \
  --image=curlimages/curl:8.6.0 \
  --command -- curl -sS http://${HELM_RELEASE_CLUSTER}-frontend.${GREPTIME_NS}.svc.cluster.local:4000/health

# S3 check (expect no output)
kubectl -n "$GREPTIME_NS" logs statefulset/${HELM_RELEASE_CLUSTER}-datanode --since=10m | rg "AccessDenied|OpenDAL operator failed|no valid credential found|Unable to load credentials"
```

---

## Upgrading GreptimeDB

Target versions:

| Component | Chart                       | Image           |
| --------- | --------------------------- | --------------- |
| Operator  | `greptimedb-operator` 0.6.3 | `v0.6.1`        |
| Cluster   | `greptimedb-cluster` 0.8.39 | `v1.3.0-beta.2` |

Expected impact: no full downtime. The operator restarts pods one at a time. While a datanode restarts, its regions cannot be read or written. Some telemetry writes fail, and console trace queries can fail for a short time. The rollout order of datanodes and frontends does not matter for this setup: the 1.3 rule "datanodes before frontends" applies to PromQL plans, and this setup does not use PromQL.

### 1) Prepare the values file

Get the live values and compare them with `greptime-values.yaml`. The repo file uses placeholders for hosts, bucket, and role ARN. Replace each placeholder with the live value, and set `image.tag` to `v1.3.0-beta.2`.

```bash
helm get values "$HELM_RELEASE_CLUSTER" -n "$GREPTIME_NS" -o yaml > /tmp/greptime-live-values.yaml
diff /tmp/greptime-live-values.yaml infra/k8s/greptime/greptime-values.yaml
```

### 2) Back up the data

Open a port-forward to the frontend in a separate shell:

```bash
kubectl -n "$GREPTIME_NS" port-forward svc/${HELM_RELEASE_CLUSTER}-frontend 4000:4000
```

Flush all tables in `public`, so that the S3 copy holds all data. Metric tables share the regions of `greptime_physical_table`, so flush only that table for them:

```bash
greptime_sql() {
  curl -sS "http://localhost:4000/v1/sql?db=public" --data-urlencode "sql=$1"
}

greptime_sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (engine = 'mito' OR table_name = 'greptime_physical_table')" \
  | jq -r '.output[0].records.rows[][0]' \
  | while read -r table; do
      echo "$table"
      greptime_sql "ADMIN FLUSH_TABLE('$table')"
      echo
    done
```

Take an Aurora cluster snapshot. The snapshot includes the metadata schema.

```bash
export BACKUP_DATE="$(date +%Y%m%d)"

aws rds create-db-cluster-snapshot \
  --db-cluster-identifier "<AURORA_CLUSTER_ID>" \
  --db-cluster-snapshot-identifier "greptime-pre-upgrade-${BACKUP_DATE}"
```

Copy the S3 data prefix:

```bash
aws s3 sync "s3://<S3_BUCKET>/<S3_PREFIX>" "s3://<BACKUP_BUCKET>/<S3_PREFIX>-${BACKUP_DATE}"
```

### 3) Delete failed pods

Pods in `ContainerStatusUnknown` state have the phase `Failed`. List them, then delete them:

```bash
kubectl -n "$GREPTIME_NS" get pods --field-selector=status.phase=Failed
kubectl -n "$GREPTIME_NS" delete pods --field-selector=status.phase=Failed
```

### 4) Upgrade the operator

Upgrade the operator first. The cluster chart 0.8.x renders fields that only operator v0.6.x knows. This step also restarts the frontend pods once.

```bash
helm repo update
helm upgrade --install greptimedb-operator greptime/greptimedb-operator \
  -n greptimedb-admin \
  --version 0.6.3
```

Make sure that the cluster stays `Running`:

```bash
kubectl -n "$GREPTIME_NS" get greptimedbclusters.greptime.io -w
```

### 5) Upgrade the cluster

```bash
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" \
  --version 0.8.39 \
  -f infra/k8s/greptime/greptime-values.yaml
```

Monitor the rollout:

```bash
kubectl -n "$GREPTIME_NS" get pods -o wide -w
```

### 6) Verify

```bash
# All pods show greptime/greptimedb:v1.3.0-beta.2
kubectl -n "$GREPTIME_NS" get pods \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# API health check (expect {})
kubectl -n "$GREPTIME_NS" run curl-test --rm -i --restart=Never \
  --image=curlimages/curl:8.6.0 \
  --command -- curl -sS http://${HELM_RELEASE_CLUSTER}-frontend.${GREPTIME_NS}.svc.cluster.local:4000/health

# Frontend applies the write retry setting (expect max_retries: 0).
# GreptimeDB ignores a misspelled config section and gives no error.
kubectl -n "$GREPTIME_NS" logs deployment/${HELM_RELEASE_CLUSTER}-frontend | rg "Frontend options" | rg -o "max_retries: 0"

# Metasrv logs (expect no output)
kubectl -n "$GREPTIME_NS" logs deployment/${HELM_RELEASE_CLUSTER}-meta --since=10m | rg "ERROR|Failed"

# Datanode logs (expect no output)
kubectl -n "$GREPTIME_NS" logs statefulset/${HELM_RELEASE_CLUSTER}-datanode --since=10m | rg "ERROR|AccessDenied|OpenDAL operator failed"
```

Make sure that new rows arrive. Use the port-forward and `greptime_sql` from step 2. Each count must be more than 0.

```bash
greptime_sql "SELECT count(*) FROM opentelemetry_traces WHERE \"timestamp\" > now() - INTERVAL '5 minutes'"
greptime_sql "SELECT count(*) FROM opentelemetry_logs WHERE \"timestamp\" > now() - INTERVAL '5 minutes'"
greptime_sql "SELECT count(*) FROM http_server_request_duration_seconds_count WHERE greptime_timestamp > now() - INTERVAL '5 minutes'"
```

Open the console. Make sure that the traces list and the trace detail load.

### 7) Rebuild the logs full-text index

Until the build completes, `matches_term` and `LIKE` searches scan old SST files without the index.

```bash
greptime_sql "ADMIN BUILD_INDEX('opentelemetry_logs')"
```

Monitor the progress. A file has the new index when the `fulltext` object in `meta_json` contains `bloom_version`:

```bash
greptime_sql "SELECT meta_json FROM information_schema.ssts_index_meta WHERE table_id = (SELECT table_id FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opentelemetry_logs') AND index_type LIKE 'fulltext%' LIMIT 20"
```

### Rollback

Try the options in this order:

1. Downgrade with Helm to chart 0.7.10 and image `v1.0.0`. Set `image.tag` to `v1.0.0` in the values file. This path is not tested.

   ```bash
   helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
     -n "$GREPTIME_NS" \
     --version 0.7.10 \
     -f infra/k8s/greptime/greptime-values.yaml
   ```

2. If `v1.0.0` does not start, restore the backup from step 2: restore the Aurora snapshot, copy the S3 backup back to `s3://<S3_BUCKET>/<S3_PREFIX>`, and delete the datanode and WAL PVCs. Then run option 1 again.
3. As a last resort, do a clean install of `v1.0.0`. This deletes all data. Logs and metrics have no TTL, so this loses all history.
