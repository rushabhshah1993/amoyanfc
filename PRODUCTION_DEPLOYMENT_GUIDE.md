# Production Deployment Guide

## Prerequisites Checklist

Before deploying to production, ensure you have completed the following:

### 1. Google Cloud Setup

#### Project Configuration
- [ ] Google Cloud project `amoyanfc` is created
- [ ] Billing is enabled on the project
- [ ] Cloud Run API is enabled
- [ ] Cloud Build API is enabled
- [ ] Container Registry API is enabled

#### OAuth Configuration
- [ ] Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials?project=amoyanfc)
- [ ] Update your OAuth 2.0 Client ID with:
  - **Authorized JavaScript origins**:
    - `https://amoyanfc.web.app`
  - **Authorized redirect URIs**:
    - `https://YOUR-BACKEND-URL.run.app/auth/google/callback` (will be updated after first deployment)

### 2. Firebase Setup

#### Hosting Configuration
- [ ] Firebase project `amoyanfc` is set up
- [ ] Firebase Hosting is enabled
- [ ] Check `.firebaserc` has the correct production target:
  ```json
  {
    "projects": {
      "production": "amoyanfc"
    },
    "targets": {
      "amoyanfc": {
        "hosting": {
          "production": ["amoyanfc"]
        }
      }
    }
  }
  ```

### 3. MongoDB Atlas Setup

#### Database Configuration
- [ ] MongoDB Atlas cluster is created
- [ ] Production database `gql-db` exists
- [ ] Database user is created with read/write permissions
- [ ] Network Access allows connections from `0.0.0.0/0` (or specific Cloud Run IPs)
- [ ] Connection string is ready in format:
  ```
  mongodb+srv://username:password@cluster.mongodb.net/gql-db?retryWrites=true&w=majority
  ```

### 4. Environment Variables Setup

#### Configure `.env` file
Your `.env` file should contain:

```bash
# Database (Production DB: gql-db)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gql-db?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-production-jwt-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTHORIZED_GOOGLE_ID=your-authorized-google-id

# Frontend (for OAuth redirect)
FRONTEND_URL=https://amoyanfc.web.app
GOOGLE_REDIRECT_URI=https://YOUR-BACKEND-URL.run.app/auth/google/callback

# AWS S3 (for image uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=amoyanfc-assets
CLOUDFRONT_DOMAIN=https://E2JUFP5XP02KD2.cloudfront.net

# OpenAI (for fight commentary)
OPENAI_API_KEY=your-openai-api-key

# Environment
NODE_ENV=production

# Frontend Environment Variables (for build)
REACT_APP_API_URL=https://YOUR-BACKEND-URL.run.app/graphql
REACT_APP_BACKEND_URL=https://YOUR-BACKEND-URL.run.app
REACT_APP_COMPETITION_ID_IFC=669c93e9f1e64c6b4c5e5c5f
REACT_APP_COMPETITION_ID_IFL=673af8b8b29d50bcd9d30210
REACT_APP_COMPETITION_ID_IC=669c9455f1e64c6b4c5e5c66
REACT_APP_COMPETITION_ID_CC=669c946ff1e64c6b4c5e5c68
```

**Important Notes:**
- Use **strong, unique** JWT_SECRET (different from staging)
- Ensure MongoDB URI points to **production database** (`gql-db`)
- Frontend URL should be `https://amoyanfc.web.app` (not staging)
- Competition IDs should match your production MongoDB documents

---

## Deployment Process

### Option 1: Full Deployment (Recommended)

Deploy both backend and frontend in one command:

```bash
./deploy.sh production
```

This will:
1. ✅ Build and deploy backend to Cloud Run
2. ✅ Get the backend URL
3. ✅ Build frontend with the correct backend URL
4. ✅ Deploy frontend to Firebase Hosting

### Option 2: Deploy Backend Only

If you only need to update the backend:

```bash
./deploy-backend-production.sh
```

### Option 3: Deploy Frontend Only

If you only need to update the frontend:

```bash
cd frontend
REACT_APP_BACKEND_URL=https://YOUR-BACKEND-URL.run.app \
REACT_APP_API_URL=https://YOUR-BACKEND-URL.run.app/graphql \
REACT_APP_COMPETITION_ID_IFC=669c93e9f1e64c6b4c5e5c5f \
REACT_APP_COMPETITION_ID_IFL=673af8b8b29d50bcd9d30210 \
REACT_APP_COMPETITION_ID_IC=669c9455f1e64c6b4c5e5c66 \
REACT_APP_COMPETITION_ID_CC=669c946ff1e64c6b4c5e5c68 \
npm run build

firebase use production
firebase deploy --only hosting:production
```

---

## Post-Deployment Steps

### 1. Update Google OAuth Redirect URI

After the **first deployment**, you'll get a Cloud Run URL like:
```
https://amoyanfc-backend-xxxxx-uc.a.run.app
```

**Update in TWO places:**

#### A. Update `.env` file
```bash
GOOGLE_REDIRECT_URI=https://amoyanfc-backend-xxxxx-uc.a.run.app/auth/google/callback
REACT_APP_API_URL=https://amoyanfc-backend-xxxxx-uc.a.run.app/graphql
REACT_APP_BACKEND_URL=https://amoyanfc-backend-xxxxx-uc.a.run.app
```

#### B. Update Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials?project=amoyanfc
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://amoyanfc-backend-xxxxx-uc.a.run.app/auth/google/callback
   ```
4. Under **Authorized JavaScript origins**, ensure:
   ```
   https://amoyanfc.web.app
   ```
5. Click **Save**

#### C. Redeploy Backend with Updated URL
```bash
./deploy-backend-production.sh
```

### 2. Update Cloud Run Environment Variable

After getting the backend URL, update the `GOOGLE_REDIRECT_URI` environment variable:

```bash
gcloud run services update amoyanfc-backend \
  --region=us-central1 \
  --update-env-vars="GOOGLE_REDIRECT_URI=https://amoyanfc-backend-xxxxx-uc.a.run.app/auth/google/callback"
