# 🚀 Firebase Deployment - Complete Setup Summary

All necessary files and configurations have been created for deploying Amoyan FC to Firebase.

---

## ✅ What Was Created

### **📝 Configuration Files:**
- ✅ `firebase.json` - Firebase Hosting configuration (production + staging)
- ✅ `.firebaserc` - Firebase project aliases
- ✅ `cloudbuild.yaml` - Production backend deployment to Cloud Run
- ✅ `cloudbuild.staging.yaml` - Staging backend deployment to Cloud Run
- ✅ `.dockerignore` - Files excluded from Docker builds
- ✅ Updated `Dockerfile` - Optimized for Cloud Run (port 8080, health checks)

### **🛠️ Scripts:**
- ✅ `deploy.sh` - Automated deployment script (executable)
- ✅ Updated `package.json` - Added deploy commands

### **📚 Documentation:**
- ✅ `documentation/FIREBASE_DEPLOYMENT_GUIDE.md` - Complete deployment guide (60+ pages)
- ✅ `documentation/QUICK_DEPLOY.md` - TL;DR deployment (5 mins)
- ✅ `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist with verification
- ✅ `README.DEPLOYMENT.md` - Deployment overview and quick reference

### **🔧 Code Updates:**
- ✅ `frontend/src/components/GlobalRankings/GlobalRankings.tsx` - Now uses env vars for competition IDs
- ✅ `package.json` - Added `deploy:staging` and `deploy:production` scripts

---

## 🎯 Next Steps - Before First Deployment

### **1. Install Required Tools (5 mins):**
```bash
npm install -g firebase-tools
# Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
```

### **2. Authenticate (2 mins):**
```bash
firebase login
gcloud auth login
```

### **3. Create Firebase Projects (5 mins):**
- Go to https://console.firebase.google.com/
- Create two projects:
  - `amoyanfc` (production)
  - `amoyanfc-staging` (staging)

### **4. Enable Google Cloud Services (5 mins):**
```bash
# Production
gcloud config set project amoyanfc
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com

# Staging
gcloud config set project amoyanfc-staging
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com
```

### **5. Configure Firebase Hosting (2 mins):**
```bash
firebase target:apply hosting production amoyanfc
firebase target:apply hosting staging amoyanfc-staging
```

### **6. Create Environment Files (15 mins):**

#### **Create `.env.staging`:**
```bash
cp env.staging.template .env.staging
# Edit and fill in your staging values
```

#### **Create `.env.production`:**
```bash
cp env.production.template .env.production
# Edit and fill in your production values
```

**Important values to configure:**
- `MONGODB_URI` - MongoDB connection strings (staging and production)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 credentials
- `OPENAI_API_KEY` - OpenAI API key
- `JWT_SECRET` - Strong random string (min 32 chars)

### **7. Get Production Competition IDs (5 mins):**
```bash
# Connect to production MongoDB
mongo "mongodb+srv://[YOUR_CLUSTER]/gql-db" --username [USER]

# Run this query:
db.competitionmetas.find({}, { _id: 1, competitionName: 1 })

# Copy the IDs and add to .env.production:
REACT_APP_COMPETITION_ID_IFC=[IFC_ID]
REACT_APP_COMPETITION_ID_IFL=[IFL_ID]
REACT_APP_COMPETITION_ID_CC=[CC_ID]
REACT_APP_COMPETITION_ID_IC=[IC_ID]
```

### **8. Update Google OAuth (5 mins):**
Go to https://console.cloud.google.com/ → APIs & Services → Credentials

Add authorized redirect URIs:
- `https://amoyanfc.web.app/auth/google/callback`
- `https://amoyanfc-staging.web.app/auth/google/callback`

---

## 🚀 Deploy!

### **First: Deploy to Staging**
```bash
./deploy.sh staging
```

This will:
1. Build the React frontend with staging env vars
2. Build Docker image for backend
3. Deploy backend to Cloud Run
4. Deploy frontend to Firebase Hosting

**Get the backend URL:**
```bash
gcloud run services describe amoyanfc-backend-staging --region=us-central1 --format='value(status.url)'
```

**Update `.env.staging` with the backend URL:**
```bash
REACT_APP_API_URL=https://[backend-url]/graphql
REACT_APP_BACKEND_URL=https://[backend-url]
```

**Redeploy frontend with updated URL:**
```bash
export $(cat .env.staging | grep REACT_APP | xargs)
cd frontend && npm run build && cd ..
firebase use staging
firebase deploy --only hosting:staging
```

### **Test Staging Thoroughly!**
- [ ] Visit `https://amoyanfc-staging.web.app`
- [ ] Test Google OAuth login
- [ ] Complete a fight
- [ ] Check global rankings
- [ ] Verify all features work

### **Then: Deploy to Production**
```bash
./deploy.sh production
```

Same process as staging, but for production.

---

## 📊 Deployment Architecture

