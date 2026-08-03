#!/bin/bash

set -euo pipefail

PEM_KEY="/home/sameer/Documents/pem Files/marslab-Devops.pem"
SERVER_IP="13.232.100.57"
SERVER_USER="ubuntu"

echo "=========================================="
echo "🚀 Deploying RMT Application to $SERVER_IP"
echo "=========================================="

echo "📦 1. Creating source archive..."
tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf /tmp/rmt_code.tar.gz -C /home/sameer/Documents/renewal-management-system .

echo "📤 2. Uploading code to production server ($SERVER_IP)..."
scp -F /dev/null -o StrictHostKeyChecking=no -i "$PEM_KEY" /tmp/rmt_code.tar.gz "$SERVER_USER@$SERVER_IP:/home/ubuntu/"

echo "⚙️ 3. Building ECR Docker image and restarting K8s deployment on server..."
ssh -F /dev/null -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
  mkdir -p /home/ubuntu/deploy-rmt
  tar -xzf /home/ubuntu/rmt_code.tar.gz -C /home/ubuntu/deploy-rmt
  cd /home/ubuntu/deploy-rmt
  chmod +x push.sh
  ./push.sh
"

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "🌐 Live Application: http://$SERVER_IP"
echo "=========================================="
