# Firebase Deployment Checklist

Quick reference checklist for deploying Amoyan FC to Firebase.

---

## 🎯 Pre-Deployment (One-Time Setup)

### **1. Install Tools** ⬜
```bash
npm install -g firebase-tools
# Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install
```

### **2. Authenticate** ⬜
```bash
firebase login
gcloud auth login
gcloud auth application-default login
```

### **3. Create Firebase Projects** ⬜
- [ ] Production project: `amoyanfc`
- [ ] Staging project: `amoyanfc-staging`

### **4. Enable Google Cloud Services** ⬜
```bash
# Production
gcloud config set project amoyanfc
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com

# Staging
gcloud config set project amoyanfc-staging
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com
```

### **5. Configure Firebase Hosting Targets** ⬜
```bash
firebase target:apply hosting production amoyanfc
firebase target:apply hosting staging amoyanfc-staging
```

### **6. Get Production Competition IDs** ⬜
```bash
# Connect to production MongoDB and run:
db.competitionmetas.find({}, { _id: 1, competitionName: 1 })

# Copy IDs:
IFC: ________________
IFL: ________________
Champions Cup: ______
Invicta Cup: ________
```

### **7. Create Environment Files** ⬜

**`.env.production`:**
```bash
# Database
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/gql-db

# Server
PORT=8080
NODE_ENV=production

# Frontend (Update after first backend deploy)
REACT_APP_API_URL=https://amoyanfc-backend-prod-xxxxx.run.app/graphql
REACT_APP_BACKEND_URL=https://amoyanfc-backend-prod-xxxxx.run.app
FRONTEND_URL=https://amoyanfc.web.app

# Google OAuth
GOOGLE_CLIENT_ID=______________
GOOGLE_CLIENT_SECRET=______________
GOOGLE_REDIRECT_URI=https://amoyanfc.web.app/auth/google/callback
AUTHORIZED_GOOGLE_ID=______________
JWT_SECRET=______________

# AWS
AWS_ACCESS_KEY_ID=______________
AWS_SECRET_ACCESS_KEY=______________
AWS_REGION=us-east-1
AWS_S3_BUCKET=amoyanfc-assets
CLOUDFRONT_DOMAIN=https://E2JUFP5XP02KD2.cloudfront.net

# OpenAI
OPENAI_API_KEY=______________

# Competition IDs (from step 6)
REACT_APP_COMPETITION_ID_IFC=______________
REACT_APP_COMPETITION_ID_IFL=______________
REACT_APP_COMPETITION_ID_CC=______________
REACT_APP_COMPETITION_ID_IC=______________
```

**`.env.staging`:** Same structure, but with staging values.

### **8. Update Google OAuth Credentials** ⬜
Add authorized redirect URIs in [Google Cloud Console](https://console.cloud.google.com/):
- [ ] `https://amoyanfc.web.app/auth/google/callback`
- [ ] `https://amoyanfc-staging.web.app/auth/google/callback`

---

## 🚀 Staging Deployment

### **Pre-Deployment Checks:**
- [ ] All tests passing locally
- [ ] `.env.staging` file configured
- [ ] Staging database backed up
- [ ] No uncommitted changes (or committed to feature branch)

### **Deploy:**
```bash
# Option 1: Automated script (recommended)
./deploy.sh staging

# Option 2: Manual
gcloud config set project amoyanfc-staging
gcloud builds submit --config=cloudbuild.staging.yaml
# Update .env.staging with backend URL
export $(cat .env.staging | grep REACT_APP | xargs)
cd frontend && npm run build && cd ..
firebase use staging
firebase deploy --only hosting:staging
```

### **Post-Deployment Verification:**
- [ ] Backend health check: `curl https://[backend-url]/health`
- [ ] Frontend loads: Visit `https://amoyanfc-staging.web.app`
- [ ] GraphQL playground works
- [ ] Google OAuth login works
- [ ] Upcoming fights display correctly
- [ ] Global rankings show correct titles
- [ ] Fight simulation works
- [ ] Image uploads work

### **Staging Tests:**
- [ ] Complete a full fight in each division
- [ ] Trigger IC creation (25% completion)
- [ ] Complete a season and trigger CC creation
- [ ] Verify global rankings update after CC final
- [ ] Check all round names display correctly (SF, Finals, etc.)
- [ ] Verify fighter titles and positions update

---

## 🎉 Production Deployment

**⚠️ ONLY deploy to production after thorough staging testing!**

### **Pre-Deployment Checks:**
- [ ] All staging tests passed
- [ ] `.env.production` file configured
- [ ] Production database backed up
- [ ] Production competition IDs verified
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)