```
USER
  │
  ▼
Firebase Hosting (CDN)
  │
  ├─► Static Files (HTML/CSS/JS)
  │
  └─► API Requests (/graphql)
        │
        ▼
      Cloud Run (Backend)
        │
        ├─► MongoDB Atlas
        ├─► S3 + CloudFront
        └─► OpenAI API
```

---

## 💡 Key Features

### **✅ Environment-Based Deployment:**
- Separate staging and production environments
- Different Firebase projects, Cloud Run services, MongoDB databases
- Environment-specific configuration via `.env` files

### **✅ Automated Deployment:**
- Single command deployment: `./deploy.sh staging` or `./deploy.sh production`
- Automatic builds, Docker image creation, and deployment
- Frontend build with environment-specific variables

### **✅ Scalable Backend:**
- Cloud Run auto-scales from 0 to N instances
- Pay only for actual usage
- Configurable memory, CPU, timeout
- Staging: scale to zero (save costs)
- Production: min 1 instance (better performance)

### **✅ Global CDN:**
- Firebase Hosting uses Google's global CDN
- Automatic SSL/HTTPS
- Edge caching for fast load times
- Custom domain support

### **✅ Dynamic Competition IDs:**
- Frontend now reads competition IDs from env vars
- No more hardcoded staging IDs in production
- Easy to update without code changes

---

## 🔐 Security

### **✅ Gitignore Updated:**
All sensitive files are already in `.gitignore`:
- `.env.production`
- `.env.staging`
- `.env` and `.env.local`

### **✅ Environment Variables:**
- Secrets stored in Cloud Run environment (not in code)
- Separate credentials for staging and production
- JWT secrets are environment-specific

### **✅ OAuth Configuration:**
- Different redirect URIs for staging and production
- Proper CORS configuration
- Secure session management

---

## 📈 Monitoring & Logs

### **View Backend Logs:**
```bash
# Tail logs (live)
gcloud run services logs tail amoyanfc-backend-prod --region=us-central1

# Read recent logs
gcloud run services logs read amoyanfc-backend-prod --region=us-central1 --limit=100

# Filter errors
gcloud run services logs read amoyanfc-backend-prod --region=us-central1 --limit=50 | grep ERROR
```

### **Firebase Hosting:**
- View deployments: `firebase hosting:releases:list`
- Open Firebase Console: https://console.firebase.google.com/

### **Cloud Run Dashboard:**
- Metrics: https://console.cloud.google.com/run
- Request count, latency, memory usage, errors

---

## 🆘 Rollback

### **If Something Goes Wrong:**

**Rollback Backend:**
```bash
gcloud run revisions list --service=amoyanfc-backend-prod --region=us-central1
gcloud run services update-traffic amoyanfc-backend-prod --region=us-central1 --to-revisions=[PREVIOUS_REVISION]=100
```

**Rollback Frontend:**
```bash
firebase hosting:rollback
```

---

## 💰 Estimated Costs

### **Staging:**
- Cloud Run: **$0-5/month** (scale to zero when not used)
- Firebase Hosting: **Free tier**
- **Total: ~$0-5/month**

### **Production:**
- Cloud Run: **$10-30/month** (min 1 instance, moderate traffic)
- Firebase Hosting: **$0-5/month** (within generous free tier)
- **Total: ~$10-35/month**

**Existing Costs (Unchanged):**
- MongoDB Atlas: Current plan
- S3 + CloudFront: Current plan
- OpenAI API: Usage-based

---

## 📞 Resources

### **Documentation:**
- [QUICK_DEPLOY.md](documentation/QUICK_DEPLOY.md) - Quick deployment (5 mins)
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist
- [FIREBASE_DEPLOYMENT_GUIDE.md](documentation/FIREBASE_DEPLOYMENT_GUIDE.md) - Complete guide
- [README.DEPLOYMENT.md](README.DEPLOYMENT.md) - Deployment overview

### **External Links:**
- Firebase: https://console.firebase.google.com/
- Google Cloud: https://console.cloud.google.com/
- Cloud Run Docs: https://cloud.google.com/run/docs
- Firebase Hosting Docs: https://firebase.google.com/docs/hosting

---

## ✅ What's Next?

1. **Complete the "Next Steps" section above** (install tools, create projects, etc.)
2. **Deploy to staging first** - Test everything thoroughly
3. **Deploy to production** - Only after staging is verified
4. **Set up monitoring** - Watch logs and metrics
5. **Consider CI/CD** - Automate with GitHub Actions in the future

---

## 🎉 Summary

You now have a **complete, production-ready deployment setup** for Amoyan FC using Firebase (frontend) and Google Cloud Run (backend). The deployment process is:

1. **Automated** - Single command deployment
2. **Scalable** - Auto-scales based on traffic
3. **Cost-effective** - Pay only for usage
4. **Secure** - Proper environment separation
5. **Monitorable** - Comprehensive logging and metrics
6. **Rollback-friendly** - Easy to revert if needed

**Everything is ready to deploy!** 🚀

---

**Questions?** Check the detailed documentation in `documentation/FIREBASE_DEPLOYMENT_GUIDE.md`

**Last Updated:** November 2025

