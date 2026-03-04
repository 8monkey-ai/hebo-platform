# GreptimeDB on EKS Deployment Runbook

From-scratch runbook for deploying GreptimeDB on EKS with:

- **Public dashboard** over HTTPS (NLB + ACM) with Basic Auth
- **Private internal endpoint** for VPC consumers (all Greptime ports)
- EKS 1.35, AL2023, 3x m7g.large, 3 AZs
- Hybrid IAM wiring (IRSA for Greptime datanodes + Pod Identity for EKS managed addons)
- EBS CSI, S3 object storage, EBS WAL, Aurora Postgres metadata with SSL Require
- AWS Load Balancer Controller for NLB TLS termination
- ExternalDNS for automatic Route53 record management

Environment-specific values are marked as `<PLACEHOLDER>` in `cluster.yaml`, `greptime-values.yaml`, and `dashboard-public-service.yaml` -- replace them before running the corresponding steps.

## Prerequisites

Before starting, ensure you have:

- An AWS account with permissions to create EKS clusters, IAM roles, ACM certificates, and Route53 records
- A VPC with **both public and private subnets** across 3 AZs
- A Route53 hosted zone for the dashboard domain
- CLI tools: `eksctl`, `kubectl`, `helm`, `aws`

## Placeholder reference

| Placeholder              | Where used                               | Description                                                      |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------------- |
| `<CLUSTER_NAME>`         | `cluster.yaml`, runbook commands         | EKS cluster name                                                 |
| `<AWS_REGION>`           | `cluster.yaml`, `greptime-values.yaml`   | AWS region (e.g., `eu-west-1`)                                   |
| `<VPC_ID>`               | `cluster.yaml`                           | VPC ID                                                           |
| `<PUBLIC_SUBNET_A/B/C>`  | `cluster.yaml`                           | Public subnet IDs (3 AZs)                                        |
| `<PRIVATE_SUBNET_A/B/C>` | `cluster.yaml`                           | Private subnet IDs (3 AZs)                                       |
| `<AURORA_HOST>`          | `greptime-values.yaml`                   | Aurora PostgreSQL endpoint                                       |
| `<AURORA_DATABASE>`      | `greptime-values.yaml`                   | Aurora database name                                             |
| `<S3_BUCKET>`            | `greptime-values.yaml`, runbook commands | S3 bucket for object storage                                     |
| `<S3_PREFIX>`            | `greptime-values.yaml`                   | S3 key prefix                                                    |
| `<GREPTIME_S3_ROLE_ARN>` | `greptime-values.yaml`                   | IRSA role ARN for S3 access                                      |
| `<DASHBOARD_USER>`       | `greptime-values.yaml`                   | Dashboard Basic Auth username                                    |
| `<DASHBOARD_PASSWORD>`   | `greptime-values.yaml`                   | Dashboard Basic Auth password                                    |
| `<ACM_CERTIFICATE_ARN>`  | `dashboard-public-service.yaml`          | ACM certificate ARN for TLS                                      |
| `<DASHBOARD_HOSTNAME>`   | `dashboard-public-service.yaml`          | Public hostname for the dashboard (e.g., `greptime.example.com`) |
| `<DASHBOARD_DOMAIN>`     | runbook commands                         | Parent domain for ExternalDNS filtering (e.g., `example.com`)    |
| `<POSTGRES_USER>`        | runbook commands                         | Aurora PostgreSQL username                                       |
| `<POSTGRES_PASSWORD>`    | runbook commands                         | Aurora PostgreSQL password                                       |

## 0) One-time shell setup

```
export GREPTIME_NS="greptime"
export HELM_RELEASE_CLUSTER="greptime-cluster"
```

## 1) Request ACM certificate

Request a public TLS certificate for the dashboard hostname. DNS validation with Route53 auto-approves.

```
aws acm request-certificate \
  --domain-name "<DASHBOARD_HOSTNAME>" \
  --validation-method DNS \
  --region "<AWS_REGION>" \
  --query 'CertificateArn' --output text
```

Note the returned ARN -- this is `<ACM_CERTIFICATE_ARN>`.

## 2) Tag subnets for load balancer discovery

The AWS Load Balancer Controller uses subnet tags to determine where to place load balancers.

**Public subnets** (for internet-facing NLB):

```
aws ec2 create-tags \
  --resources <PUBLIC_SUBNET_A> <PUBLIC_SUBNET_B> <PUBLIC_SUBNET_C> \
  --tags Key=kubernetes.io/role/elb,Value=1
```

**Private subnets** (for internal NLB):

```
aws ec2 create-tags \
  --resources <PRIVATE_SUBNET_A> <PRIVATE_SUBNET_B> <PRIVATE_SUBNET_C> \
  --tags Key=kubernetes.io/role/internal-elb,Value=1
```

## 3) Create EKS cluster

Replace the `<PLACEHOLDER>` values in `cluster.yaml` with your VPC, subnets (both public and private), and region before running.

```
eksctl create cluster -f infra/k8s/greptime/cluster.yaml
```

## 4) Create S3 bucket (object storage)

```
aws s3api create-bucket \
  --bucket "<S3_BUCKET>" \
  --region "<AWS_REGION>" \
  --create-bucket-configuration LocationConstraint="<AWS_REGION>"
```

## 5) Install GreptimeDB operator (Helm)

```
helm repo add greptime https://greptimeteam.github.io/helm-charts/
helm repo update

helm upgrade --install greptimedb-operator greptime/greptimedb-operator -n greptimedb-admin --create-namespace
```

