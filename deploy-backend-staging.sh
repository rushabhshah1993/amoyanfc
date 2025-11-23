#!/bin/bash

# ======================================================================
# Deploy Backend to Cloud Run - Staging
# ======================================================================
# This script builds and deploys the backend to Cloud Run with env vars
# ======================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying Backend to Cloud Run (Staging)${NC}"
echo ""

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    echo -e "${RED}❌ .env.staging file not found!${NC}"
    exit 1
fi

# Set project
gcloud config set project amoyanfc-staging

# Build and push Docker image
echo -e "${BLUE}📦 Building Docker image...${NC}"
gcloud builds submit --config=cloudbuild.staging.yaml

# Get environment variables from .env.staging
echo -e "${BLUE}🔧 Loading environment variables...${NC}"
MONGODB_URI=$(grep MONGODB_URI .env.staging | cut -d '=' -f2-)
JWT_SECRET=$(grep JWT_SECRET .env.staging | cut -d '=' -f2-)
GOOGLE_CLIENT_ID=$(grep GOOGLE_CLIENT_ID .env.staging | cut -d '=' -f2-)
GOOGLE_CLIENT_SECRET=$(grep GOOGLE_CLIENT_SECRET .env.staging | cut -d '=' -f2-)
AUTHORIZED_GOOGLE_ID=$(grep AUTHORIZED_GOOGLE_ID .env.staging | cut -d '=' -f2-)
AWS_ACCESS_KEY_ID=$(grep AWS_ACCESS_KEY_ID .env.staging | cut -d '=' -f2-)
AWS_SECRET_ACCESS_KEY=$(grep AWS_SECRET_ACCESS_KEY .env.staging | cut -d '=' -f2-)
OPENAI_API_KEY=$(grep OPENAI_API_KEY .env.staging | cut -d '=' -f2-)

# Update Cloud Run service with environment variables
echo -e "${BLUE}⚙️  Updating Cloud Run with environment variables...${NC}"
gcloud run services update amoyanfc-backend-staging \
  --region=us-central1 \
  --update-env-vars="MONGODB_URI=${MONGODB_URI},JWT_SECRET=${JWT_SECRET},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},AUTHORIZED_GOOGLE_ID=${AUTHORIZED_GOOGLE_ID},AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID},AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY},OPENAI_API_KEY=${OPENAI_API_KEY},FRONTEND_URL=https://amoyanfc-staging.web.app,GOOGLE_REDIRECT_URI=https://amoyanfc-staging.web.app/auth/google/callback,AWS_REGION=us-east-1,AWS_S3_BUCKET=amoyanfc-assets,CLOUDFRONT_DOMAIN=https://E2JUFP5XP02KD2.cloudfront.net,NODE_ENV=staging,PORT=8080"

# Get the service URL
BACKEND_URL=$(gcloud run services describe amoyanfc-backend-staging --region=us-central1 --format='value(status.url)')

echo ""
echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
echo -e "${GREEN}🔗 Backend URL: ${BACKEND_URL}${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Test the backend: curl ${BACKEND_URL}/graphql -X POST -H \"Content-Type: application/json\" -d '{\"query\":\"{__typename}\"}'"
echo "2. Update .env.staging with REACT_APP_API_URL=${BACKEND_URL}/graphql"
echo "3. Deploy frontend: firebase use staging && firebase deploy --only hosting:staging"

