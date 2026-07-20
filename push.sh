#!/bin/bash

set -e

export AWS_ACCESS_KEY_ID=AKIAXNGUVAN7PTZA4WOF
export AWS_SECRET_ACCESS_KEY=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
export AWS_DEFAULT_REGION=ap-south-1

ECR_URL="509399597950.dkr.ecr.ap-south-1.amazonaws.com"
REPO_NAME="dev-rmt-frontend"

echo "Logging into ECR..."
aws ecr get-login-password | \
docker login --username AWS --password-stdin $ECR_URL

echo "Building image..."
export BUILDX_NO_DEFAULT_ATTESTATIONS=1
docker compose build --no-cache

echo "Tagging image..."
docker rmi $ECR_URL/$REPO_NAME:version7 2>/dev/null || true
docker tag renewal-management-system-app:latest $ECR_URL/$REPO_NAME:version7

echo "Pushing image..."
docker push $ECR_URL/$REPO_NAME:version7

echo "Restarting deployment on production server (13.232.180.247)..."
ssh -F /dev/null -o StrictHostKeyChecking=no -i /home/sameer/Downloads/marslab-Devops.pem ubuntu@13.232.180.247 "
  sudo kubectl rollout restart deployment/app -n default
  sudo kubectl rollout status deployment/app -n default --timeout=60s
"

echo "Done!"