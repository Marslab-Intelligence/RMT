#!/bin/bash

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Build the RMT frontend image, push it to ECR, and roll the production
# deployment.
# ─────────────────────────────────────────────────────────────────────────────

AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
export AWS_DEFAULT_REGION

ECR_URL="${ECR_URL:-509399597950.dkr.ecr.ap-south-1.amazonaws.com}"
REPO_NAME="${REPO_NAME:-dev-rmt-frontend}"
IMAGE_TAG="${IMAGE_TAG:-version7}"
LOCAL_IMAGE="${LOCAL_IMAGE:-renewal-management-system-app:latest}"

PROD_HOST="${PROD_HOST:-ubuntu@13.232.100.57}"
PROD_KEY="${PROD_KEY:-/home/sameer/Documents/pem Files/marslab-Devops.pem}"
K8S_DEPLOYMENT="${K8S_DEPLOYMENT:-deployment/app}"
K8S_NAMESPACE="${K8S_NAMESPACE:-default}"

# Determine docker command
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  DOCKER="sudo docker"
fi

# ── Preflight ────────────────────────────────────────────────────────────────
PROFILE_ARG=""
if [ -n "${AWS_PROFILE:-}" ]; then
  PROFILE_ARG="--profile ${AWS_PROFILE}"
fi

echo "Checking AWS credentials..."
if ! aws sts get-caller-identity $PROFILE_ARG >/dev/null 2>&1; then
  echo "ERROR: No usable AWS credentials found." >&2
  exit 1
fi
echo "  authenticated as: $(aws sts get-caller-identity $PROFILE_ARG --query Arn --output text)"

# ── Build and push ───────────────────────────────────────────────────────────
echo "Logging into ECR..."
aws ecr get-login-password $PROFILE_ARG --region "$AWS_DEFAULT_REGION" \
  | $DOCKER login --username AWS --password-stdin "$ECR_URL"

echo "Building image..."
export BUILDX_NO_DEFAULT_ATTESTATIONS=1
$DOCKER build -t "$LOCAL_IMAGE" .

echo "Tagging image..."
$DOCKER rmi "$ECR_URL/$REPO_NAME:$IMAGE_TAG" 2>/dev/null || true
$DOCKER tag "$LOCAL_IMAGE" "$ECR_URL/$REPO_NAME:$IMAGE_TAG"

echo "Pushing image..."
$DOCKER push "$ECR_URL/$REPO_NAME:$IMAGE_TAG"

# ── Roll production ──────────────────────────────────────────────────────────
echo "Restarting deployment on production server..."
if command -v kubectl >/dev/null 2>&1; then
  sudo kubectl rollout restart $K8S_DEPLOYMENT -n $K8S_NAMESPACE
  sudo kubectl rollout status $K8S_DEPLOYMENT -n $K8S_NAMESPACE --timeout=120s
else
  ssh -F /dev/null -o StrictHostKeyChecking=no -i "$PROD_KEY" "$PROD_HOST" "
    sudo kubectl rollout restart $K8S_DEPLOYMENT -n $K8S_NAMESPACE
    sudo kubectl rollout status $K8S_DEPLOYMENT -n $K8S_NAMESPACE --timeout=120s
  "
fi

echo "Done!"
