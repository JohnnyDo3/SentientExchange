#!/bin/bash
# Deploy AgentMarket MCP to Google Cloud Platform

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"agentmarket-prod"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="agentmarket-mcp"

echo "🚀 Deploying AgentMarket MCP to GCP..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

# Set project
echo "Setting GCP project..."
gcloud config set project $PROJECT_ID

# Build the project
echo "Building project..."
npm run build

# Build Docker image
echo "Building Docker image..."
docker build -f docker/mcp-server.Dockerfile \
    -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
    -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$(git rev-parse --short HEAD) \
    .

# Scan for vulnerabilities
echo "Scanning Docker image for vulnerabilities..."
if command -v trivy &> /dev/null; then
    trivy image --severity HIGH,CRITICAL gcr.io/$PROJECT_ID/$SERVICE_NAME:latest
else
    echo "⚠️  Trivy not installed, skipping security scan"
fi

# Configure Docker for GCR
echo "Configuring Docker for Google Container Registry..."
gcloud auth configure-docker

# Push to GCR
echo "Pushing image to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$(git rev-parse --short HEAD)

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production,NETWORK=base-sepolia" \
    --set-secrets "CDP_API_KEY_NAME=cdp-api-key-name:latest,CDP_API_KEY_PRIVATE_KEY=cdp-api-key-private:latest" \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)')

echo ""
echo "✅ Deployment successful!"
echo ""
echo "Service URL: $SERVICE_URL"
echo ""
echo "Test health endpoint:"
echo "curl $SERVICE_URL/health"
echo ""
