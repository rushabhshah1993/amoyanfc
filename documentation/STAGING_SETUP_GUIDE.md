# 🚀 Staging Environment Setup Guide

This guide will help you set up and use the staging environment for testing before deploying to production.

## 📋 Overview

You now have **two separate databases** in the same MongoDB Atlas cluster:
- **`gql-db`** - Production database (your live data)
- **`staging-amoyan`** - Staging database (for testing)

This setup is **100% FREE** as both databases share the same cluster.

---

## 🛠️ Setup Instructions

### Step 1: Create Environment Files

Create the following environment files in the project root:

#### **`.env.staging`** (for testing)
Copy the content from `env.staging.template` and fill in your actual credentials:

```bash
cp env.staging.template .env.staging
```

Then edit `.env.staging` and replace placeholder values with your actual:
- Google OAuth credentials
- AWS credentials
- JWT secret

#### **`.env.production`** (for production deployment)
Copy the content from `env.production.template` and fill in your actual credentials:

```bash
cp env.production.template .env.production
```

Update Firebase URLs when you're ready to deploy.

---

## ✅ Step 2: Verify Your Setup

Before migrating data, verify your environment is properly configured:

```bash
npm run verify:staging
```

This will check:
- ✅ All required environment files exist
- ✅ Environment variables are properly set
- ✅ MongoDB URIs point to correct databases
- ✅ Migration script is ready

**Fix any errors** reported by the verification script before proceeding.

---

## 📦 Step 3: Migrate Data to Staging

Run the migration script to copy all data from production to staging:

```bash
npm run migrate:staging
```

This will:
- ✅ Copy all collections from `gql-db` → `staging-amoyan`
- ✅ Preserve all indexes
- ✅ Maintain data relationships
- ✅ Provide detailed progress logs

**Output Example:**
```
============================================================
       DATA MIGRATION: PRODUCTION → STAGING
============================================================
ℹ Source DB: gql-db
ℹ Target DB: staging-amoyan

✓ Connected to Source (gql-db) database
✓ Connected to Target (staging-amoyan) database

➜ Fetching collections from source database...
ℹ Found 7 collections

Collections to copy:
  • fighters
  • competitions
  • competitionmetas
  • articles
  • globalranks
  • roundstandings
  • sessions

➜ Starting data migration...

  ➜ Copying fighters (45 documents)...
  ✓ fighters: 45 documents copied
  
  ➜ Copying competitions (12 documents)...
  ✓ competitions: 12 documents copied
  
  ... (continues for all collections)

============================================================
                    MIGRATION SUMMARY
============================================================

Successful: 7/7 collections
Failed:     0/7 collections
Total Docs:  1,234 documents copied

✓ Migration completed!
```

---

## 🎮 Step 4: Run Your Application

### Development Mode (uses your current `.env` file)
```bash
npm run dev
```

### Staging Mode (uses `.env.staging`)
```bash
npm run dev:staging
```

This connects to the `staging-amoyan` database for safe testing.

### Production Mode (uses `.env.production`)
```bash
npm run start:production
```

This connects to the `gql-db` production database.

---

## 📊 Available Commands

### Root Level Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run in development mode (default `.env`) |
| `npm run dev:staging` | Run in staging mode with staging DB |
| `npm run start:staging` | Start server in staging mode |
| `npm run start:production` | Start server in production mode |
| `npm run verify:staging` | Verify staging environment setup |
| `npm run migrate:staging` | Copy production data to staging |

### Server-Only Commands

From the `server/` directory:

| Command | Description |
|---------|-------------|
| `npm run dev:staging` | Run server in staging mode |
| `npm run start:staging` | Start server in staging mode |
| `npm run start:production` | Start server in production mode |
| `npm run migrate:staging` | Run migration script |

---

## 🧪 Testing Workflow

Follow this workflow for safe testing:

### 1. **Initial Setup**
```bash
# First, verify your setup
npm run verify:staging

# Then copy production data to staging
npm run migrate:staging
```

### 2. **Test Your Features**
```bash
# Start application in staging mode
npm run dev:staging
```

- Test all your features thoroughly
- Create/update/delete data freely
- Staging DB is completely isolated from production

### 3. **Refresh Staging Data** (if needed)
```bash
# Re-run migration to reset staging to production state
npm run migrate:staging
```

### 4. **Deploy to Production**
When you're satisfied with testing:
- Update `.env.production` with your Firebase hosting URLs
- Deploy your application to Firebase
- The production deployment will use `gql-db`

---

## 🔄 Environment Variables Summary

### Staging Environment (`.env.staging`)
```
MONGODB_URI=...staging-amoyan...
NODE_ENV=staging
FRONTEND_URL=http://localhost:3000
```

### Production Environment (`.env.production`)
```
MONGODB_URI=...gql-db...
NODE_ENV=production
FRONTEND_URL=https://your-firebase-app.web.app
```

---

## 🛡️ Safety Features

1. **Complete Isolation** - Staging and production databases are separate
2. **No Risk** - Testing in staging won't affect production data
3. **Easy Reset** - Re-run migration anytime to refresh staging data
4. **Free** - Both databases use the same Atlas cluster (no extra cost)

---

## 🚨 Important Notes

⚠️ **Never run destructive operations in production without testing in staging first!**

⚠️ **Always verify `NODE_ENV` before running commands:**
- `staging` → connects to `staging-amoyan`
- `production` → connects to `gql-db`

⚠️ **Keep your `.env` files secure:**
- Never commit `.env`, `.env.staging`, or `.env.production` to git
- These files are already in `.gitignore`

---

## 🔍 Troubleshooting

### Issue: Migration script fails
**Solution:** Check your MongoDB Atlas credentials in `.env`

### Issue: Wrong database connected
**Solution:** Verify `NODE_ENV` and database URI in your environment file

### Issue: Can't create environment files
**Solution:** 
```bash
# Manually copy templates
cp env.staging.template .env.staging
cp env.production.template .env.production
```

### Issue: Permission denied on scripts
**Solution:**
```bash
chmod +x server/scripts/migrate-to-staging.js
```

---

## 🎯 Next Steps

1. ✅ Create `.env.staging` and `.env.production` files
2. ✅ Run `npm run verify:staging` to check setup
3. ✅ Run `npm run migrate:staging` to copy data
4. ✅ Test with `npm run dev:staging`
5. ✅ Once satisfied, deploy to Firebase with production settings

---

## 📞 Support

If you encounter any issues, check:
1. MongoDB Atlas connection string
2. Environment variable values
3. Node.js version compatibility
4. Network connectivity to MongoDB Atlas

---

**Happy Testing! 🎉**

Your staging environment is now ready for comprehensive testing before production deployment.

