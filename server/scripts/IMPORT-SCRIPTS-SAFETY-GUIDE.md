# Data Import Scripts - Safety Guide

This document explains the different import scripts available and their safety characteristics to prevent accidental data loss.

## 🛡️ Safe Import Scripts (Recommended)

These scripts will **NOT delete existing data** and are safe to run on any machine:

### Round Standings
```bash
# Safe import - will skip if data already exists
npm run import:safe-round-standings
# or
node scripts/import-round-standings-safe.js
```

### Season 2 Data
```bash
# Safe import - will skip if data already exists
npm run import:safe-season2
# or
node scripts/import-season2-safe.js
```

### Season 3 Data
```bash
# Safe import - will skip if data already exists
npm run import:safe-season3
# or
node scripts/import-season3-safe.js
```

## ⚠️ Destructive Import Scripts (Use with Caution)

These scripts **WILL DELETE existing data** before importing new data:

### Round Standings
```bash
# DESTRUCTIVE - deletes existing data first
npm run import:season2-standings
# or
node scripts/import-round-standings-to-db.js
```

### Season 2 Data
```bash
# DESTRUCTIVE - deletes existing data first
npm run import:season2
# or
node scripts/import-season2-to-db.js
```

### Season 3 Data
```bash
# DESTRUCTIVE - deletes existing data first
npm run import:season3
# or
node scripts/import-season3-to-db.js
```

## 🚨 Why Data Gets Deleted

The destructive import scripts have this behavior built-in:

1. **Check for existing data** in the database
2. **If data exists**, show a warning and wait 5 seconds
3. **Delete ALL existing data** for that season/type
4. **Import fresh data** from JSON files

This is why round 1 standings keep getting deleted when someone runs import scripts on other machines.

## 🛠️ Environment Protection

### Safe Scripts
- **Disabled in production** - will exit immediately
- **Only work in development** environment
- **Never delete existing data**

### Destructive Scripts
- **Work in all environments** but with warnings
- **10-second delay in production** before proceeding
- **Will delete existing data** after confirmation

## 📋 Best Practices

### For New Machines/Deployments
1. **Always use safe import scripts first**
2. **Check existing data**: `node scripts/check-standings-in-db.js`
3. **Only use destructive scripts if you need to replace data**

### For Development
1. **Use safe scripts** for initial setup
2. **Use destructive scripts** only when you need to refresh data
3. **Always backup before running destructive scripts**

### For Production
1. **Never run destructive scripts** unless absolutely necessary
2. **Use safe scripts** for data restoration
3. **Always backup production data** before any imports

## 🔍 Checking Data Status

Before running any import script, check what data exists:

```bash
# Check all standings in database
node scripts/check-standings-in-db.js
```

This will show:
- Season 1 standings count
- Season 2 standings count
- Sample data from each season

## 🚨 Emergency Recovery

If data gets accidentally deleted:

1. **Don't panic** - the data is in the JSON files
2. **Use safe import scripts** to restore data
3. **Check the data** after restoration
4. **Document what happened** to prevent future issues

## 📁 Data Sources

All import scripts read from these JSON files:
- **Round Standings**: `old-data/migrated-standings/all-rounds-standings.json`
- **Season 2**: `old-data/ifc-season2-migrated.json`
- **Season 3**: `old-data/ifc-season3-migrated.json`

## 🎯 Quick Reference

| Script Type | Safe? | Deletes Data? | Production Safe? | Use Case |
|-------------|-------|---------------|------------------|----------|
| `import:safe-*` | ✅ Yes | ❌ No | ✅ Yes | Initial setup, data restoration |
| `import:*` | ❌ No | ✅ Yes | ⚠️ With warnings | Data replacement, development |

## 📞 Support

If you encounter issues:
1. **Check this guide first**
2. **Use safe scripts** when in doubt
3. **Always backup** before destructive operations
4. **Document any issues** for future reference
