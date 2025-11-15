# Production Migration Guide: Opponent History Dates

## Overview
This guide covers migrating opponent history dates on the **production database** while ensuring IFL competition data is **excluded**.

## Current Status
- ✅ **Staging Migration**: COMPLETED (includes IFL data)
- ⏳ **Production Migration**: PENDING (must exclude IFL data)

## Why Production is Different
- **Staging DB** (`staging-amoyan`): Contains IFL competitions and fights
- **Production DB** (`gql-db`): Should NOT contain IFL competitions or fights

The production migration script has been designed to:
1. ✅ Automatically detect and skip ALL IFL competition fights
2. ✅ Abort if accidentally run on staging
3. ✅ Only migrate IFC, IC, and CC competition fights

---

## Pre-Migration Steps

### Step 1: Switch to Production Environment

Update your `server/.env` file to use the **production** database:

```bash
# Use production MongoDB URI
MONGODB_URI=mongodb+srv://shahrushabh1993:8CK3oS2VcquP7DY9@amoyancluster.vl6hc.mongodb.net/gql-db?retryWrites=true&w=majority&appName=AmoyanCluster
```

### Step 2: Verify Production Database

Run the verification script to confirm:
- You're connected to production (not staging)
- No IFL competitions exist
- How many fights need migration

```bash
cd server
node scripts/verify-production-before-migration.js
```

**Expected Output:**
```
✅ READY FOR MIGRATION
   • Connected to production database
   • No IFL competitions detected
   • X fights need date population
```

If you see warnings, **DO NOT PROCEED** until resolved.

---

## Migration Steps

### Step 1: Backup Production Data

**CRITICAL**: Always backup before migration!

```bash
cd server
node scripts/backup-before-migration.js
```

This creates timestamped backups in `backups/` directory:
- `fighters-backup-[timestamp].json`
- `competitions-backup-[timestamp].json`

### Step 2: Run Production Migration

```bash
cd server
node scripts/migrate-opponent-history-dates-production.js
```

The script will:
1. ✅ Verify you're on production database
2. ✅ Identify any IFL competitions (should be 0)
3. ✅ Process all fighters
4. 🚫 **SKIP** any IFL competition fights
5. ✅ Populate dates for IFC, IC, CC fights only

**Expected Output:**
```
📊 PRODUCTION MIGRATION COMPLETE
======================================================================
✅ Fighters updated: X
📝 Total fights processed: Y
🚫 IFL fights skipped: 0 (or small number if any exist)
📊 Database: gql-db
```

### Step 3: Verify Migration Success

After migration, verify the data:

```bash
cd server
node scripts/verify-production-before-migration.js
```

Should show:
- `Fights WITH dates: [increased number]`
- `Fights WITHOUT dates: [decreased number]`

---

## Safety Features

### 1. Staging Database Protection
If you accidentally run the production migration script on staging:
```
❌ ERROR: This script detected STAGING database!
❌ This script should ONLY run on PRODUCTION database (gql-db)
❌ Migration ABORTED for safety.
```

### 2. IFL Exclusion
Any IFL fights encountered will show:
```
🚫 SKIPPED IFL fight [fightId]...
```

### 3. Detailed Logging
Every fight processed is logged:
- ✓ = Successfully updated with date
- ⚠️ = Fight found but has no date in competition
- ❌ = Fight not found in competition
- 🚫 = IFL fight skipped

---

## Rollback (If Needed)

If something goes wrong, restore from backup:

```bash
cd server
node scripts/restore-from-backup.js
```

Follow the prompts to select the backup timestamp.

---

## Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `verify-production-before-migration.js` | Check database state | Before AND after migration |
| `backup-before-migration.js` | Create backup | Before migration |
| `migrate-opponent-history-dates-production.js` | Run migration | After backup |
| `migrate-opponent-history-dates.js` | Original (staging) | Already completed on staging |
| `restore-from-backup.js` | Restore data | Only if rollback needed |

---

## Troubleshooting

### Problem: "The `uri` parameter to `openUri()` must be a string"
**Solution**: Your `.env` file is not configured. Check that `server/.env` exists and has `MONGODB_URI` set.

### Problem: Script detects staging database
**Solution**: Update `server/.env` to use production MongoDB URI.

### Problem: IFL competitions found in production
**Solution**: The migration script will skip them automatically. Review the output to confirm no IFL fights were migrated.

### Problem: Migration fails midway
**Solution**: 
1. Check the error message
2. Restore from backup: `node scripts/restore-from-backup.js`
3. Fix the issue
4. Re-run migration

---

## Post-Migration Testing

After successful migration:

1. **Frontend Testing**:
   - Switch frontend to production API
   - Open a FighterPage - verify fights are sorted by date
   - Open a FightPage (LEAGUE) - verify last 5 fights from same season/division
   - Open a FightPage (CUP) - verify fights sorted by date

2. **Data Integrity**:
   - Verify no IFL data in production
   - Confirm dates are populated correctly
   - Check that old fights (legitimately without dates) still work

---

## Summary Checklist

Before migration:
- [ ] `.env` configured for production
- [ ] Verification script run and passed
- [ ] Backup created

During migration:
- [ ] Migration script completed successfully
- [ ] No errors in output
- [ ] IFL fights skipped count is 0 (or expected)

After migration:
- [ ] Verification script shows increased dates
- [ ] Frontend testing passed
- [ ] No IFL data in production

---

## Contact

If you encounter any issues during production migration, review:
1. This guide
2. The migration output logs
3. The backup files in `backups/` directory

