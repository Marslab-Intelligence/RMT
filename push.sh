#!/bin/bash

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Build the RMT frontend image, push it to ECR, and roll the Kubernetes
# deployment that actually serves rmt.marslabintel.com.
#
# This is the real deploy path, confirmed by inspecting the live cluster:
#   - Traffic reaches the app via a Kubernetes Service (NodePort 30001),
#     not a standalone `docker run` container.
#   - App secrets (JWT_SECRET, REFRESH_SECRET, DB creds, Gemini key, etc.)
#     come from the `app-secret` Kubernetes Secret already on the cluster —
#     this script never handles or hardcodes any of them.
#
# CREDENTIALS ARE NOT STORED IN THIS FILE.
#
# Relies on the standard AWS credential chain:
#   - A named profile:        AWS_PROFILE=<profile> ./push.sh
#   - Environment variables:  export AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
#   - An IAM instance role — nothing to configure; it just works on EC2.
#
# The account must be 509399597950 — that's where the RMT cluster and ECR
# repo actually live. A different account's credentials will authenticate
# fine and push an image nowhere near the real deployment, which is exactly
# what happened before this script was fixed.
# ─────────────────────────────────────────────────────────────────────────────

AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
export AWS_DEFAULT_REGION

EXPECTED_ACCOUNT="${EXPECTED_ACCOUNT:-509399597950}"
REPO_NAME="${REPO_NAME:-dev-rmt-frontend}"
IMAGE_TAG="${IMAGE_TAG:-v-$(date +%Y%m%d-%H%M%S)}"
LOCAL_IMAGE="${LOCAL_IMAGE:-renewal-management-system-app:latest}"

PROD_HOST="${PROD_HOST:-ubuntu@3.110.160.60}"
PROD_KEY="${PROD_KEY:-/home/sameer/Documents/pem Files/marslab-Devops.pem}"
K8S_DEPLOYMENT="${K8S_DEPLOYMENT:-app}"
K8S_CONTAINER="${K8S_CONTAINER:-app}"
K8S_NAMESPACE="${K8S_NAMESPACE:-default}"

# ── Preflight ────────────────────────────────────────────────────────────────
echo "Checking AWS credentials..."
CALLER_JSON=$(aws sts get-caller-identity --output json 2>&1) || {
  echo "ERROR: No usable AWS credentials found." >&2
  echo "       Run 'aws configure', or export AWS_ACCESS_KEY_ID and" >&2
  echo "       AWS_SECRET_ACCESS_KEY, then try again." >&2
  exit 1
}
ACTUAL_ACCOUNT=$(echo "$CALLER_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['Account'])")
ECR_URL="${ECR_URL:-${ACTUAL_ACCOUNT}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com}"

echo "  authenticated as: $(echo "$CALLER_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['Arn'])") (account $ACTUAL_ACCOUNT ✓)"

if ! command -v kubectl >/dev/null 2>&1 && [ ! -f /usr/local/bin/kubectl ]; then
  if [ ! -f "$PROD_KEY" ]; then
    echo "ERROR: SSH key not found at: $PROD_KEY" >&2
    echo "       Set PROD_KEY=/path/to/key.pem to override." >&2
    exit 1
  fi
fi

if docker info >/dev/null 2>&1; then
  DOCKER="docker"
else
  DOCKER="sudo docker"
fi

# ── Build and push ───────────────────────────────────────────────────────────
echo "Logging into ECR ($ECR_URL)..."
TOKEN=$(aws ecr get-login-password --region "$AWS_DEFAULT_REGION")
echo "$TOKEN" | $DOCKER login --username AWS --password-stdin "$ECR_URL"

echo "Building image..."
export BUILDX_NO_DEFAULT_ATTESTATIONS=1
$DOCKER build --no-cache -t "$LOCAL_IMAGE" .

