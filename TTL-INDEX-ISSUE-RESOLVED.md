# TTL Index Issue - RESOLVED

**Date:** October 18, 2025  
**Issue:** Standings for Seasons 1-5 kept disappearing after being restored  
**Root Cause:** TTL (Time-To-Live) index on MongoDB collection  
**Status:** ✅ RESOLVED

---

## Problem

After successfully restoring Seasons 1-5 standings to MongoDB, they would disappear within minutes/hours. Only Seasons 6-10 remained persistent.

---

## Root Cause

A **TTL (Time-To-Live) index** was active on the `roundstandings` collection:

```json
{
  "key": { "updatedAt": 1 },
  "name": "updatedAt_1",
  "expireAfterSeconds": 172800  // 48 hours (2 days)
}
```

### What is a TTL Index?

MongoDB's TTL indexes automatically delete documents after a specified time based on a date field. In this case, any document with an `updatedAt` timestamp older than 48 hours was automatically deleted.

### Why Only Seasons 1-5 Were Affected

- **Seasons 6-10:** Had recent `updatedAt` timestamps (recently migrated/updated)
- **Seasons 1-5:** Had old `updatedAt` timestamps (from original migration months ago)

When we restored Seasons 1-5 from backup files, they came with their original old timestamps, so MongoDB immediately flagged them for deletion.

---

## Solution

### 1. Dropped the TTL Index

```javascript
db.collection('roundstandings').dropIndex('updatedAt_1')
```

**Result:**
```
✅ TTL index dropped successfully!
nIndexesWas: 6
Remaining indexes: 5
```

### 2. Restored All Standings

After removing the TTL index, all standings were restored successfully:

```bash
npm run restore:all-standings
```

**Result:** All 1,752 standings now persist permanently.

---

## Why Was This Index Created?

Looking at the model file (`round-standings.model.js`):

```javascript
// TTL index commented out for now - can be enabled later for real-time/cache scenarios
// roundStandingsSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 * 24 * 2 }); // 2 days
```

The TTL index was **commented out in code** but must have been manually created in the MongoDB database at some point, possibly:
- During testing
- For a cache scenario
- By accident
- Through MongoDB Compass or Atlas UI

---

## Prevention

### 1. Index Documentation

Added note in model file to NEVER create this index:

```javascript
// ⚠️ DO NOT CREATE TTL INDEX - This will delete old standings!
// IFC is complete and historical. All data must persist permanently.
// roundStandingsSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 * 24 * 2 }); 
```

### 2. Regular Monitoring

Run protection check monthly:
```bash
npm run protect:all-standings
```

### 3. Index Audit Script

Created a script to check for unwanted indexes:

```bash
npm run audit:indexes
```

---

## Current Status

### ✅ All Standings Present

| Season | Count | Status |
|--------|-------|--------|
| 1 | 45 | ✅ Complete |
| 2 | 45 | ✅ Complete |
| 3 | 45 | ✅ Complete |
| 4 | 231 | ✅ Complete |
| 5 | 231 | ✅ Complete |
| 6 | 231 | ✅ Complete |
| 7 | 231 | ✅ Complete |
| 8 | 231 | ✅ Complete |
| 9 | 231 | ✅ Complete |
| 10 | 231 | ✅ Complete |
| **TOTAL** | **1,752** | **✅ Complete** |

### ✅ TTL Index Removed

Remaining indexes (all safe):
- `_id_` - Primary key
- `roundId_1_standings.fighterId_1` - Query optimization
- `competitionId_1_seasonNumber_1_roundNumber_1` - Query optimization
- `fightIdentifier_1` (unique) - Prevents duplicates
- `standings.fighterId_1` - Query optimization

---

## Commands Used

### Drop TTL Index
```bash
node -e "import('mongoose').then(async ({default: mongoose}) => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  await db.collection('roundstandings').dropIndex('updatedAt_1');
  console.log('TTL index dropped');
  await mongoose.connection.close();
});"
```

### Check Indexes
```bash
node -e "import('mongoose').then(async ({default: mongoose}) => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const indexes = await db.collection('roundstandings').indexes();
  console.log(JSON.stringify(indexes, null, 2));
  await mongoose.connection.close();
});"
```

### Restore Standings
```bash
npm run restore:all-standings
```

### Verify Status
```bash
npm run protect:all-standings
```

---

## Lessons Learned

1. **Always check database indexes**, not just model definitions
2. **TTL indexes are dangerous** for historical data
3. **Document reasons** for commented-out code
4. **Regular audits** prevent similar issues
5. **Multiple backup layers** saved the day

---

## Future Safeguards

### 1. Monthly Health Check
```bash
# Run on the 1st of each month
npm run protect:all-standings
npm run audit:indexes
```

### 2. Index Creation Policy

**NEVER create** these indexes on `roundstandings`:
- ❌ TTL indexes (any with `expireAfterSeconds`)
- ❌ Sparse indexes on critical fields
- ❌ Partial indexes that might exclude data

**ALWAYS verify** indexes match the model file.

### 3. Database Change Log

Document any manual database changes in:
`/database-changes.md`

---

## Summary

🚨 **Problem:** TTL index auto-deleting old standings  
🔍 **Found:** Checked MongoDB indexes directly  
🛠️ **Fixed:** Dropped TTL index  
✅ **Verified:** All 1,752 standings restored and persisting  
🛡️ **Protected:** Added documentation and monitoring  

---

**Issue Resolved:** October 18, 2025  
**Data Status:** ✅ ALL COMPLETE AND PROTECTED  
**Risk Level:** 🟢 LOW (Index dropped, backups in place, monitoring active)

