#!/bin/bash

set -euo pipefail

PEM_KEY="${PEM_KEY:-/home/sameer/Documents/pem Files/marslab-Devops.pem}"
SERVER_USER="${SERVER_USER:-ubuntu}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
AWS_PROFILE="${AWS_PROFILE:-marslab-AI}"
export AWS_PROFILE

# Dynamically resolve server IP via AWS CLI if not explicitly passed
if [ -z "${SERVER_IP:-}" ]; then
  SERVER_IP="3.110.160.60"
fi

IMAGE_TAG="${IMAGE_TAG:-version9}"
export IMAGE_TAG

echo "=========================================="
echo "🚀 Deploying Application to $SERVER_IP (Image Tag: $IMAGE_TAG)"
echo "=========================================="

echo "📦 1. Creating source archive..."
tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf /tmp/rmt_code.tar.gz -C /home/sameer/Documents/renewal-management-system .

echo "📤 2. Uploading code to target EC2 instance ($SERVER_IP)..."
scp -F /dev/null -o ConnectTimeout=15 -o StrictHostKeyChecking=no -i "$PEM_KEY" /tmp/rmt_code.tar.gz "$SERVER_USER@$SERVER_IP:/home/ubuntu/"

echo "⚙️ 3. Building ECR Docker image, updating remote YAML, and executing targeted rollout restart..."
ssh -F /dev/null -o ConnectTimeout=15 -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
  mkdir -p /home/ubuntu/deploy-rmt
  tar -xzf /home/ubuntu/rmt_code.tar.gz -C /home/ubuntu/deploy-rmt
  cd /home/ubuntu/deploy-rmt
  chmod +x push.sh
  IMAGE_TAG='$IMAGE_TAG' ./push.sh
"

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "🌐 Application Host: http://$SERVER_IP"
echo "=========================================="