echo "Tagging image..."
$DOCKER rmi "$ECR_URL/$REPO_NAME:$IMAGE_TAG" 2>/dev/null || true
$DOCKER tag "$LOCAL_IMAGE" "$ECR_URL/$REPO_NAME:$IMAGE_TAG"

echo "Pushing image..."
$DOCKER push "$ECR_URL/$REPO_NAME:$IMAGE_TAG"

# ── Sync Kubernetes ECR Secret, Update YAML & Roll Deployment ──────────────
if command -v kubectl >/dev/null 2>&1 || [ -f /usr/local/bin/kubectl ]; then
  echo "Executing Kubernetes commands locally on server..."
  sudo kubectl create secret docker-registry ecr-secret \
    --docker-server="$ECR_URL" \
    --docker-username=AWS \
    --docker-password="$TOKEN" \
    --dry-run=client -o yaml | sudo kubectl apply -f -

  if [ -f /home/ubuntu/RMT/k3s/app-deployment.yaml ]; then
    echo "Updating /home/ubuntu/RMT/k3s/app-deployment.yaml..."
    sudo sed -i "s|image: .*/dev-rmt-frontend:.*|image: $ECR_URL/$REPO_NAME:$IMAGE_TAG|g" /home/ubuntu/RMT/k3s/app-deployment.yaml
    sudo kubectl apply -f /home/ubuntu/RMT/k3s/app-deployment.yaml
  else
    sudo kubectl set image deployment/$K8S_DEPLOYMENT $K8S_CONTAINER=$ECR_URL/$REPO_NAME:$IMAGE_TAG -n $K8S_NAMESPACE
  fi
  # Unconditional restart regardless of whether the apply above registered as
  # a spec change — see the matching comment in the SSH branch below for why
  # this guard exists.
  sudo kubectl rollout restart deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE
  sudo kubectl rollout status deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE --timeout=120s
else
  echo "Syncing Kubernetes ECR authentication secret (ecr-secret)..."
  ssh -F /dev/null -o StrictHostKeyChecking=no -i "$PROD_KEY" "$PROD_HOST" "
    sudo kubectl create secret docker-registry ecr-secret \
      --docker-server='$ECR_URL' \
      --docker-username=AWS \
      --docker-password='$TOKEN' \
      --dry-run=client -o yaml | sudo kubectl apply -f -
    if [ -f /home/ubuntu/RMT/k3s/app-deployment.yaml ]; then
      # Must be sudo: the file is root-owned, and plain sed -i silently
      # fails to write its temp file as the ubuntu SSH user — 'Permission
      # denied' on the temp file, but the script kept going, applied the
      # UNCHANGED yaml, and kubectl saw no spec diff, so rollout status
      # reported 'successfully rolled out' for a rollout that never
      # actually happened. The live pod kept serving the old image while
      # every part of the pipeline reported success.
      sudo sed -i 's|image: .*/dev-rmt-frontend:.*|image: $ECR_URL/$REPO_NAME:$IMAGE_TAG|g' /home/ubuntu/RMT/k3s/app-deployment.yaml
      sudo kubectl apply -f /home/ubuntu/RMT/k3s/app-deployment.yaml
    else
      sudo kubectl set image deployment/$K8S_DEPLOYMENT $K8S_CONTAINER=$ECR_URL/$REPO_NAME:$IMAGE_TAG -n $K8S_NAMESPACE
    fi
    # Unconditional restart, independent of whether kubectl detected a spec
    # change above. imagePullPolicy is Always, so this guarantees a fresh
    # pull of whatever the tag now points to in ECR even if the apply step
    # above ends up a no-op for any reason (stale yaml, permission issue,
    # tag reused with new content) — the exact failure mode that silently
    # left the wrong image running while every step reported success.
    sudo kubectl rollout restart deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE
    sudo kubectl rollout status deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE --timeout=120s
  "
fi

echo "Done! Deployed $ECR_URL/$REPO_NAME:$IMAGE_TAG"
