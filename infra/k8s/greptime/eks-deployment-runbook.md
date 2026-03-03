# GreptimeDB on EKS Deployment Runbook

From-scratch runbook for deploying GreptimeDB on EKS with explicit CLI commands.

It deploys: EKS 1.35, AL2023, 3× m7g.large, 2 AZs, Pod Identity, EBS CSI, S3 object storage, EBS WAL, Aurora Postgres metadata with SSL Require, internal LoadBalancer for the frontend.

Environment-specific values (VPC, subnets, Aurora host, S3 bucket, etc.) are marked as `<PLACEHOLDER>` in `cluster.yaml` and `greptime-values.yaml` -- replace them before running the corresponding steps.

## 0) One-time shell setup

```
export AWS_REGION="us-east-2"
export CLUSTER="greptime-eks"
export S3_BUCKET="greptime-bucket"
export GREPTIME_NS="greptime"
export GREPTIME_SA="greptime-sa"
export HELM_RELEASE_CLUSTER="greptime-cluster"
```

## 1) Create cluster

Replace the `<PLACEHOLDER>` values in `cluster.yaml` with your VPC, subnet, and region before running.

```
eksctl create cluster -f infra/k8s/greptime/cluster.yaml
```

## 2) Install EKS add-ons (Pod Identity agent + EBS CSI)

```
eksctl create addon \
  --cluster "$CLUSTER" \
  --region "$AWS_REGION" \
  --name eks-pod-identity-agent

eksctl create addon \
  --cluster "$CLUSTER" \
  --region "$AWS_REGION" \
  --name aws-ebs-csi-driver \
  --auto-apply-pod-identity-associations
```

## 3) Create S3 bucket (object storage)

```
aws s3api create-bucket \
  --bucket "$S3_BUCKET" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"
```

## 4) Create namespace + ServiceAccount for Greptime

```
kubectl create namespace "$GREPTIME_NS" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "$GREPTIME_NS" create serviceaccount "$GREPTIME_SA" --dry-run=client -o yaml | kubectl apply -f -
```

## 5) Pod Identity: IAM policy + association (S3 access)

### 5.1 Create IAM policy (S3 RW to bucket/prefix)

```
cat > /tmp/greptime-s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": ["arn:aws:s3:::${S3_BUCKET}"] },
    { "Effect": "Allow", "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject"], "Resource": ["arn:aws:s3:::${S3_BUCKET}/greptime/*"] }
  ]
}
EOF

aws iam create-policy \
  --policy-name "GreptimeS3Policy-${CLUSTER}" \
  --policy-document file:///tmp/greptime-s3-policy.json
```

Capture policy ARN:

```
export GREPTIME_S3_POLICY_ARN="$(aws iam list-policies --scope Local \
  --query "Policies[?PolicyName=='GreptimeS3Policy-${CLUSTER}'].Arn | [0]" \
  --output text)"
```

### 5.2 Create Pod Identity association for ServiceAccount

```
eksctl create podidentityassociation \
  --region "$AWS_REGION" \
  --cluster "$CLUSTER" \
  --namespace "$GREPTIME_NS" \
  --service-account-name "$GREPTIME_SA" \
  --permission-policy-arns "$GREPTIME_S3_POLICY_ARN" \
  --role-name "GreptimeS3Role-${CLUSTER}"
```

## 6) Create Aurora credentials secret (metasrv backend)

```
kubectl -n "$GREPTIME_NS" create secret generic meta-postgresql-credentials \
  --from-literal=username="greptime_user" \
  --from-literal=password="REPLACE_ME"
```

## 7) Install GreptimeDB operator (Helm)

```
helm repo add greptime https://greptimeteam.github.io/helm-charts/
helm repo update

helm upgrade --install greptimedb-operator greptime/greptimedb-operator -n greptimedb-admin --create-namespace
```

## 8) Deploy Greptime cluster (Helm)

Replace the `<PLACEHOLDER>` values in `greptime-values.yaml` with your Aurora host, database, S3 bucket, region, and prefix before running.

```
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" --create-namespace \
  -f infra/k8s/greptime/greptime-values.yaml
```

## 9) Verify (pods, service, health, meta logs)

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
