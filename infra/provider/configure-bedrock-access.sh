#!/usr/bin/env bash

set -euo pipefail
readonly INLINE_POLICY_NAME="HeboBedrockPolicy4CrossAccountAssumptionPolicy"
readonly DEFAULT_ROLE_NAME="HeboBedrockRole4CrossAccountAssumptionRole"

usage() {
  cat <<'EOF'
Usage: configure-bedrock-access.sh [options]

Configure the Hebo Bedrock cross-account IAM role.

Optional flags:
  --environment <production|preview>          Target environment (default: production).
  --role-name <name>                          Explicit IAM role name (overrides derived defaults).
  --region <region>                           AWS region for API calls.
  --profile <profile>                         AWS CLI profile to use.
  --help                                      Show this message and exit.

Environment-specific requirements:
  production: --gateway-task-role-arn <arn>   ARN of the Hebo gateway ECS task role allowed to assume this role.
  preview:    --root-account-id <id>          AWS account ID whose roles should be trusted.

Examples:
  ./configure-bedrock-access.sh --region us-east-1 --gateway-task-role-arn arn:aws:iam::<aws-account-id>:role/HeboGatewayTaskRole
  ./configure-bedrock-access.sh --region us-east-1 --environment preview --root-account-id <aws-account-id>
EOF
}

main() {
  local environment="production"
  local role_name="$DEFAULT_ROLE_NAME"
  local aws_region=""
  local aws_profile=""
  local root_aws_account_id=""
  local gateway_task_role_arn=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --environment|--env)
        environment="$2"
        shift 2
        ;;
      --role-name)
        role_name="$2"
        shift 2
        ;;
      --region)
        aws_region="$2"
        shift 2
        ;;
      --profile)
        aws_profile="$2"
        shift 2
        ;;
      --gateway-task-role-arn)
        gateway_task_role_arn="$2"
        shift 2
        ;;
      --root-account-id)
        root_aws_account_id="$2"
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

  local principal_aws=""
  local role_description=""
  local usage_label=""

  if [[ "$environment" == "preview" ]]; then

    if [[ -z "$root_aws_account_id" ]]; then
      echo "Error: --root-account-id is required when --environment is preview." >&2
      usage
      exit 1
    fi

    principal_aws="arn:aws:iam::${root_aws_account_id}:root"
    role_description="Allows Hebo gateway (preview) to invoke Bedrock foundation models."
    usage_label="preview"
  else
    if [[ -z "$gateway_task_role_arn" ]]; then
      echo "Error: --gateway-task-role-arn is required when --environment is production." >&2
      usage
      exit 1
    fi

    principal_aws="$gateway_task_role_arn"
    role_description="Allows Hebo gateway to invoke Bedrock foundation models."
    usage_label="production"
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "Error: aws CLI not found. Install it from https://aws.amazon.com/cli/." >&2
    exit 1
  fi

  local -a aws_cli_opts=()
  if [[ -n "$aws_region" ]]; then
    aws_cli_opts+=("--region" "$aws_region")
  fi
  if [[ -n "$aws_profile" ]]; then
    aws_cli_opts+=("--profile" "$aws_profile")
  fi

  local trust_policy_file=""
  local inline_policy_file=""
  trust_policy_file="$(mktemp)"
  inline_policy_file="$(mktemp)"
  trap 'rm -f "${trust_policy_file:-}" "${inline_policy_file:-}"' EXIT

  cat >"$trust_policy_file" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "${principal_aws}"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  cat >"$inline_policy_file" <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock:ListInferenceProfiles"
      ],
      "Resource": "*"
    }
  ]
}
EOF

  if aws "${aws_cli_opts[@]}" iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    echo "Updating trust policy for existing role ${role_name}..."
    aws "${aws_cli_opts[@]}" iam update-assume-role-policy \
      --role-name "$role_name" \
      --policy-document "file://$trust_policy_file"
  else
    echo "Creating IAM role ${role_name}..."
    aws "${aws_cli_opts[@]}" iam create-role \
      --role-name "$role_name" \
      --description "${role_description}" \
      --assume-role-policy-document "file://$trust_policy_file"
  fi

  echo "Applying inline Bedrock access policy..."
  aws "${aws_cli_opts[@]}" iam put-role-policy \
    --role-name "$role_name" \
    --policy-name "$INLINE_POLICY_NAME" \
    --policy-document "file://$inline_policy_file"

  echo "Provisioning complete. IAM role ${role_name} is ready for ${usage_label} use."

  cat <<EOF

Bedrock role ARN: $(aws "${aws_cli_opts[@]}" iam get-role --role-name "$role_name" --query 'Role.Arn' --output text)
Region:           ${aws_region:-"(not set; AWS default will be used)"}

EOF
}

main "$@"