### **Deploy:**
```bash
# Option 1: Automated script (recommended)
./deploy.sh production

# Option 2: Manual
gcloud config set project amoyanfc
gcloud builds submit --config=cloudbuild.yaml
# Update .env.production with backend URL
export $(cat .env.production | grep REACT_APP | xargs)
cd frontend && npm run build && cd ..
firebase use production
firebase deploy --only hosting:production
```

### **Post-Deployment Verification:**
- [ ] Backend health check: `curl https://[backend-url]/health`
- [ ] Frontend loads: Visit `https://amoyanfc.web.app`
- [ ] GraphQL playground works
- [ ] Google OAuth login works
- [ ] Check production data displays correctly
- [ ] Verify global rankings
- [ ] Test one complete fight workflow
- [ ] Check browser console for errors
- [ ] Test on mobile devices

### **Monitoring (First 24 Hours):**
```bash
# Watch backend logs
gcloud run services logs tail amoyanfc-backend-prod --region=us-central1

# Check error rate
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50 --format=json
```

- [ ] Monitor Cloud Run logs for errors
- [ ] Check Firebase Hosting analytics
- [ ] Verify MongoDB connections stable
- [ ] Monitor S3/CloudFront usage
- [ ] Check user feedback/reports

---

## 🔄 Rollback Procedures

### **If Issues Detected:**

**Rollback Backend:**
```bash
# List revisions
gcloud run revisions list --service=amoyanfc-backend-prod --region=us-central1

# Rollback
gcloud run services update-traffic amoyanfc-backend-prod \
  --region=us-central1 \
  --to-revisions=[PREVIOUS_REVISION]=100
```

**Rollback Frontend:**
```bash
firebase hosting:rollback
```

---

## 📊 Deployment Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Pre-deployment setup (first time) | 2-4 hours | One-time setup |
| Staging deployment | 10-15 mins | Backend + Frontend |
| Staging testing | 1-2 hours | Thorough testing |
| Production deployment | 10-15 mins | Backend + Frontend |
| Production verification | 30 mins | Smoke tests |
| **Total (subsequent deploys)** | **~2-3 hours** | After initial setup |

---

## 🆘 Common Issues & Fixes

### **Issue: Backend Build Fails**
```bash
# Test Docker build locally
docker build -t amoyanfc-test .
docker run -p 8080:8080 --env-file .env.staging amoyanfc-test

# Check Cloud Build logs
gcloud builds log [BUILD_ID]
```

### **Issue: Frontend Shows 404 for GraphQL**
- [ ] Verify `REACT_APP_API_URL` in `.env.*` is correct
- [ ] Rebuild frontend with correct env vars
- [ ] Check CORS settings in backend

### **Issue: Global Rankings Wrong**
- [ ] Verify `REACT_APP_COMPETITION_ID_*` variables match production MongoDB IDs
- [ ] Rebuild frontend after updating env vars

### **Issue: Google OAuth Fails**
- [ ] Check redirect URIs in Google Cloud Console
- [ ] Verify `GOOGLE_REDIRECT_URI` in `.env.*` matches hosting URL
- [ ] Check `FRONTEND_URL` in backend env vars

---

## 📞 Emergency Contacts

- **DevOps Lead:** [Name/Email]
- **Backend Lead:** [Name/Email]
- **Frontend Lead:** [Name/Email]
- **Database Admin:** [Name/Email]

---

## 📝 Notes

- Always test in staging first
- Keep `.env.*` files secure and never commit them
- Document any manual fixes applied during deployment
- Update this checklist if process changes

---

**Last Updated:** November 2025

