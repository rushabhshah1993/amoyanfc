# Quick Deploy Guide

**TL;DR** - Fast deployment guide for Amoyan FC to Firebase.

---

## 🚀 First Time Setup (30 minutes)

### **1. Install Tools:**
```bash
npm install -g firebase-tools
# Install gcloud: https://cloud.google.com/sdk/docs/install
```

### **2. Login:**
```bash
firebase login
gcloud auth login
```

### **3. Create Projects:**
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create: `amoyanfc` (prod) and `amoyanfc-staging` (staging)

### **4. Enable Services:**
```bash
# Production
gcloud config set project amoyanfc
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com

# Staging
gcloud config set project amoyanfc-staging
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com
```

### **5. Setup Firebase Targets:**
```bash
firebase target:apply hosting production amoyanfc
firebase target:apply hosting staging amoyanfc-staging
```

### **6. Create `.env.staging` and `.env.production`:**
Copy from templates and fill in your values.

---

## 📦 Deploy to Staging

```bash
./deploy.sh staging
```

**That's it!** The script will:
1. ✅ Build frontend
2. ✅ Deploy backend to Cloud Run
3. ✅ Deploy frontend to Firebase Hosting

---

## 🎉 Deploy to Production

**⚠️ ONLY after testing staging thoroughly!**

```bash
./deploy.sh production
```

---

## ✅ Quick Test

```bash
# Staging
curl https://amoyanfc-staging.web.app
curl https://[staging-backend-url]/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'

# Production
curl https://amoyanfc.web.app
curl https://[prod-backend-url]/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'
```

---

## 🐛 Troubleshooting

**Build fails?**
```bash
# Test Docker locally
docker build -t test .
docker run -p 8080:8080 --env-file .env.staging test
```

**Frontend 404s?**
```bash
# Update REACT_APP_API_URL in .env.* with correct backend URL
# Rebuild frontend
export $(cat .env.production | grep REACT_APP | xargs)
cd frontend && npm run build && cd ..
firebase deploy --only hosting:production
```

**CORS errors?**
```bash
# Update FRONTEND_URL in backend
gcloud run services update amoyanfc-backend-prod \
  --region=us-central1 \
  --update-env-vars="FRONTEND_URL=https://amoyanfc.web.app"
```

---

## 📊 View Logs

```bash
# Backend logs
gcloud run services logs read amoyanfc-backend-prod --region=us-central1 --limit=50

# Stream logs
gcloud run services logs tail amoyanfc-backend-staging --region=us-central1
```

---

## ⏮️ Rollback

```bash
# Backend
gcloud run revisions list --service=amoyanfc-backend-prod --region=us-central1
gcloud run services update-traffic amoyanfc-backend-prod --region=us-central1 --to-revisions=[REVISION]=100

# Frontend
firebase hosting:rollback
```

---

## 📚 Full Docs

See [FIREBASE_DEPLOYMENT_GUIDE.md](./FIREBASE_DEPLOYMENT_GUIDE.md) for detailed documentation.

---

**Need Help?** Check [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)

