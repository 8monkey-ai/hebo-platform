# GreptimeDB on EKS Deployment Runbook

From-scratch runbook for deploying GreptimeDB on EKS. You will deploy:

- **GreptimeDB cluster** -- Private, internal-only deployment
- **Public dashboard** -- HTTPS exposure with Basic Auth via NLB

The public dashboard section depends on the cluster section but can be done at any time after.

Environment-specific values are marked as `<PLACEHOLDER>` in `cluster.yaml`, `greptime-values.yaml`, and `dashboard-nlb.yaml` -- replace them before running the corresponding steps.

## Prerequisites

- An AWS account with permissions to create EKS clusters, IAM roles, ACM certificates, and Route53 records
- A VPC with **private subnets** across 3 AZs and **at least one public subnet** for the NLB
- A Route53 hosted zone for the dashboard domain
- CLI tools: `eksctl`, `kubectl`, `helm`, `aws`

## Placeholder reference

| Placeholder              | Where used                               | Description                                         |
| ------------------------ | ---------------------------------------- | --------------------------------------------------- |
| `<CLUSTER_NAME>`         | `cluster.yaml`, runbook commands         | EKS cluster name                                    |
| `<AWS_REGION>`           | `cluster.yaml`, `greptime-values.yaml`   | AWS region (e.g., `eu-west-1`)                      |
| `<VPC_ID>`               | `cluster.yaml`                           | VPC ID                                              |
| `<PRIVATE_SUBNET_A/B/C>` | `cluster.yaml`                           | Private subnet IDs (3 AZs)                          |
| `<AURORA_HOST>`          | `greptime-values.yaml`                   | Aurora PostgreSQL endpoint                          |
| `<AURORA_DATABASE>`      | `greptime-values.yaml`                   | Aurora database name                                |
| `<POSTGRES_USER>`        | runbook commands                         | Aurora PostgreSQL username                          |
| `<POSTGRES_PASSWORD>`    | runbook commands                         | Aurora PostgreSQL password                          |
| `<S3_BUCKET>`            | `greptime-values.yaml`, runbook commands | S3 bucket for object storage                        |
| `<S3_PREFIX>`            | `greptime-values.yaml`                   | S3 key prefix                                       |
| `<GREPTIME_S3_ROLE_ARN>` | `greptime-values.yaml`                   | IRSA role ARN for S3 access                         |
| `<PUBLIC_SUBNET>`        | `cluster.yaml`                           | Public subnet ID for the dashboard NLB              |
| `<ACM_CERTIFICATE_ARN>`  | `dashboard-nlb.yaml`                     | ACM certificate ARN for TLS                         |
| `<DASHBOARD_HOSTNAME>`   | `dashboard-nlb.yaml`                     | Public hostname (e.g., `greptime.example.com`)      |
| `<DASHBOARD_DOMAIN>`     | runbook commands                         | Parent domain for ExternalDNS (e.g., `example.com`) |
| `<ADMIN_USER>`           | `greptime-values.yaml`                   | Admin username (readwrite)                          |
| `<ADMIN_PASSWORD>`       | `greptime-values.yaml`                   | Admin password (readwrite)                          |
| `<DASHBOARD_USER>`       | `greptime-values.yaml`                   | Dashboard username (readonly)                       |
| `<DASHBOARD_PASSWORD>`   | `greptime-values.yaml`                   | Dashboard password (readonly)                       |
| `<OTEL_WRITER_USER>`     | `greptime-values.yaml`                   | OTEL writer username (telemetry, writeonly)         |
| `<OTEL_WRITER_PASSWORD>` | `greptime-values.yaml`                   | OTEL writer password (telemetry, writeonly)         |

---

# GreptimeDB cluster

Deploys: EKS 1.35, AL2023, 3x m7g.large, 3 AZs, EBS CSI, AWS Load Balancer Controller, ExternalDNS (Pod Identity), S3 object storage, EBS WAL, Aurora Postgres metadata with SSL Require, internal LoadBalancer for the frontend.

## 0) One-time shell setup

```bash
export GREPTIME_NS="greptime"
export HELM_RELEASE_CLUSTER="greptime-cluster"
```

## 1) Create EKS cluster

Replace the `<PLACEHOLDER>` values in `cluster.yaml` with your VPC, subnets, and region before running.

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

Replace the `<PLACEHOLDER>` values in `greptime-values.yaml` with your Aurora host, database, S3 bucket, region, and auth credentials before running.

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

## 6) Create Aurora credentials secret (metasrv backend)

```bash
kubectl -n "$GREPTIME_NS" create secret generic meta-postgresql-credentials \
  --from-literal=username="<POSTGRES_USER>" \
  --from-literal=password="<POSTGRES_PASSWORD>"
```

