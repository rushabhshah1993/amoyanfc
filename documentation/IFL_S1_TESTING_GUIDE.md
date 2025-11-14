# IFL Season 1 - Testing Guide

## ✅ Status: Ready for Testing

IFL Season 1 data has been successfully created in the **staging database** (`staging-amoyan`) with:
- **38 fighters** across 3 divisions
- **231 fights** scheduled (45 in D1, 66 in D2, 120 in D3)
- All divisions properly configured
- Competition is marked as **active**

---

## 🔧 Setup for Local Testing

### Step 1: Use Staging Environment

You have two options:

#### Option A: Use .env.staging file (Recommended)
```bash
# In server directory
cd server
npm run dev:staging
```

#### Option B: Temporarily modify .env
```bash
# Change your .env MONGODB_URI from:
MONGODB_URI=...mongodb.net/gql-db?...

# To:
MONGODB_URI=...mongodb.net/staging-amoyan?...
```

### Step 2: Start Backend Server
```bash
cd server
npm run dev         # If you modified .env
# OR
npm run dev:staging # If using .env.staging (recommended)
```

### Step 3: Start Frontend
```bash
cd frontend
npm start
```

### Step 4: Clear Browser Cache
- **Hard Refresh**: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)
- Or open DevTools → Application → Clear Storage → Clear site data

---

## ✅ What to Test

### 1. Homepage - Upcoming Fights Section
**Expected:**
- Should show 3 upcoming fights (one from each division)
- Each fight card should display:
  - IFL logo and "IFL Season 1"
  - Two fighter names with profile images
  - Division and round information
  
**What was broken before:**
- "No upcoming fights scheduled" message

---

### 2. Competitions Page
**Navigate to:** `/` or competitions list

**Expected:**
- IFL competition card should be visible
- Click on IFL card

---

### 3. IFL Competition Page
**Navigate to:** `/competition/{IFL_COMPETITION_ID}`

**Expected:**
- IFL hero section with logo and description
- "Seasons" section showing "Season 1" card
- Season 1 card should show as "Active"
- Click on Season 1 card

**What was broken before:**
- No seasons showing or empty state

---

### 4. IFL Season 1 Page
**Navigate to:** `/competition/{IFL_COMPETITION_ID}/season/{SEASON_ID}`

**Expected:**
- Three division tabs (Division 1, Division 2, Division 3)
- Each division shows:
  - Standings table (all fighters at 0 points initially)
  - Fights list organized by rounds
  - Fight cards showing fighter matchups

**What was broken before:**
- Divisions not displaying
- Fights not showing

---

### 5. Division Page (Click on a Division)
**Expected:**
- Round selector dropdown
- Standings table for that division
- List of fights for the selected round
- Each fight shows both fighters

**What was broken before:**
- Empty or not loading

---

## 🎯 IFL S1 Data Summary

### Divisions
| Division | Fighters | Rounds | Total Fights |
|----------|----------|--------|--------------|
| Division 1 | 10 | 9 | 45 |
| Division 2 | 12 | 11 | 66 |
| Division 3 | 16 | 15 | 120 |

**Total:** 38 fighters, 231 fights

### Database Info
- **Database**: `staging-amoyan` (MongoDB Atlas)
- **Competition Meta ID**: `67780e1d09a4c4b25127f8f8`
- **Season ID**: `690f235ef0c2b6e24e28141e`
- **Status**: `isActive: true`

---

## 🚀 Deploying to Production

**When you're ready to deploy to Firebase:**

1. **Do NOT deploy staging data to production**
   - Keep production `.env.production` pointing to `gql-db`
   - Only deploy IFL S1 to production after testing is complete

2. **Migration Path** (when ready):
   - Option A: Migrate IFL S1 data from staging to production database
   - Option B: Re-create IFL S1 directly in production database
   - Ask for help with this when ready!

3. **Firebase Deploy**:
   ```bash
   # This will use .env.production (gql-db)
   firebase deploy
   ```

---

## 🐛 Troubleshooting

### "No upcoming fights" still showing
1. Verify backend is connected to `staging-amoyan` (check server logs)
2. Hard refresh browser (`Cmd + Shift + R`)
3. Clear Apollo Client cache
4. Check browser console for GraphQL errors

### Divisions/Fights not showing
1. Check if `isActive: true` in MongoDB
2. Verify GraphQL query is returning data (check Network tab)
3. Ensure backend server restarted after database change

### Wrong data showing
1. Confirm you're using `staging-amoyan` database
2. Check MongoDB Compass or Atlas to verify data
3. Run: `node server/scripts/check-staging-ifl-s1.js` and select option 2

---

## 📞 Need Help?

If something isn't working, run the diagnostic script:

```bash
cd /Users/rushabhshah/Personal\ Projects/amoyanfc
echo "2" | node server/scripts/check-staging-ifl-s1.js
```

This will verify the data structure and identify any issues.

---

## 🎉 Success Criteria

- ✅ Homepage shows 3 upcoming IFL fights
- ✅ IFL competition page shows Season 1
- ✅ Season 1 page shows all 3 divisions
- ✅ Division pages show standings and fights
- ✅ All fighter names and images display correctly
- ✅ Can navigate between divisions and rounds

