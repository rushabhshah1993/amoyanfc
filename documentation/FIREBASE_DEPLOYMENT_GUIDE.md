# Firebase Deployment Guide

Complete guide for deploying Amoyan FC to Firebase (Frontend) and Google Cloud Run (Backend).

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## 🏗️ Architecture Overview

### **Deployment Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Firebase Hosting              Cloud Run                   │
│  (React Frontend)              (Express Backend)           │
│  amoyanfc.web.app     ────►    amoyanfc-backend-prod      │
│                                                             │
│                       MongoDB Atlas (gql-db)               │
│                       S3 + CloudFront (Assets)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      STAGING                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Firebase Hosting              Cloud Run                   │
│  (React Frontend)              (Express Backend)           │
│  amoyanfc-staging.web.app ──► amoyanfc-backend-staging    │
│                                                             │
│                  MongoDB Atlas (staging-amoyan)            │
│                  S3 + CloudFront (Assets)                  │
└─────────────────────────────────────────────────────────────┘
```

### **Why Cloud Run Instead of Cloud Functions?**

- ✅ **Better for Express Apps** - Native support for long-running HTTP servers
- ✅ **WebSocket Support** - Can add real-time features later
- ✅ **Flexible Scaling** - Better control over memory, CPU, timeout
- ✅ **Session Management** - Express middleware works seamlessly
- ✅ **Cost Effective** - Pay only for actual usage, scale to zero

---

## 📦 Prerequisites

### **1. Install Required Tools:**

```bash
# Firebase CLI
npm install -g firebase-tools

# Google Cloud SDK
# macOS:
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### **2. Authenticate:**

```bash
# Login to Firebase
firebase login

# Login to Google Cloud
gcloud auth login
gcloud auth application-default login
```

### **3. Create Firebase Projects:**

