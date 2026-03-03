# GreptimeDB on EKS Deployment Runbook

From-scratch runbook for deploying GreptimeDB on EKS with a mostly declarative `eksctl` flow.

It deploys: EKS 1.35, AL2023, 3x m7g.large, 3 AZs, EBS CSI, S3 object storage, EBS WAL, Aurora Postgres metadata with SSL Require, internal LoadBalancer for the frontend.

Environment-specific values (VPC, subnets, Aurora host, S3 bucket, IAM role, etc.) are marked as `<PLACEHOLDER>` in `cluster.yaml` and `greptime-values.yaml` -- replace them before running the corresponding steps.

## 0) One-time shell setup

```
export GREPTIME_NS="greptime"
export HELM_RELEASE_CLUSTER="greptime-cluster"
```

## 1) Create cluster

Replace the `<PLACEHOLDER>` values in `cluster.yaml` with your VPC, subnet, and region before running.

```
eksctl create cluster -f infra/k8s/greptime/cluster.yaml
```

## 2) Create S3 bucket (object storage)

```
aws s3api create-bucket \
  --bucket "<S3_BUCKET>" \
  --region "<AWS_REGION>" \
  --create-bucket-configuration LocationConstraint="<AWS_REGION>"
```

## 3) Install GreptimeDB operator (Helm)

```
helm repo add greptime https://greptimeteam.github.io/helm-charts/
helm repo update

helm upgrade --install greptimedb-operator greptime/greptimedb-operator -n greptimedb-admin --create-namespace
```

## 4) Deploy Greptime cluster (Helm)

Replace the `<PLACEHOLDER>` values in `greptime-values.yaml` with your Aurora host, database, S3 bucket, and region before running.

```
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" --create-namespace \
  -f infra/k8s/greptime/greptime-values.yaml
```

## 5) Create IAM role for datanode S3 access (IRSA)

Use an S3 policy ARN, then let `eksctl` create the IRSA role/trust for the datanode service account.
Set `<GREPTIME_S3_ROLE_ARN>` in `greptime-values.yaml` to the printed role ARN, then run Helm upgrade again to apply it.

```
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

```
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" \
  -f infra/k8s/greptime/greptime-values.yaml
```

## 7) Create Aurora credentials secret (metasrv backend)

```
kubectl -n "$GREPTIME_NS" create secret generic meta-postgresql-credentials \
  --from-literal=username="<POSTGRES_USER>" \
  --from-literal=password="<POSTGRES_PASSWORD>"
```

## 8) Restart Greptime workloads (pick up secret and updated ServiceAccount configuration)

```
kubectl -n "$GREPTIME_NS" rollout restart deployment,statefulset
```

## 9) Verify (pods, service, health, meta logs)

```
# Pods should be Running/Ready
kubectl -n "$GREPTIME_NS" get pods -o wide

# API health check (expect {})
kubectl -n "$GREPTIME_NS" run curl-test --rm -i --restart=Never \
  --image=curlimages/curl:8.6.0 \
  --command -- curl -sS http://${HELM_RELEASE_CLUSTER}-frontend.${GREPTIME_NS}.svc.cluster.local:4000/health

# S3 check (expect no output)
kubectl -n "$GREPTIME_NS" logs statefulset/${HELM_RELEASE_CLUSTER}-datanode --since=10m | rg "AccessDenied|OpenDAL operator failed|no valid credential found|Unable to load credentials"
```
