#!/usr/bin/env bash

set -euo pipefail

readonly DEFAULT_SERVICE_ACCOUNT_ID="hebo-vertex-sa"
readonly DEFAULT_WORKLOAD_IDENTITY_POOL_ID="hebo-vertex-aws-pool"
readonly DEFAULT_PROVIDER_ID="hebo-vertex-aws-provider"

usage() {
  cat <<'EOF'
Usage: configure-vertex-access.sh --project-id <gcp-project-id> --aws-account-id <id> [options]

Configure the Google Cloud resources required for Hebo's Vertex AWS federation.

Required flags:
  --project-id <id>                   Target Google Cloud project ID.
  --aws-account-id <id>               AWS account ID involved in the federation.

Optional flags:
  --environment <production|preview>  Target environment (default: production).
  --gateway-task-role-name <name>     Gateway ECS task role name (required for production).
  --service-account-id <id>           Override the workload identity service account ID (default: hebo-vertex-sa).
  --workload-identity-pool-id <id>    Override the workload identity pool ID (default: hebo-vertex-aws-pool).
  --provider-id <id>                  Override the AWS provider ID within the workload identity pool (default: hebo-vertex-aws-provider).
  --location <location>               Workload identity pool location (default: global).
  --help                              Show this message and exit.

Examples:
  ./configure-vertex-access.sh \
    --project-id hebo-production \
    --aws-account-id <aws-account-id> \
    --gateway-task-role-name HeboGatewayTaskRole

  ./configure-vertex-access.sh \
    --environment preview \
    --project-id hebo-preview \
    --aws-account-id <aws-account-id>
EOF
}

main() {
  local project_id=""
  local service_account_id="$DEFAULT_SERVICE_ACCOUNT_ID"
  local workload_identity_pool_id="$DEFAULT_WORKLOAD_IDENTITY_POOL_ID"
  local provider_id="$DEFAULT_PROVIDER_ID"
  local location="global"
  local aws_account_id=""
  local environment="production"
  local gateway_task_role_name=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-id)
        project_id="$2"
        shift 2
        ;;
      --environment|--env)
        environment="$2"
        shift 2
        ;;
      --service-account-id)
        service_account_id="$2"
        shift 2
        ;;
      --workload-identity-pool-id)
        workload_identity_pool_id="$2"
        shift 2
        ;;
      --provider-id)
        provider_id="$2"
        shift 2
        ;;
      --location)
        location="$2"
        shift 2
        ;;
      --aws-account-id)
        aws_account_id="$2"
        shift 2
        ;;
      --gateway-task-role-name)
        gateway_task_role_name="$2"
        shift 2
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  case "$environment" in
    production|preview)
      ;;
    *)
      echo "Error: --environment must be either 'production' or 'preview'." >&2
      usage
      exit 1
      ;;
  esac

  if [[ -z "$project_id" ]]; then
    echo "Error: --project-id is required." >&2
    usage
    exit 1
  fi

  if [[ -z "$aws_account_id" ]]; then
    echo "Error: --aws-account-id is required." >&2
    usage
    exit 1
  fi

  if ! command -v gcloud >/dev/null 2>&1; then
    echo "Error: gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install." >&2
    exit 1
  fi

  local service_account_email="${service_account_id}@${project_id}.iam.gserviceaccount.com"
  local attribute_mapping="google.subject=assertion.arn,attribute.aws_role=assertion.arn.extract('assumed-role/{role}/'),attribute.account=assertion.account"
  local attribute_condition=""
  local service_account_display_name=""
  local pool_display_name=""
  local pool_description=""
  local provider_display_name=""
  local provider_description=""
  local completion_label=""
  local member=""

  if [[ "$environment" == "production" ]]; then
    if [[ -z "$gateway_task_role_name" ]]; then
      echo "Error: --gateway-task-role-name is required when --environment is production." >&2
      usage
      exit 1
    fi

    attribute_condition="assertion.arn.startsWith('arn:aws:sts::${aws_account_id}:assumed-role/${gateway_task_role_name}/')"
    service_account_display_name="Service account for Vertex"
    pool_display_name="Vertex AWS pool"
    pool_description="Pool for Vertex → AWS federation"
    provider_display_name="Vertex AWS provider"
    provider_description="Provider for Vertex → AWS federation"
    completion_label="production"
  else
    attribute_condition="assertion.account == '${aws_account_id}'"
    service_account_display_name="Service account for Vertex (preview)"
    pool_display_name="Vertex AWS pool (preview)"
    pool_description="Pool for Vertex → AWS federation (preview)"
    provider_display_name="Vertex AWS provider (preview)"
    provider_description="Provider for Vertex → AWS federation (preview)"
    completion_label="preview"
  fi

  local pool_full_name=""

  echo "Ensuring service account ${service_account_email} exists..."
  if ! gcloud iam service-accounts describe "$service_account_email" --project="$project_id" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$service_account_id" \
      --project="$project_id" \
      --display-name="$service_account_display_name"
  else
    echo "Service account already present."
  fi

  echo "Ensuring workload identity pool ${workload_identity_pool_id} exists..."
  if ! gcloud iam workload-identity-pools describe "$workload_identity_pool_id" --project="$project_id" --location="$location" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools create "$workload_identity_pool_id" \
      --project="$project_id" \
      --location="$location" \
      --display-name="$pool_display_name" \
      --description="$pool_description"
  else
    echo "Workload identity pool already present."
  fi

  echo "Ensuring workload identity pool provider ${provider_id} exists..."
  if ! gcloud iam workload-identity-pools providers describe "$provider_id" --project="$project_id" --location="$location" --workload-identity-pool="$workload_identity_pool_id" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools providers create-aws "$provider_id" \
      --project="$project_id" \
      --location="$location" \
      --workload-identity-pool="$workload_identity_pool_id" \
      --display-name="$provider_display_name" \
      --description="$provider_description" \
      --account-id="$aws_account_id" \
      --attribute-mapping="$attribute_mapping" \
      --attribute-condition="$attribute_condition"
  else
    echo "Provider already present; updating attribute condition..."
    gcloud iam workload-identity-pools providers update-aws "$provider_id" \
      --project="$project_id" \
      --location="$location" \
      --workload-identity-pool="$workload_identity_pool_id" \
      --attribute-mapping="$attribute_mapping" \
      --attribute-condition="$attribute_condition"
  fi

  echo "Binding workload identity user role to service account..."
  pool_full_name="$(gcloud iam workload-identity-pools describe "$workload_identity_pool_id" --project="$project_id" --location="$location" --format="value(name)")"
  if [[ "$environment" == "production" ]]; then
    member="principalSet://iam.googleapis.com/${pool_full_name}/attribute.aws_role/${gateway_task_role_name}"
  else
    member="principalSet://iam.googleapis.com/${pool_full_name}/attribute.account/${aws_account_id}"
  fi

  gcloud iam service-accounts add-iam-policy-binding "$service_account_email" \
    --project="$project_id" \
    --role="roles/iam.workloadIdentityUser" \
    --member="$member" >/dev/null

  echo "Ensuring Vertex AI permissions on project ${project_id}..."
  gcloud projects add-iam-policy-binding "$project_id" \
    --member="serviceAccount:${service_account_email}" \
    --role="roles/aiplatform.user" >/dev/null

  echo "Provisioning complete. Service account ${service_account_email} is configured for ${completion_label} Vertex use."

  cat <<EOF

Service account: ${service_account_email}
Audience:        //iam.googleapis.com/${pool_full_name}/providers/${provider_id}
Project ID:      ${project_id}
Location:        ${location}

EOF
}

main "$@"

