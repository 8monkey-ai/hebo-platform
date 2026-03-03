# GreptimeDB on EKS Deployment Runbook

From-scratch runbook for deploying GreptimeDB on EKS with a mostly declarative `eksctl` flow.

It deploys: EKS 1.35, AL2023, 3× m7g.large, 2 AZs, Pod Identity, EBS CSI, S3 object storage, EBS WAL, Aurora Postgres metadata with SSL Require, internal LoadBalancer for the frontend.

Environment-specific values (VPC, subnets, Aurora host, S3 bucket, etc.) are marked as `<PLACEHOLDER>` in `cluster.yaml`, `pod-identity-association.yaml`, and `greptime-values.yaml` -- replace them before running the corresponding steps.

## 0) One-time shell setup

```
export AWS_REGION="us-east-2"
export CLUSTER="greptime-eks"
export S3_BUCKET="greptime-bucket"
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
  --bucket "$S3_BUCKET" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"
```

## 3) Install GreptimeDB operator (Helm)

```
helm repo add greptime https://greptimeteam.github.io/helm-charts/
helm repo update

helm upgrade --install greptimedb-operator greptime/greptimedb-operator -n greptimedb-admin --create-namespace
```

## 4) Deploy Greptime cluster (Helm)

Replace the `<PLACEHOLDER>` values in `greptime-values.yaml` with your Aurora host, database, S3 bucket, region, and prefix before running.

```
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" --create-namespace \
  -f infra/k8s/greptime/greptime-values.yaml
```

## 5) Create Aurora credentials secret (metasrv backend)

```
kubectl -n "$GREPTIME_NS" create secret generic meta-postgresql-credentials \
  --from-literal=username="greptime_user" \
  --from-literal=password="REPLACE_ME"
```

## 6) Create Pod Identity association (S3 access)

Replace `<PLACEHOLDER>` values in `pod-identity-association.yaml` first, then apply:

```
eksctl create podidentityassociation -f infra/k8s/greptime/pod-identity-association.yaml
```

## 7) Restart Greptime workloads

Restart Greptime workloads so pods refresh credentials after the secret and Pod Identity association are attached:

```
kubectl -n "$GREPTIME_NS" rollout restart deployment,statefulset -l app.kubernetes.io/instance="$HELM_RELEASE_CLUSTER"
```

## 8) Verify (pods, service, health, meta logs)

```
kubectl -n "$GREPTIME_NS" get pods -o wide
kubectl -n "$GREPTIME_NS" get svc -o wide
kubectl -n "$GREPTIME_NS" get pvc

# In-cluster health check (no need for port-forward)
kubectl -n "$GREPTIME_NS" run curl-test --rm -i --restart=Never \
  --image=curlimages/curl:8.6.0 \
  --command -- curl -sS http://${HELM_RELEASE_CLUSTER}-frontend.${GREPTIME_NS}.svc.cluster.local:4000/health

# metasrv logs (tail)
kubectl -n "$GREPTIME_NS" logs deploy/${HELM_RELEASE_CLUSTER}-meta --tail=100
```
