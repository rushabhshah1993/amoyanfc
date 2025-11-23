#!/bin/bash

# ======================================================================
# AMOYAN FC - DEPLOYMENT SCRIPT
# ======================================================================
# This script handles deployment to Firebase (frontend) and Cloud Run (backend)
# Usage:
#   ./deploy.sh staging    # Deploy to staging
#   ./deploy.sh production # Deploy to production
# ======================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if environment argument is provided
if [ -z "$1" ]; then
    print_error "Environment not specified!"
    echo "Usage: ./deploy.sh [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo "Must be either 'staging' or 'production'"
    exit 1
fi

print_info "Starting deployment to ${ENVIRONMENT}..."
echo ""

# ======================================================================
# STEP 1: Pre-deployment Checks
# ======================================================================
print_info "Step 1: Running pre-deployment checks..."

# Check if required tools are installed
command -v firebase >/dev/null 2>&1 || {
    print_error "Firebase CLI not installed. Run: npm install -g firebase-tools"
    exit 1
}

command -v gcloud >/dev/null 2>&1 || {
    print_error "Google Cloud SDK not installed. Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check if .env file exists
if [ ! -f ".env.${ENVIRONMENT}" ]; then
    print_error ".env.${ENVIRONMENT} file not found!"
    echo "Please create it from .env.${ENVIRONMENT}.template"
    exit 1
fi

print_success "All pre-deployment checks passed!"
echo ""

# ======================================================================
# STEP 2: Build Frontend
# ======================================================================
print_info "Step 2: Building frontend..."

# Load environment variables for frontend build
export $(cat .env.${ENVIRONMENT} | grep REACT_APP | xargs)

cd frontend
npm run build
cd ..

print_success "Frontend built successfully!"
echo ""

# ======================================================================
# STEP 3: Deploy Backend to Cloud Run
# ======================================================================
print_info "Step 3: Deploying backend to Cloud Run..."

# Set the correct Google Cloud project
if [ "$ENVIRONMENT" = "production" ]; then
    gcloud config set project amoyanfc
    SERVICE_NAME="amoyanfc-backend-prod"
    CONFIG_FILE="cloudbuild.yaml"
else
    gcloud config set project amoyanfc-staging
    SERVICE_NAME="amoyanfc-backend-staging"
    CONFIG_FILE="cloudbuild.staging.yaml"
fi

# Build and deploy using Cloud Build
print_info "Building Docker image..."
gcloud builds submit --config=${CONFIG_FILE}

# Set environment variables from .env file
print_info "Setting environment variables..."
ENV_VARS=$(cat .env.${ENVIRONMENT} | grep -v '^#' | grep -v '^$' | grep -v 'REACT_APP' | tr '\n' ',' | sed 's/,$//')

gcloud run services update ${SERVICE_NAME} \
    --region=us-central1 \
    --update-env-vars="${ENV_VARS}"

print_success "Backend deployed successfully!"

# Get the backend URL
BACKEND_URL=$(gcloud run services describe ${SERVICE_NAME} --region=us-central1 --format='value(status.url)')
print_success "Backend URL: ${BACKEND_URL}"
echo ""

# ======================================================================
# STEP 4: Deploy Frontend to Firebase Hosting
# ======================================================================
print_info "Step 4: Deploying frontend to Firebase Hosting..."

if [ "$ENVIRONMENT" = "production" ]; then
    firebase use production
    firebase deploy --only hosting:production
else
    firebase use staging
    firebase deploy --only hosting:staging
fi

print_success "Frontend deployed successfully!"
echo ""

# ======================================================================
# DEPLOYMENT COMPLETE
# ======================================================================
echo ""
print_success "🎉 Deployment to ${ENVIRONMENT} complete!"
echo ""
print_info "Next steps:"
echo "  1. Test the application"
echo "  2. Check Cloud Run logs: gcloud run services logs read ${SERVICE_NAME} --region=us-central1"
echo "  3. Monitor Firebase Hosting: https://console.firebase.google.com"
echo ""

if [ "$ENVIRONMENT" = "staging" ]; then
    print_warning "Remember to test thoroughly before deploying to production!"
fi