## 7) Apply updated Helm values and restart workloads

After setting `<GREPTIME_S3_ROLE_ARN>` in `greptime-values.yaml` and creating the Aurora secret, re-apply Helm values and restart to pick up all changes:

```bash
helm upgrade --install "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
  -n "$GREPTIME_NS" \
  -f infra/k8s/greptime/greptime-values.yaml

kubectl -n "$GREPTIME_NS" rollout restart deployment
kubectl -n "$GREPTIME_NS" rollout restart statefulset
```

## 8) Verify base cluster

```bash
# All pods Running/Ready
kubectl -n "$GREPTIME_NS" get pods -o wide

# Internal service exists
kubectl -n "$GREPTIME_NS" get svc

# Health check (expect {})
kubectl -n "$GREPTIME_NS" run curl-test --rm -i --restart=Never \
  --image=curlimages/curl:8.6.0 \
  --command -- curl -sS http://${HELM_RELEASE_CLUSTER}-frontend.${GREPTIME_NS}.svc.cluster.local:4000/health

# S3 access (expect no output)
kubectl -n "$GREPTIME_NS" logs statefulset/${HELM_RELEASE_CLUSTER}-datanode --since=10m | rg "AccessDenied|OpenDAL operator failed|no valid credential found|Unable to load credentials"
```

---

# Public dashboard (HTTPS + NLB)

Adds an internet-facing NLB that forwards HTTPS (443) to GreptimeDB's HTTP port (4000), with ACM-managed TLS and automatic DNS via ExternalDNS. Only port 4000 is exposed publicly -- ports 4001/4002/4003 are never on the public NLB.

## 1) Tag public subnets for the internet-facing NLB

The AWS Load Balancer Controller uses subnet tags to discover where to place load balancers.

```bash
aws ec2 create-tags \
  --resources <PUBLIC_SUBNET> \
  --tags Key=kubernetes.io/role/elb,Value=1
```

## 2) Request ACM certificate

Request a public TLS certificate for the dashboard hostname. DNS validation with Route53 auto-approves.

```bash
aws acm request-certificate \
  --domain-name "<DASHBOARD_HOSTNAME>" \
  --validation-method DNS \
  --region "<AWS_REGION>" \
  --query 'CertificateArn' --output text
```

Note the returned ARN -- this is `<ACM_CERTIFICATE_ARN>`.

## 3) Install ExternalDNS

ExternalDNS watches Service annotations and automatically creates Route53 records. The IAM role and service account were already created by eksctl via Pod Identity (see `cluster.yaml`).

```bash
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

## 4) Create the public NLB for the dashboard

Replace `<ACM_CERTIFICATE_ARN>` and `<DASHBOARD_HOSTNAME>` in `dashboard-nlb.yaml` with the ACM certificate ARN from step 2 and the desired dashboard hostname.

```bash
kubectl apply -n "$GREPTIME_NS" -f infra/k8s/greptime/dashboard-nlb.yaml
```

The AWS Load Balancer Controller provisions an internet-facing NLB that terminates TLS and forwards to the existing Greptime frontend pods on port 4000. ExternalDNS automatically creates the Route53 alias record for `<DASHBOARD_HOSTNAME>`.

## 5) Verify public dashboard

```bash
# NLB service exists
kubectl -n "$GREPTIME_NS" get svc greptime-dashboard-nlb

# Should return 401 without credentials, 200 with
curl -sS -o /dev/null -w "%{http_code}" https://<DASHBOARD_HOSTNAME>/dashboard/
curl -sS -o /dev/null -w "%{http_code}" -u "<DASHBOARD_USER>:<DASHBOARD_PASSWORD>" https://<DASHBOARD_HOSTNAME>/dashboard/
```

---

# Reference

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
   ```bash
   helm upgrade "$HELM_RELEASE_CLUSTER" greptime/greptimedb-cluster \
     -n "$GREPTIME_NS" \
     -f infra/k8s/greptime/greptime-values.yaml
   ```
3. Restart frontend pods to pick up the new credentials:
   ```bash
   kubectl -n "$GREPTIME_NS" rollout restart deployment/${HELM_RELEASE_CLUSTER}-frontend
   ```
4. Rolling restart means brief interruption per pod but no full downtime (3 replicas).

## Certificate renewal

ACM certificates validated via DNS are automatically renewed by AWS before expiry. No manual action required. The NLB picks up the renewed certificate transparently.

To verify certificate status:

```bash
aws acm describe-certificate \
  --certificate-arn "<ACM_CERTIFICATE_ARN>" \
  --region "<AWS_REGION>" \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,RenewalSummary:RenewalSummary}'
```
