# Upcoming Fights Fix - Root Cause Found! 🎯

## ❌ The Problem

The `filterCompetitions` GraphQL query was failing silently, returning no data to the frontend.

## 🔍 Root Cause

**Backend Resolver Bug** in `server/resolvers/competition.resolver.js`:

### Before (Broken):
```javascript
filterCompetitions: catchAsyncErrors(async(_, args) => {
    const competitions = await Competition.find(args);
    // ...
})
```

When the frontend sends:
```graphql
filterCompetitions(filter: { isActive: true })
```

GraphQL passes this to the resolver:
```javascript
args = { filter: { isActive: true } }
```

But the resolver was doing:
```javascript
Competition.find({ filter: { isActive: true } })  // ❌ WRONG!
```

MongoDB was looking for documents with a `filter` field, not `isActive`!

### After (Fixed):
```javascript
filterCompetitions: catchAsyncErrors(async(_, { filter }) => {
    const competitions = await Competition.find(filter || {});
    // ...
})
```

Now correctly passes:
```javascript
Competition.find({ isActive: true })  // ✅ CORRECT!
```

## 🛠️ What Was Changed

### File: `server/resolvers/competition.resolver.js`
- **Line 74**: Changed `async(_, args)` → `async(_, { filter })`
- **Line 75**: Changed `Competition.find(args)` → `Competition.find(filter || {})`

## 🚀 How to Test

### Step 1: Restart Backend Server
```bash
cd server
# Kill the current server (Ctrl+C)
npm run dev:staging
```

### Step 2: Refresh Frontend
- Open browser to `http://localhost:3000`
- **Hard Refresh**: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)

### Step 3: Check Homepage
**Expected Result:**
- "Upcoming Fights" section shows **3 fight cards**
- Each card displays:
  - IFL logo and "IFL S1 • Division X"
  - Two fighter names with images
  - "VS" between them
  - "Round 1"

## 🐛 How This Bug Went Unnoticed

1. **No Frontend Error**: The query succeeded but returned 0 results
2. **Silent Failure**: No error thrown because `competitions.length === 0` was handled by showing "No upcoming fights"
3. **New Feature**: `filterCompetitions` resolver likely never had the `filter` extraction logic

## ✅ Files Modified

1. ✅ `server/resolvers/competition.resolver.js` - Fixed resolver to extract `filter` from args
2. ✅ `frontend/src/services/queries.ts` - Added `GET_ACTIVE_COMPETITIONS` query
3. ✅ `frontend/src/pages/HomePage/HomePage.tsx` - Integrated upcoming fights display
4. ✅ `frontend/src/pages/HomePage/HomePage.module.css` - Added fight card styles
5. ✅ `frontend/src/pages/DivisionPage/DivisionPage.tsx` - Fixed default round logic

## 📊 Summary

| Issue | Root Cause | Solution | Status |
|-------|------------|----------|--------|
| No upcoming fights showing | Backend resolver not extracting `filter` from args | Changed `args` → `{ filter }` | ✅ Fixed |
| Division opens on last round | Fallback to `totalRounds` when `currentRound` is 0 | Changed to default to Round 1 | ✅ Fixed |

## 🎉 After These Changes

Once you restart the backend server:
- Homepage will show 3 upcoming IFL S1 fights ✅
- Division pages will open on Round 1 (not last round) ✅
- All fighter names and images will display correctly ✅

