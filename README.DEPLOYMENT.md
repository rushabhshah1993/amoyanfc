# Amoyan FC - Deployment Overview

This document provides a high-level overview of the deployment architecture and quick links to deployment resources.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER REQUEST                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              FIREBASE HOSTING (CDN)                         │
│              - Static React Build                           │
│              - SSL/HTTPS                                    │
│              - Global Edge Caching                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌────────────────┐          ┌────────────────────┐
│  STATIC FILES  │          │   API REQUESTS     │
│  (HTML/CSS/JS) │          │   (/graphql)       │
└────────────────┘          └─────────┬──────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │  CLOUD RUN          │
                            │  - Express Server   │
                            │  - GraphQL API      │
                            │  - Auto-scaling     │
                            └──────────┬──────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
        ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
        │ MongoDB      │      │ S3 +         │      │ OpenAI       │
        │ Atlas        │      │ CloudFront   │      │ API          │
        │ (Database)   │      │ (Assets)     │      │ (AI Fights)  │
        └──────────────┘      └──────────────┘      └──────────────┘
```

---

## 🌍 Environments

| Environment | Frontend URL | Backend URL | Database |
|------------|--------------|-------------|----------|
| **Local** | `localhost:3000` | `localhost:4000` | Local or staging DB |
| **Staging** | `amoyanfc-staging.web.app` | Cloud Run (staging) | `staging-amoyan` |
| **Production** | `amoyanfc.web.app` | Cloud Run (prod) | `gql-db` |

---

## 📚 Deployment Guides

### **🎯 For Quick Deployment:**
→ **[QUICK_DEPLOY.md](documentation/QUICK_DEPLOY.md)** - TL;DR deployment (5 mins)

### **📋 For Step-by-Step Checklist:**
→ **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Detailed checklist with verification steps

### **📖 For Complete Documentation:**
→ **[FIREBASE_DEPLOYMENT_GUIDE.md](documentation/FIREBASE_DEPLOYMENT_GUIDE.md)** - Full deployment guide with troubleshooting

---

## ⚡ Quick Commands

### **Deploy to Staging:**
```bash
./deploy.sh staging
```

### **Deploy to Production:**
```bash
./deploy.sh production
```

### **Manual Build:**
```bash
# Frontend
export $(cat .env.production | grep REACT_APP | xargs)
cd frontend && npm run build && cd ..

# Backend (Docker)
docker build -t amoyanfc-backend .
```

### **View Logs:**
```bash
# Backend
gcloud run services logs tail amoyanfc-backend-prod --region=us-central1

# List recent deployments
firebase hosting:releases:list
```

### **Rollback:**
```bash
# Frontend
firebase hosting:rollback

# Backend
gcloud run services update-traffic amoyanfc-backend-prod \
  --region=us-central1 \
  --to-revisions=[PREVIOUS_REVISION]=100
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `firebase.json` | Firebase Hosting configuration |
| `.firebaserc` | Firebase project aliases |
| `cloudbuild.yaml` | Production backend build config |
| `cloudbuild.staging.yaml` | Staging backend build config |
| `Dockerfile` | Docker image for backend |
| `.dockerignore` | Files excluded from Docker build |
| `.env.production` | Production environment variables (🔒 **DO NOT COMMIT**) |
| `.env.staging` | Staging environment variables (🔒 **DO NOT COMMIT**) |
| `deploy.sh` | Automated deployment script |

---

## 🔐 Security Notes

### **⚠️ NEVER Commit These Files:**
- `.env`
- `.env.production`
- `.env.staging`
- `.env.local`
- Any file with API keys, passwords, or secrets

### **✅ Safe to Commit:**
- `.env.example`
- `.env.production.template`
- `.env.staging.template`
- `firebase.json`
- `.firebaserc`
- `cloudbuild.yaml`
- `Dockerfile`

---

## 🎯 Deployment Flow

```
┌─────────────────┐
│  1. LOCAL DEV   │  npm run dev
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. STAGING     │  ./deploy.sh staging
│     DEPLOY      │  ├─ Build Docker image
└────────┬────────┘  ├─ Deploy to Cloud Run
         │           └─ Deploy to Firebase
         ▼
┌─────────────────┐
│  3. TEST        │  Manual testing
│     STAGING     │  ├─ Fight workflows
└────────┬────────┘  ├─ Global rankings
         │           └─ All features
         ▼
┌─────────────────┐
│  4. PRODUCTION  │  ./deploy.sh production
│     DEPLOY      │  ├─ Build Docker image
└────────┬────────┘  ├─ Deploy to Cloud Run
         │           └─ Deploy to Firebase
         ▼
┌─────────────────┐
│  5. MONITOR     │  gcloud run services logs tail
│     & VERIFY    │  Check error rates
└─────────────────┘  User testing
```

---

## 💰 Cost Estimate

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
- OpenAI API: Usage-based

---

## 🆘 Emergency Contacts & Resources

- **Firebase Console:** https://console.firebase.google.com/
- **Google Cloud Console:** https://console.cloud.google.com/
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **AWS S3 Console:** https://s3.console.aws.amazon.com/

### **Monitoring:**
- Cloud Run Logs: `gcloud run services logs read [SERVICE] --region=us-central1`
- Firebase Hosting: https://console.firebase.google.com/u/0/project/[PROJECT]/hosting
- MongoDB Metrics: MongoDB Atlas Dashboard

---

## 📝 Pre-Deployment Checklist

Before deploying to production:

- [ ] All staging tests passed
- [ ] Database backup created
- [ ] Environment variables verified
- [ ] Google OAuth URLs updated
- [ ] Competition IDs match production
- [ ] Team notified
- [ ] Rollback plan ready

---

## 🔄 CI/CD Future Enhancements

Consider setting up:
- [ ] GitHub Actions for automated staging deploys
- [ ] Automated testing before deploy
- [ ] Slack/Discord deployment notifications
- [ ] Automated database backups
- [ ] Performance monitoring (DataDog, New Relic)
- [ ] Error tracking (Sentry)

---

## 📞 Support

For deployment issues:
1. Check logs: `gcloud run services logs read [SERVICE] --region=us-central1`
2. Verify environment variables
3. Test Docker build locally
4. Review [FIREBASE_DEPLOYMENT_GUIDE.md](documentation/FIREBASE_DEPLOYMENT_GUIDE.md)

---

**Last Updated:** November 2025
**Maintainer:** Rushabh Shah

