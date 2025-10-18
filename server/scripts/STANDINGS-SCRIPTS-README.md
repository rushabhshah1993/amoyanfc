# IFC Standings Scripts - Important Information

## ⚠️ CRITICAL NOTICE

**IFC (Invictus Fighting Championship) is COMPLETE and CLOSED.**

All 10 seasons have been fully migrated to MongoDB. **NO MORE SCRIPTS SHOULD BE RUN** except for data restoration if standings are accidentally deleted.

---

## 🛡️ Protected Scripts

### Safe Scripts (✅ Can Be Run Safely)

These scripts will **NEVER** delete existing data. They only add missing data:

- `import-season1-standings-SAFE.js` - Restore Season 1 standings
- `import-season2-standings-SAFE.js` - Restore Season 2 standings
- `import-season3-standings-SAFE.js` - Restore Season 3 standings
- `import-season5-standings-SAFE.js` - Restore Season 5 standings
- `restore-all-standings-SAFE.js` - **MASTER RESTORE** (restores all seasons)
- `protect-all-standings.js` - Check standings status

**How to use:**
```bash
# Check if any standings are missing
npm run protect:all-standings

# Restore all missing standings
npm run restore:all-standings

# Restore specific season
npm run restore:season1  # or season2, season3, season5
```

---

## ❌ Dangerous Scripts (DO NOT RUN)

These scripts contain `deleteMany()` and will **DELETE** existing standings before importing:

- `import-season4-standings-to-db.js.DANGEROUS`
- `import-season6-standings-to-db.js.DANGEROUS`
- `import-season7-standings-to-db.js.DANGEROUS`
- `import-season8-standings-to-db.js.DANGEROUS`
- `import-season9-standings-to-db.js.DANGEROUS`
- `import-season10-standings-to-db.js.DANGEROUS`
- `import-season2-standings-to-db.js.disabled`
- `import-season3-standings-to-db.js.disabled`
- `import-round-standings-to-db.js.disabled`

**These scripts have been renamed with `.DANGEROUS` or `.disabled` extensions to prevent accidental execution.**

### Why are they dangerous?

Each contains code like:
```javascript
const deleteResult = await RoundStandings.deleteMany({ seasonNumber: X });
```

This **permanently deletes** all standings for that season before importing new data.

**❌ DO NOT:**
- Rename these files back to `.js`
- Run these files directly with `node`
- Remove the `.DANGEROUS` or `.disabled` extension
- Create npm scripts that call these files

---

## 🔧 Maintenance

### If Standings Are Missing

**Option 1: Restore All Seasons (Recommended)**
```bash
cd /Users/rushabhshah/Personal\ Projects/amoyanfc/server
npm run restore:all-standings
```

**Option 2: Restore Specific Season**
```bash
npm run restore:season1  # Seasons 1, 2, 3, or 5 only
```

**Option 3: Manual Restoration**
```bash
node scripts/import-season1-standings-SAFE.js
```

### Regular Health Check

Run this monthly to ensure no data loss:
```bash
npm run protect:all-standings
```

Expected output:
```
Season | Actual | Expected | Status
─────────────────────────────────────
  1    |     45 |       45 | ✅ Complete
  2    |     45 |       45 | ✅ Complete
  3    |     45 |       45 | ✅ Complete
  4    |    231 |      231 | ✅ Complete
  5    |    231 |      231 | ✅ Complete
  6    |    231 |      231 | ✅ Complete
  7    |    231 |      231 | ✅ Complete
  8    |    231 |      231 | ✅ Complete
  9    |    231 |      231 | ✅ Complete
 10    |    231 |      231 | ✅ Complete
```

---

## 📊 Expected Data

| Season | Standings Count | Data File Size |
|--------|----------------|----------------|
| 1      | 45             | 95 KB          |
| 2      | 45             | 95 KB          |
| 3      | 45             | 95 KB          |
| 4      | 231            | 746 KB         |
| 5      | 231            | 744 KB         |
| 6      | 231            | 744 KB         |
| 7      | 231            | 724 KB         |
| 8      | 231            | 723 KB         |
| 9      | 231            | 725 KB         |
| 10     | 231            | 725 KB         |
| **TOTAL** | **1,752**  | **~4.8 MB**    |

---

## 📁 Data Source Files

All standing data is backed up in:
```
/old-data/migrated-standings/
├── season1-all-rounds-standings.json
├── season2-all-rounds-standings.json
├── season3-all-rounds-standings.json
├── season4-all-rounds-standings.json
├── season5-all-rounds-standings.json
├── season6-all-rounds-standings.json
├── season7-all-rounds-standings.json
├── season8-all-rounds-standings.json
├── season9-all-rounds-standings.json
└── season10-all-rounds-standings.json
```

**⚠️ DO NOT DELETE THESE FILES** - They are the source of truth for restoration.

---

## 🚨 Emergency Restoration

If you accidentally deleted standings:

1. **Don't Panic** - Data files are backed up
2. **Check Status:**
   ```bash
   npm run protect:all-standings
   ```
3. **Restore Everything:**
   ```bash
   npm run restore:all-standings
   ```
4. **Verify:**
   ```bash
   npm run protect:all-standings
   ```

---

## 🔐 MongoDB Collection

**Collection:** `roundstandings`  
**Database:** `amoyanfc`

### Indexes
- `{ competitionId: 1, seasonNumber: 1, roundNumber: 1 }`
- `{ fightIdentifier: 1 }` - **UNIQUE**
- `{ "standings.fighterId": 1 }`

The unique index on `fightIdentifier` prevents duplicate imports, making safe scripts truly safe to run multiple times.

---

## 📋 Quick Command Reference

```bash
# Check status
npm run protect:all-standings

# Restore all seasons
npm run restore:all-standings

# Restore specific season
npm run restore:season1
npm run restore:season2
npm run restore:season3
npm run restore:season5

# Start MongoDB
docker-compose up -d

# Check MongoDB status
docker-compose ps
```

---

## ⚡ NPM Scripts Available

From the `server` directory:

| Command | Script | Safe? |
|---------|--------|-------|
| `npm run protect:all-standings` | Check all seasons status | ✅ Yes |
| `npm run restore:all-standings` | Restore all missing data | ✅ Yes |
| `npm run restore:season1` | Restore Season 1 only | ✅ Yes |
| `npm run restore:season2` | Restore Season 2 only | ✅ Yes |
| `npm run restore:season3` | Restore Season 3 only | ✅ Yes |
| `npm run restore:season5` | Restore Season 5 only | ✅ Yes |

---

## 📖 Full Documentation

For complete information, see:
```
/STANDINGS-PROTECTION-GUIDE.md
```

---

## 🎯 Summary

✅ **Use these safe scripts:**
- `restore-all-standings-SAFE.js` (master restore)
- `protect-all-standings.js` (health check)
- `import-season[1,2,3,5]-standings-SAFE.js` (individual seasons)

❌ **Never use these dangerous scripts:**
- Any file ending in `.DANGEROUS`
- Any file ending in `.disabled`
- Any script containing `deleteMany()`

🛡️ **Best Practice:**
Run `npm run protect:all-standings` monthly to ensure data integrity.

---

**Last Updated:** October 18, 2025  
**IFC Status:** CLOSED (All 10 Seasons Complete)  
**Protection Level:** MAXIMUM 🛡️

