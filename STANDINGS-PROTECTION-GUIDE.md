# IFC Standings Protection & Restoration Guide

## Overview
This guide explains how to protect and restore IFC standings data (Seasons 1-10) to prevent accidental deletion from MongoDB.

**⚠️ IMPORTANT:** No more scripts should be run for IFC data as the competition is complete and all data has been migrated to MongoDB.

---

## Current Status

### ✅ Data Files Available
All Season 1-10 standings data files are backed up in:
```
/old-data/migrated-standings/season[1-10]-all-rounds-standings.json
```

### 🛡️ Protection Measures Implemented

1. **Dangerous Scripts Disabled**
   - All scripts containing `deleteMany` have been renamed with `.DANGEROUS` extension
   - These scripts CANNOT be accidentally executed via npm commands
   
2. **Safe Import Scripts Created**
   - New SAFE scripts that NEVER delete data
   - Only add missing standings
   - Available for Seasons 1, 2, 3, and 5

3. **Master Restore Script**
   - `restore-all-standings-SAFE.js` - Restores ALL seasons at once
   - Safe to run multiple times
   - Never deletes existing data

4. **Protection Monitor Script**
   - `protect-all-standings.js` - Checks if any standings are missing
   - Reports status of all 10 seasons
   - Recommends corrective actions

---

## How to Check Standings Status

To check if all standings are present in MongoDB:

```bash
cd server
npm run protect:all-standings
```

This will display:
- Number of standings per season
- Which seasons are complete
- Which seasons are missing or incomplete
- Recommended actions

---

## How to Restore Missing Standings

### Option 1: Restore ALL Seasons (Recommended)

If multiple seasons are missing, restore everything at once:

```bash
cd server
npm run restore:all-standings
```

This will:
- ✅ Check all 10 seasons
- ✅ Import only missing standings
- ✅ Never delete existing data
- ✅ Show detailed progress report

### Option 2: Restore Specific Seasons

If only specific seasons are missing:

```bash
cd server
npm run restore:season1    # Restore Season 1 only
npm run restore:season2    # Restore Season 2 only
npm run restore:season3    # Restore Season 3 only
npm run restore:season5    # Restore Season 5 only
```

### Option 3: Restore Seasons 4, 6-10

For these seasons, the safe scripts were already in place (Seasons 6-10) or can use the master restore:

```bash
cd server
npm run restore:all-standings  # This handles ALL seasons including 4, 6-10
```

---

## Expected Standings Counts

| Season | Expected Count | Description |
|--------|----------------|-------------|
| 1      | 45             | 3 divisions, 9 rounds each |
| 2      | 45             | 3 divisions, 9 rounds each |
| 3      | 45             | 3 divisions, 9 rounds each |
| 4      | 231            | 3 divisions, many rounds |
| 5      | 231            | 3 divisions, many rounds |
| 6      | 231            | 3 divisions, many rounds |
| 7      | 231            | 3 divisions, many rounds |
| 8      | 231            | 3 divisions, many rounds |
| 9      | 231            | 3 divisions, many rounds |
| 10     | 231            | 3 divisions, many rounds |
| **Total** | **1,752** | **All IFC seasons** |

---

## Dangerous Scripts (DO NOT RUN)

The following scripts have been **DISABLED** by renaming them:

```
❌ import-season4-standings-to-db.js.DANGEROUS
❌ import-season6-standings-to-db.js.DANGEROUS
❌ import-season7-standings-to-db.js.DANGEROUS
❌ import-season8-standings-to-db.js.DANGEROUS
❌ import-season9-standings-to-db.js.DANGEROUS
❌ import-season10-standings-to-db.js.DANGEROUS
❌ import-season2-standings-to-db.js.disabled
❌ import-season3-standings-to-db.js.disabled
❌ import-round-standings-to-db.js.disabled
```

**Why are they dangerous?**
- They use `deleteMany()` to remove existing data before importing
- Can accidentally wipe out standings if run carelessly
- Should NEVER be run again since IFC is complete

**What if I need them?**
- You should ALWAYS use the SAFE scripts instead
- Safe scripts do the same import but WITHOUT deletion
- Safe scripts can be run multiple times safely

---

## MongoDB Collection: RoundStandings

### Schema Overview
```javascript
{
  competitionId: ObjectId,     // Reference to CompetitionMeta
  seasonNumber: Number,        // 1-10
  divisionNumber: Number,      // 1-3
  roundNumber: Number,         // Varies by season
  fightId: String,            // e.g., "IFC-S1-D1-R1-F1"
  fightIdentifier: String,    // Same as fightId (unique index)
  standings: [{
    fighterId: String,        // Fighter ObjectId
    fightsCount: Number,      // Total fights in season
    wins: Number,             // Total wins
    points: Number,           // Total points (3 per win)
    rank: Number,             // Current ranking
    totalFightersCount: Number // Fighters in division
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ competitionId: 1, seasonNumber: 1, roundNumber: 1 }`
- `{ fightIdentifier: 1 }` (unique)
- `{ "standings.fighterId": 1 }`

---

## Preventing Future Data Loss

### 1. Regular Status Checks

Run the protection script weekly or monthly:

```bash
cd server
npm run protect:all-standings
```

### 2. Database Backups

Use MongoDB's built-in backup tools:

```bash
# Export all standings to JSON
mongodump --db amoyanfc --collection roundstandings --out ./backups/

# Or using MongoDB Atlas, enable automatic backups
```

### 3. Read-Only Mode (Optional)