## 6) Deploy Greptime cluster (Helm)

Replace the `<PLACEHOLDER>` values in `greptime-values.yaml` with your Aurora host, database, S3 bucket, region, and auth credentials before running.

```
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" --create-namespace \
  -f infra/k8s/greptime/greptime-values.yaml
```

## 7) Create IAM role for datanode S3 access (IRSA)

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

## 8) Create Aurora credentials secret (metasrv backend)

```
kubectl -n "$GREPTIME_NS" create secret generic meta-postgresql-credentials \
  --from-literal=username="<POSTGRES_USER>" \
  --from-literal=password="<POSTGRES_PASSWORD>"
```

## 9) Apply updated Helm values and restart workloads

After setting `<GREPTIME_S3_ROLE_ARN>` in `greptime-values.yaml` and creating the Aurora secret, re-apply Helm values and restart to pick up all changes:

```
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" \
  -f infra/k8s/greptime/greptime-values.yaml

kubectl -n "$GREPTIME_NS" rollout restart deployment,statefulset
```

## 10) Install ExternalDNS

ExternalDNS watches Service annotations and automatically creates Route53 records. The IAM role and service account were already created by eksctl via Pod Identity (see `cluster.yaml`).

```
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update

helm upgrade --install external-dns external-dns/external-dns \
  -n kube-system \
  --set provider.name=aws \
  --set serviceAccount.create=false \
  --set serviceAccount.name=external-dns \
  --set policy=upsert-only \
  --set sources='{service}' \
  --set domainFilters='{<DASHBOARD_DOMAIN>}'
```

`<DASHBOARD_DOMAIN>` is the parent domain (e.g., `example.com` if the dashboard hostname is `greptime.example.com`).

## 11) Deploy public dashboard Service

Replace `<ACM_CERTIFICATE_ARN>` and `<DASHBOARD_HOSTNAME>` in `dashboard-public-service.yaml` with the ACM certificate ARN from step 1 and the desired dashboard hostname.

```
kubectl apply -n "$GREPTIME_NS" -f infra/k8s/greptime/dashboard-public-service.yaml
```

The AWS Load Balancer Controller provisions the NLB, and ExternalDNS automatically creates the Route53 alias record pointing `<DASHBOARD_HOSTNAME>` to it.

## 12) Verify

```
# All pods Running/Ready
kubectl -n "$GREPTIME_NS" get pods -o wide

# Both services exist (internal + public)
kubectl -n "$GREPTIME_NS" get svc

# Internal health check (expect {})
kubectl -n "$GREPTIME_NS" run curl-test --rm -i --restart=Never \
  --image=curlimages/curl:8.6.0 \
  --command -- curl -sS http://${HELM_RELEASE_CLUSTER}-frontend.${GREPTIME_NS}.svc.cluster.local:4000/health

# Public dashboard -- should return 401 without credentials, 200 with
curl -sS -o /dev/null -w "%{http_code}" https://<DASHBOARD_HOSTNAME>/dashboard/
curl -sS -o /dev/null -w "%{http_code}" -u "<DASHBOARD_USER>:<DASHBOARD_PASSWORD>" https://<DASHBOARD_HOSTNAME>/dashboard/

# S3 access (expect no output)
kubectl -n "$GREPTIME_NS" logs statefulset/${HELM_RELEASE_CLUSTER}-datanode --since=10m | rg "AccessDenied|OpenDAL operator failed|no valid credential found|Unable to load credentials"
```

## Access boundaries

| Endpoint          | Hostname                                                                                | Ports                  | Reachable from | Auth                                         |
| ----------------- | --------------------------------------------------------------------------------------- | ---------------------- | -------------- | -------------------------------------------- |
| Public dashboard  | `<DASHBOARD_HOSTNAME>`                                                                  | 443 (TLS -> 4000)      | Internet       | Basic Auth (GreptimeDB static user provider) |
| Internal Greptime | `greptime-cluster-frontend.greptime.svc.cluster.local` (in-cluster) or internal NLB DNS | 4000, 4001, 4002, 4003 | VPC only       | Basic Auth (GreptimeDB static user provider) |

The public NLB exposes **only** port 443 (mapped to Greptime HTTP port 4000). Ports 4001 (gRPC), 4002 (MySQL), and 4003 (PostgreSQL) are **never** exposed on the public NLB.

The internal NLB exposes all four ports but is only reachable within the VPC.

## Credential rotation

GreptimeDB uses the `static_user_provider` which loads credentials at startup. To rotate:

1. Update the `auth.users` credentials in `greptime-values.yaml` with new values.
2. Run Helm upgrade:
   ```
   helm upgrade "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
     -n "$GREPTIME_NS" \
     -f infra/k8s/greptime/greptime-values.yaml
   ```
3. Restart frontend pods to pick up the new credentials:
   ```
   kubectl -n "$GREPTIME_NS" rollout restart deployment/${HELM_RELEASE_CLUSTER}-frontend
   ```
4. Rolling restart means brief interruption per pod but no full downtime (3 replicas).

## Certificate renewal

ACM certificates validated via DNS are automatically renewed by AWS before expiry. No manual action required. The NLB picks up the renewed certificate transparently.

To verify certificate status:

```
aws acm describe-certificate \
  --certificate-arn "<ACM_CERTIFICATE_ARN>" \
  --region "<AWS_REGION>" \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,RenewalSummary:RenewalSummary}'
```
