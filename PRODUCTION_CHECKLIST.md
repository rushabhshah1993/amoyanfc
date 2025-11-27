# Production Deployment Checklist

Use this checklist before deploying to production to ensure everything is properly configured.

## ☑️ Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] `.env` file exists in project root
- [ ] `MONGODB_URI` points to production database (`gql-db`)
- [ ] `JWT_SECRET` is **different** from staging (strong & unique)
- [ ] `GOOGLE_CLIENT_ID` is configured
- [ ] `GOOGLE_CLIENT_SECRET` is configured
- [ ] `AUTHORIZED_GOOGLE_ID` is your Google account ID
- [ ] `AWS_ACCESS_KEY_ID` is configured
- [ ] `AWS_SECRET_ACCESS_KEY` is configured
- [ ] `OPENAI_API_KEY` is configured
- [ ] `FRONTEND_URL=https://amoyanfc.web.app`
- [ ] `NODE_ENV=production`

### 2. Google Cloud Platform

- [ ] GCloud CLI is installed: `gcloud --version`
- [ ] Authenticated with GCloud: `gcloud auth list`
- [ ] Project `amoyanfc` exists
- [ ] Billing is enabled on `amoyanfc` project
- [ ] Cloud Run API is enabled
- [ ] Cloud Build API is enabled
- [ ] Container Registry API is enabled
- [ ] Can list services: `gcloud run services list --project=amoyanfc`

### 3. Firebase

- [ ] Firebase CLI is installed: `firebase --version`
- [ ] Authenticated with Firebase: `firebase login`
- [ ] Project `amoyanfc` exists: `firebase projects:list`
- [ ] Can switch to production: `firebase use production`
- [ ] `.firebaserc` has correct production config
- [ ] `firebase.json` has hosting target for production

### 4. MongoDB Atlas

- [ ] Production cluster is running
- [ ] Database `gql-db` exists with data
- [ ] Database user has read/write permissions
- [ ] Network Access allows `0.0.0.0/0` (or Cloud Run IPs)
- [ ] Can connect from local: Test connection string in MongoDB Compass

### 5. Google OAuth Setup

- [ ] OAuth 2.0 Client ID exists in `amoyanfc` project
- [ ] Authorized JavaScript origins includes:
  - `https://amoyanfc.web.app`
- [ ] Authorized redirect URIs will be updated after first deployment

### 6. AWS S3 & CloudFront

- [ ] S3 bucket `amoyanfc-assets` exists
- [ ] Bucket has correct CORS configuration
- [ ] CloudFront distribution is configured
- [ ] AWS credentials have S3 upload permissions

### 7. Code & Build

- [ ] Latest code is committed to git: `git status`
- [ ] All tests pass (if applicable)
- [ ] `Dockerfile.backend` exists and is correct
- [ ] `cloudbuild.yaml` is configured for production
- [ ] `deploy-backend-production.sh` is executable: `chmod +x deploy-backend-production.sh`
- [ ] `deploy.sh` is executable: `chmod +x deploy.sh`

---

## 🚀 Deployment Steps

Once all items above are checked:

### Step 1: Set GCloud Project
```bash
gcloud config set project amoyanfc
```

### Step 2: Verify Environment
```bash
# Check .env file has all required variables
cat .env | grep -E "MONGODB_URI|JWT_SECRET|GOOGLE_CLIENT_ID|FRONTEND_URL"
```

### Step 3: Deploy Backend
```bash
./deploy-backend-production.sh
```

**Save the backend URL** that gets printed at the end!

### Step 4: Update OAuth Redirect URI

1. Copy the backend URL from Step 3
2. Go to: https://console.cloud.google.com/apis/credentials?project=amoyanfc
3. Click your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://YOUR-BACKEND-URL.run.app/auth/google/callback
   ```
5. Save

### Step 5: Update .env with Backend URL

Update these lines in `.env`:
```bash
GOOGLE_REDIRECT_URI=https://YOUR-BACKEND-URL.run.app/auth/google/callback
REACT_APP_API_URL=https://YOUR-BACKEND-URL.run.app/graphql
REACT_APP_BACKEND_URL=https://YOUR-BACKEND-URL.run.app
```

### Step 6: Redeploy Backend with Correct URL
```bash
./deploy-backend-production.sh
```

### Step 7: Deploy Frontend
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

## ✅ Post-Deployment Verification

### 1. Test Backend Health
```bash
curl https://YOUR-BACKEND-URL.run.app/graphql \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}'
```

**Expected:** `{"data":{"__typename":"Query"}}`

### 2. Test Frontend
- [ ] Visit: https://amoyanfc.web.app
- [ ] Page loads without errors
- [ ] Click "Login with Google"
- [ ] OAuth flow completes successfully
- [ ] Redirected back to app
- [ ] User data loads
- [ ] Can navigate to different pages

### 3. Test Key Features
- [ ] View fighters list
- [ ] View competitions
- [ ] View fight details
- [ ] Check global rankings
- [ ] Simulate a fight (if admin)

### 4. Check Logs
```bash
# Backend logs
gcloud run services logs read amoyanfc-backend --region=us-central1 --limit=20

# Look for errors or warnings
gcloud run services logs read amoyanfc-backend --region=us-central1 --limit=50 | grep -i error
```

### 5. Monitor Performance
- [ ] Check Cloud Run metrics: https://console.cloud.google.com/run?project=amoyanfc
- [ ] Check Firebase Hosting usage: https://console.firebase.google.com/project/amoyanfc/hosting
- [ ] Monitor response times
- [ ] Check for any 500 errors

---

## 🔴 Emergency Rollback

If something goes wrong:

### Rollback Backend
```bash
# List revisions
gcloud run revisions list --service=amoyanfc-backend --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic amoyanfc-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION_NAME=100
```

### Rollback Frontend
```bash
firebase hosting:rollback --project=amoyanfc
```

---

## 📋 Quick Reference

### Backend URL Format
```
https://amoyanfc-backend-RANDOM-uc.a.run.app
```

### Frontend URL
```
https://amoyanfc.web.app
```

### Key Differences from Staging

| Configuration | Staging | Production |
|--------------|---------|------------|
| Database | Staging DB | `gql-db` |
| Env File | `.env.staging` | `.env` |
| Service Name | `amoyanfc-backend-staging` | `amoyanfc-backend` |
| Frontend URL | `amoyanfc-staging.web.app` | `amoyanfc.web.app` |
| Min Instances | 0 | 1 |
| Max Instances | 3 | 10 |

---

**Remember:** Always test in staging before deploying to production! 🎯

