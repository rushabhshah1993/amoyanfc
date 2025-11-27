#!/bin/bash

# ======================================================================
# Deploy Backend to Cloud Run - Production
# ======================================================================
# This script builds and deploys the backend to Cloud Run with env vars
# ======================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying Backend to Cloud Run (Production)${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Set project
gcloud config set project amoyanfc

# Build and push Docker image
echo -e "${BLUE}📦 Building Docker image...${NC}"
gcloud builds submit --config=cloudbuild.yaml

echo ""
echo -e "${BLUE}🔧 Loading environment variables from .env...${NC}"
MONGODB_URI=$(grep MONGODB_URI .env | cut -d '=' -f2-)
JWT_SECRET=$(grep JWT_SECRET .env | cut -d '=' -f2-)
GOOGLE_CLIENT_ID=$(grep GOOGLE_CLIENT_ID .env | cut -d '=' -f2-)
GOOGLE_CLIENT_SECRET=$(grep GOOGLE_CLIENT_SECRET .env | cut -d '=' -f2-)
AUTHORIZED_GOOGLE_ID=$(grep AUTHORIZED_GOOGLE_ID .env | cut -d '=' -f2-)
AWS_ACCESS_KEY_ID=$(grep AWS_ACCESS_KEY_ID .env | cut -d '=' -f2-)
AWS_SECRET_ACCESS_KEY=$(grep AWS_SECRET_ACCESS_KEY .env | cut -d '=' -f2-)
OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2-)

# Get the backend URL first (if service exists) to set GOOGLE_REDIRECT_URI
BACKEND_URL=$(gcloud run services describe amoyanfc-backend --region=us-central1 --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
    # First deployment - use a placeholder, will need to update after
    GOOGLE_REDIRECT_URI="https://placeholder.run.app/auth/google/callback"
    echo -e "${BLUE}ℹ️  First deployment detected. GOOGLE_REDIRECT_URI will need to be updated after deployment.${NC}"
else
    GOOGLE_REDIRECT_URI="${BACKEND_URL}/auth/google/callback"
fi

# Deploy to Cloud Run with environment variables
echo -e "${BLUE}🚢 Deploying to Cloud Run with environment variables...${NC}"
gcloud run deploy amoyanfc-backend \
  --image=gcr.io/amoyanfc/amoyanfc-backend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --max-instances=10 \
  --min-instances=1 \
  --set-env-vars="MONGODB_URI=${MONGODB_URI},JWT_SECRET=${JWT_SECRET},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},AUTHORIZED_GOOGLE_ID=${AUTHORIZED_GOOGLE_ID},AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID},AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY},OPENAI_API_KEY=${OPENAI_API_KEY},FRONTEND_URL=https://amoyanfc.web.app,GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI},AWS_REGION=us-east-1,AWS_S3_BUCKET=amoyanfc-assets,CLOUDFRONT_DOMAIN=https://E2JUFP5XP02KD2.cloudfront.net,NODE_ENV=production"

# Get the final service URL
BACKEND_URL=$(gcloud run services describe amoyanfc-backend --region=us-central1 --format='value(status.url)')

# If this was first deployment, update GOOGLE_REDIRECT_URI with actual URL
if [ "$GOOGLE_REDIRECT_URI" = "https://placeholder.run.app/auth/google/callback" ]; then
    echo ""
    echo -e "${BLUE}🔄 Updating GOOGLE_REDIRECT_URI with actual backend URL...${NC}"
    gcloud run services update amoyanfc-backend \
      --region=us-central1 \
      --update-env-vars="GOOGLE_REDIRECT_URI=${BACKEND_URL}/auth/google/callback"
fi

echo ""
echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
echo -e "${GREEN}🔗 Backend URL: ${BACKEND_URL}${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Test the backend: curl ${BACKEND_URL}/graphql -X POST -H \"Content-Type: application/json\" -d '{\"query\":\"{__typename}\"}'"
echo "2. Update Google Cloud Console OAuth settings:"
echo "   - Authorized redirect URIs: ${BACKEND_URL}/auth/google/callback"
echo "   - Authorized JavaScript origins: https://amoyanfc.web.app"
echo "3. Deploy frontend: firebase use production && firebase deploy --only hosting:production"