Go to [Firebase Console](https://console.firebase.google.com/):
- Create project: `amoyanfc` (production)
- Create project: `amoyanfc-staging` (staging)

### **4. Enable Required Services:**

```bash
# For production
gcloud config set project amoyanfc
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# For staging
gcloud config set project amoyanfc-staging
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## ⚙️ Initial Setup

### **1. Initialize Firebase in Project:**

```bash
cd /path/to/amoyanfc
firebase init
```

**Select:**
- ✅ Hosting: Configure files for Firebase Hosting
- ✅ Use existing projects
  - Production: `amoyanfc`
  - Staging: `amoyanfc-staging`
- Public directory: `frontend/build`
- Single-page app: **Yes**
- Automatic builds with GitHub: **No** (we'll deploy manually)

### **2. Set Up Hosting Targets:**

```bash
# Production
firebase target:apply hosting production amoyanfc
firebase use production

# Staging
firebase target:apply hosting staging amoyanfc-staging
firebase use staging
```

---

## 🔐 Environment Configuration

### **1. Create Environment Files:**

You need two files (already templated):
- `.env.staging` - For staging deployment
- `.env.production` - For production deployment

⚠️ **CRITICAL:** These files contain secrets and should **NEVER** be committed to Git.

### **2. Configure Production Environment:**

Edit `.env.production`:

```bash
# Database - Use production MongoDB
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/gql-db

# Server
PORT=8080
NODE_ENV=production

# Frontend URLs (Update after first deployment)
REACT_APP_API_URL=https://amoyanfc-backend-prod-xxxxx.run.app/graphql
REACT_APP_BACKEND_URL=https://amoyanfc-backend-prod-xxxxx.run.app
FRONTEND_URL=https://amoyanfc.web.app

# Google OAuth (Production credentials)
GOOGLE_CLIENT_ID=your_prod_client_id
GOOGLE_CLIENT_SECRET=your_prod_client_secret
GOOGLE_REDIRECT_URI=https://amoyanfc.web.app/auth/google/callback
AUTHORIZED_GOOGLE_ID=your_authorized_user_id
JWT_SECRET=super_secure_random_string_min_32_chars

# AWS (Production keys)
AWS_ACCESS_KEY_ID=your_prod_access_key
AWS_SECRET_ACCESS_KEY=your_prod_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=amoyanfc-assets
CLOUDFRONT_DOMAIN=https://E2JUFP5XP02KD2.cloudfront.net

# OpenAI
OPENAI_API_KEY=your_prod_openai_key

# Competition IDs (Get from production MongoDB)
COMPETITION_ID_IFC=<production_ifc_id>
COMPETITION_ID_IFL=<production_ifl_id>
COMPETITION_ID_CHAMPIONS_CUP=<production_cc_id>
COMPETITION_ID_INVICTA_CUP=<production_ic_id>
```

### **3. Configure Staging Environment:**

Edit `.env.staging` with staging-specific values (staging database, etc.).

### **4. Get Production Competition IDs:**

```bash
# Connect to production MongoDB
mongo "mongodb+srv://cluster.mongodb.net/gql-db" --username your_user

# Run:
db.competitionmetas.find({}, { _id: 1, competitionName: 1 })

# Copy the IDs to .env.production
```

---

## 🚀 Deployment Process

### **Method 1: Automated Deployment Script (Recommended)**

```bash
# Make script executable
chmod +x deploy.sh

# Deploy to staging
./deploy.sh staging

# Deploy to production (after testing staging)
./deploy.sh production
```

### **Method 2: Manual Deployment**

#### **Deploy Backend to Cloud Run:**

```bash
# Set project
gcloud config set project amoyanfc  # or amoyanfc-staging

# Build and deploy
gcloud builds submit --config=cloudbuild.yaml  # or cloudbuild.staging.yaml

# Get the backend URL
gcloud run services describe amoyanfc-backend-prod --region=us-central1 --format='value(status.url)'
```

#### **Update Frontend Environment:**

Update `.env.production` with the Cloud Run URL:

```bash
REACT_APP_API_URL=https://amoyanfc-backend-prod-xxxxx.run.app/graphql
```

#### **Build and Deploy Frontend:**

```bash
# Load environment variables
export $(cat .env.production | grep REACT_APP | xargs)

# Build frontend
cd frontend
npm run build
cd ..

# Deploy to Firebase
firebase use production
firebase deploy --only hosting:production
```

---

## ✅ Post-Deployment

### **1. Verify Backend Health:**

```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe amoyanfc-backend-prod --region=us-central1 --format='value(status.url)')

# Test GraphQL
curl -X POST $BACKEND_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

### **2. Test Frontend:**

Visit your Firebase Hosting URL:
- Production: `https://amoyanfc.web.app`
- Staging: `https://amoyanfc-staging.web.app`

### **3. Configure Custom Domain (Optional):**

```bash
# Add custom domain in Firebase Console
# Example: amoyanfc.com → amoyanfc.web.app

# Update .env files with custom domain:
FRONTEND_URL=https://amoyanfc.com
GOOGLE_REDIRECT_URI=https://amoyanfc.com/auth/google/callback
```

### **4. Set Up Monitoring:**

```bash
# View backend logs
gcloud run services logs read amoyanfc-backend-prod --region=us-central1 --limit=50

# Stream logs
gcloud run services logs tail amoyanfc-backend-prod --region=us-central1

# Firebase Hosting logs
firebase hosting:channel:open live
```

### **5. Update Google OAuth Credentials:**