If you want to make the RoundStandings collection read-only:

```javascript
// In MongoDB shell
db.createRole({
  role: "readOnlyRoundStandings",
  privileges: [{
    resource: { db: "amoyanfc", collection: "roundstandings" },
    actions: ["find"]
  }],
  roles: []
});
```

---

## Troubleshooting

### Problem: Standings are missing for some seasons

**Solution:**
```bash
cd server
npm run restore:all-standings
```

### Problem: Script says "Cannot connect to MongoDB"

**Solution:**
1. Check if MongoDB is running: `docker-compose ps`
2. Start MongoDB: `docker-compose up -d`
3. Check `.env` file has correct `MONGODB_URI`

### Problem: Import script fails with "duplicate key error"

**Solution:**
- This is normal! It means those standings already exist
- The safe scripts handle this gracefully
- Check final count to verify all data is present

### Problem: Want to verify specific season data

**Solution:**
```javascript
// In MongoDB shell or MongoDB Compass
db.roundstandings.countDocuments({ seasonNumber: 1 })  // Should be 45
db.roundstandings.countDocuments({ seasonNumber: 4 })  // Should be 231
```

---

## Scripts Reference

### Safe Import Scripts (✅ Safe to Run)

| Script | Command | Description |
|--------|---------|-------------|
| `import-season1-standings-SAFE.js` | `npm run restore:season1` | Restore Season 1 |
| `import-season2-standings-SAFE.js` | `npm run restore:season2` | Restore Season 2 |
| `import-season3-standings-SAFE.js` | `npm run restore:season3` | Restore Season 3 |
| `import-season5-standings-SAFE.js` | `npm run restore:season5` | Restore Season 5 |
| `restore-all-standings-SAFE.js` | `npm run restore:all-standings` | Restore ALL seasons |
| `protect-all-standings.js` | `npm run protect:all-standings` | Check status |

### Dangerous Scripts (❌ DO NOT RUN)

All scripts with `.DANGEROUS` or `.disabled` extensions should NOT be run.

---

## Best Practices

### ✅ DO

- Run `npm run protect:all-standings` regularly to monitor data
- Use `npm run restore:all-standings` if any data is missing
- Keep backups of `/old-data/migrated-standings/` directory
- Use safe scripts for any future imports

### ❌ DON'T

- Don't rename `.DANGEROUS` or `.disabled` scripts back to `.js`
- Don't run any scripts with `deleteMany()` in them
- Don't modify the `RoundStandings` collection manually
- Don't delete data files in `/old-data/migrated-standings/`

---

## Data File Locations

### Source Data (Permanent Backup)
```
/old-data/migrated-standings/
├── season1-all-rounds-standings.json  (95 KB)
├── season2-all-rounds-standings.json  (95 KB)
├── season3-all-rounds-standings.json  (95 KB)
├── season4-all-rounds-standings.json  (746 KB)
├── season5-all-rounds-standings.json  (744 KB)
├── season6-all-rounds-standings.json  (744 KB)
├── season7-all-rounds-standings.json  (724 KB)
├── season8-all-rounds-standings.json  (723 KB)
├── season9-all-rounds-standings.json  (725 KB)
└── season10-all-rounds-standings.json (725 KB)
```

### Scripts
```
/server/scripts/
├── import-season1-standings-SAFE.js       ✅ Safe
├── import-season2-standings-SAFE.js       ✅ Safe
├── import-season3-standings-SAFE.js       ✅ Safe
├── import-season5-standings-SAFE.js       ✅ Safe
├── restore-all-standings-SAFE.js          ✅ Safe (Master)
├── protect-all-standings.js               ✅ Safe (Monitor)
├── import-season4-standings-to-db.js.DANGEROUS  ❌ Disabled
├── import-season6-standings-to-db.js.DANGEROUS  ❌ Disabled
├── import-season7-standings-to-db.js.DANGEROUS  ❌ Disabled
├── import-season8-standings-to-db.js.DANGEROUS  ❌ Disabled
├── import-season9-standings-to-db.js.DANGEROUS  ❌ Disabled
└── import-season10-standings-to-db.js.DANGEROUS ❌ Disabled
```

---

## Quick Reference Commands

```bash
# Check if all standings are present
npm run protect:all-standings

# Restore all missing standings (RECOMMENDED)
npm run restore:all-standings

# Restore specific season
npm run restore:season1
npm run restore:season2
npm run restore:season3
npm run restore:season5

# Start MongoDB (if not running)
docker-compose up -d

# Check MongoDB connection
docker-compose ps
```

---

## Support

If you encounter issues:

1. Check this guide first
2. Run `npm run protect:all-standings` to see current status
3. Run `npm run restore:all-standings` to fix missing data
4. Check MongoDB is running: `docker-compose ps`
5. Verify data files exist in `/old-data/migrated-standings/`

---

## Summary

🛡️ **Protection Status:** FULLY PROTECTED
- All dangerous scripts disabled
- Safe restore scripts available
- Protection monitor in place
- All data backed up

✅ **To Restore Missing Data:**
```bash
cd server
npm run restore:all-standings
```

✅ **To Check Status:**
```bash
cd server
npm run protect:all-standings
```

⚠️ **Remember:** IFC is complete. No more data updates needed. These scripts are ONLY for restoration if data is accidentally lost.

---

**Document Created:** October 18, 2025  
**IFC Status:** CLOSED (All 10 Seasons Complete)  
**Protection Level:** MAXIMUM 🛡️