```

### 3. Test the Deployment

#### Test Backend
```bash
curl https://amoyanfc-backend-xxxxx-uc.a.run.app/graphql \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}'
```

Expected response:
```json
{"data":{"__typename":"Query"}}
```

#### Test Frontend
1. Visit: https://amoyanfc.web.app
2. Click "Login with Google"
3. Verify authentication works
4. Check that data loads correctly

#### Test OAuth Flow
1. Open: https://amoyanfc.web.app
2. Click "Login with Google"
3. Complete OAuth flow
4. Verify you're redirected back to the app
5. Check that your user data loads

### 4. Monitor Logs

#### Backend Logs (Cloud Run)
```bash
gcloud run services logs read amoyanfc-backend \
  --region=us-central1 \
  --limit=50
```

#### Frontend Logs (Firebase)
1. Go to: https://console.firebase.google.com/project/amoyanfc/hosting
2. Click on "Usage" tab to see traffic
3. Check "Release History" for deployment status

---

## Troubleshooting

### Issue: `redirect_uri_mismatch` Error

**Symptoms:** Google OAuth shows "Error 400: redirect_uri_mismatch"

**Solution:**
1. Get your current backend URL:
   ```bash
   gcloud run services describe amoyanfc-backend --region=us-central1 --format='value(status.url)'
   ```
2. Ensure this EXACT URL is in Google Cloud Console's Authorized redirect URIs
3. Update Cloud Run environment variable:
   ```bash
   gcloud run services update amoyanfc-backend \
     --region=us-central1 \
     --update-env-vars="GOOGLE_REDIRECT_URI=https://YOUR-ACTUAL-URL.run.app/auth/google/callback"
   ```

### Issue: MongoDB Connection Timeout

**Symptoms:** Backend logs show "MongoServerSelectionError"

**Solution:**
1. Check MongoDB Atlas Network Access allows `0.0.0.0/0`
2. Verify `MONGODB_URI` in `.env` is correct
3. Ensure database name is `gql-db` (not staging database)
4. Check MongoDB Atlas user has correct permissions

### Issue: Frontend Shows "Network Error"

**Symptoms:** Frontend can't connect to backend

**Solution:**
1. Check `REACT_APP_API_URL` in frontend build matches backend URL
2. Verify CORS is enabled in backend (should be by default)
3. Check backend is deployed and running:
   ```bash
   gcloud run services describe amoyanfc-backend --region=us-central1
   ```

### Issue: Authentication Not Persisting

**Symptoms:** User logs in but gets logged out immediately

**Solution:**
1. Check `FRONTEND_URL` in backend `.env` is `https://amoyanfc.web.app`
2. Verify JWT token is being stored in localStorage (check browser dev tools)
3. Check `Authorization` header is being sent with GraphQL requests

---

## Rollback Procedure

If deployment fails and you need to rollback:

### Rollback Backend
```bash
# List previous revisions
gcloud run revisions list --service=amoyanfc-backend --region=us-central1

# Rollback to a specific revision
gcloud run services update-traffic amoyanfc-backend \
  --region=us-central1 \
  --to-revisions=amoyanfc-backend-00001=100
```

### Rollback Frontend
```bash
firebase hosting:rollback --project=amoyanfc
```

---

## Differences Between Staging and Production

| Aspect | Staging | Production |
|--------|---------|------------|
| **Backend URL** | `amoyanfc-backend-staging-*.run.app` | `amoyanfc-backend-*.run.app` |
| **Frontend URL** | `amoyanfc-staging.web.app` | `amoyanfc.web.app` |
| **Database** | Staging database | `gql-db` |
| **Env File** | `.env.staging` | `.env` |
| **Cloud Run Service** | `amoyanfc-backend-staging` | `amoyanfc-backend` |
| **Firebase Project** | `amoyanfc-staging` | `amoyanfc` |
| **GCloud Project** | `amoyanfc-staging` | `amoyanfc` |
| **Min Instances** | 0 (scale to zero) | 1 (always warm) |
| **Max Instances** | 3 | 10 |
| **CPU** | 1 vCPU | 2 vCPU |
| **Memory** | 2 GiB | 2 GiB |

---

## Quick Reference Commands

```bash
# Check current GCloud project
gcloud config get-value project

# Switch to production project
gcloud config set project amoyanfc

# Get backend URL
gcloud run services describe amoyanfc-backend --region=us-central1 --format='value(status.url)'

# View backend logs
gcloud run services logs read amoyanfc-backend --region=us-central1 --limit=50

# Update single environment variable
gcloud run services update amoyanfc-backend \
  --region=us-central1 \
  --update-env-vars="KEY=value"

# Check Firebase projects
firebase projects:list

# Switch Firebase project
firebase use production

# View deployment history
firebase hosting:channel:list

# Test GraphQL endpoint
curl https://YOUR-BACKEND-URL.run.app/graphql \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}'
```

---

## Support

If you encounter issues not covered in this guide:

1. Check Cloud Run logs: `gcloud run services logs read amoyanfc-backend --region=us-central1`
2. Check Firebase console: https://console.firebase.google.com/project/amoyanfc
3. Verify all environment variables are set correctly in `.env`
4. Compare with staging configuration in `.env.staging`
5. Review the staging deployment process for reference

---

**Last Updated:** Nov 27, 2025

