#!/usr/bin/env bash
# Packages and deploys the Python judge Lambda.
#
# Creates the function on first run and updates the code on every run after
# that, so iterating on the harness never means re-zipping through the console.
#
#   ./scripts/deploy-judge.sh
#
# Requires the AWS CLI with credentials that can manage the function. The
# execution role must already exist (see docs/EXECUTION_SETUP.md).

set -euo pipefail

FUNCTION_NAME="${JUDGE_FUNCTION_NAME:-sweetplus-judge-python}"
REGION="${AWS_REGION:-us-east-2}"
RUNTIME="python3.12"
HANDLER="handler.lambda_handler"
TIMEOUT_SECONDS="${JUDGE_TIMEOUT_SECONDS:-30}"
MEMORY_MB="${JUDGE_MEMORY_MB:-512}"
# The judge sits in a VPC with no internet gateway, no NAT, and DNS disabled, so
# submitted code has no route off the host. A function recreated without this is
# a function with open egress, which is why the defaults live here rather than
# in a console setting nobody would notice was missing.
SUBNET_IDS="${JUDGE_SUBNET_IDS:-subnet-005cb8222b1126b8d,subnet-0be062dc6c7808a32}"
SECURITY_GROUP_IDS="${JUDGE_SECURITY_GROUP_IDS:-sg-0716d58b992a8067b}"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$root/lambda/judge-python"
artifact="$(mktemp -d)/judge-python.zip"

command -v aws >/dev/null || { echo "aws CLI not found. Install it, then rerun."; exit 1; }

echo "Packaging $source_dir"
(cd "$source_dir" && zip -q -r "$artifact" handler.py)

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Updating $FUNCTION_NAME"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$artifact" \
    --region "$REGION" \
    --no-cli-pager >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --timeout "$TIMEOUT_SECONDS" \
    --memory-size "$MEMORY_MB" \
    --region "$REGION" \
    --no-cli-pager >/dev/null
else
  : "${JUDGE_ROLE_ARN:?Set JUDGE_ROLE_ARN to the execution role ARN for the first deploy}"
  echo "Creating $FUNCTION_NAME"
  # A freshly created role is not immediately assumable by Lambda. IAM is
  # eventually consistent, so the first attempts can fail on a role that is
  # already correct.
  for attempt in 1 2 3 4 5 6; do
    if aws lambda create-function \
      --function-name "$FUNCTION_NAME" \
      --runtime "$RUNTIME" \
      --role "$JUDGE_ROLE_ARN" \
      --handler "$HANDLER" \
      --zip-file "fileb://$artifact" \
      --timeout "$TIMEOUT_SECONDS" \
      --memory-size "$MEMORY_MB" \
      --vpc-config "SubnetIds=$SUBNET_IDS,SecurityGroupIds=$SECURITY_GROUP_IDS" \
      --region "$REGION" \
      --no-cli-pager >/dev/null 2>/tmp/judge-create-error; then
      break
    fi
    if ! grep -q "cannot be assumed by Lambda" /tmp/judge-create-error; then
      cat /tmp/judge-create-error >&2
      exit 1
    fi
    if [ "$attempt" = "6" ]; then
      echo "Role $JUDGE_ROLE_ARN still not assumable. Check its trust policy names lambda.amazonaws.com." >&2
      exit 1
    fi
    echo "  role not propagated yet, retrying ($attempt)"
    sleep 5
  done
fi

aws lambda wait function-active-v2 --function-name "$FUNCTION_NAME" --region "$REGION"
rm -f "$artifact"
echo "Deployed $FUNCTION_NAME to $REGION"
echo
echo "Smoke test:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --region $REGION \\"
echo "    --cli-binary-format raw-in-base64-out \\"
echo "    --payload '{\"mode\":\"tests\",\"entrypoint\":\"add\",\"timeLimitMs\":2000,\"code\":\"def add(a,b):\\n    return a+b\",\"tests\":[{\"input\":[1,2],\"expected\":3}]}' \\"
echo "    /dev/stdout"