Go to [Google Cloud Console](https://console.cloud.google.com/):
- Add authorized redirect URIs:
  - `https://amoyanfc.web.app/auth/google/callback` (production)
  - `https://amoyanfc-staging.web.app/auth/google/callback` (staging)

---

## 🐛 Troubleshooting

### **Issue 1: Backend Build Fails**

```bash
# Check Docker build locally
docker build -t amoyanfc-test .
docker run -p 8080:8080 --env-file .env.production amoyanfc-test

# Check Cloud Build logs
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>
```

### **Issue 2: Frontend Shows 404 for GraphQL**

**Cause:** Backend URL not updated in frontend build.

**Fix:**
```bash
# 1. Update .env.production with correct backend URL
# 2. Rebuild and redeploy frontend
export $(cat .env.production | grep REACT_APP | xargs)
cd frontend && npm run build && cd ..
firebase deploy --only hosting:production
```

### **Issue 3: CORS Errors**

**Fix:** Update backend `FRONTEND_URL` in Cloud Run:

```bash
gcloud run services update amoyanfc-backend-prod \
  --region=us-central1 \
  --update-env-vars="FRONTEND_URL=https://amoyanfc.web.app"
```

### **Issue 4: Global Rankings Show Wrong Titles**

**Cause:** Hardcoded competition IDs in frontend don't match production IDs.

**Fix:**
1. Get production competition IDs from MongoDB
2. Update `.env.production` with correct IDs
3. Rebuild frontend
4. Or better: Make frontend fetch IDs dynamically (see below)

### **Making Competition IDs Dynamic (Recommended Fix):**

Edit `frontend/src/components/GlobalRankings/GlobalRankings.tsx`:

```typescript
// Instead of hardcoded IDs, fetch from backend or use env vars:
const COMPETITION_IDS = {
    IFC: process.env.REACT_APP_COMPETITION_ID_IFC || '67780dcc09a4c4b25127f8f6',
    IFL: process.env.REACT_APP_COMPETITION_ID_IFL || '67780e1d09a4c4b25127f8f8',
    CHAMPIONS_CUP: process.env.REACT_APP_COMPETITION_ID_CC || '6778100309a4c4b25127f8fa',
    INVICTA_CUP: process.env.REACT_APP_COMPETITION_ID_IC || '6778103309a4c4b25127f8fc'
};
```

Then add to `.env.production` and `.env.staging`.

---

## ⏮️ Rollback Procedures

### **Rollback Backend:**

```bash
# List recent revisions
gcloud run revisions list --service=amoyanfc-backend-prod --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic amoyanfc-backend-prod \
  --region=us-central1 \
  --to-revisions=<PREVIOUS_REVISION>=100
```

### **Rollback Frontend:**

```bash
# View deployment history
firebase hosting:releases:list

# Rollback to previous release
firebase hosting:rollback
```

---

## 📊 Cost Estimation

### **Staging (Low Traffic):**
- Cloud Run: ~$0-5/month (scale to zero)
- Firebase Hosting: Free tier
- **Total: ~$0-5/month**

### **Production (Moderate Traffic):**
- Cloud Run: ~$10-30/month (min instances: 1)
- Firebase Hosting: ~$0-5/month
- **Total: ~$10-35/month**

**Existing Costs (Unchanged):**
- MongoDB Atlas: Current plan
- S3 + CloudFront: Current plan

---

## 🔒 Security Checklist

- [ ] All `.env.*` files in `.gitignore`
- [ ] Strong JWT secret (min 32 chars)
- [ ] Google OAuth restricted to authorized domains
- [ ] Cloud Run service accounts properly configured
- [ ] MongoDB IP whitelist updated (if using)
- [ ] S3 bucket policies reviewed
- [ ] CORS configured correctly
- [ ] Session secrets rotated
- [ ] Environment variables secured in Cloud Run
- [ ] API rate limiting configured

---

## 📚 Additional Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Environment Variables in React](https://create-react-app.dev/docs/adding-custom-environment-variables/)

---

## 🆘 Support

If you encounter issues:
1. Check logs: `gcloud run services logs read <SERVICE_NAME> --region=us-central1`
2. Verify environment variables: `gcloud run services describe <SERVICE_NAME> --region=us-central1`
3. Test locally with Docker before deploying
4. Review Cloud Build logs for build failures

---

**Last Updated:** November 2025

