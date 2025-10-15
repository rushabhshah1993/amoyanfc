# IFC Season 2 Data Import

This document explains how to import Season 2 data into MongoDB.

## Prerequisites

1. MongoDB connection must be configured in your `.env` file
2. The `ifc-season2-migrated.json` file must exist in `/old-data/`
3. CompetitionMeta with ID `67780dcc09a4c4b25127f8f6` must exist in the database

## Import Script

The import script is located at: `server/scripts/import-season2-to-db.js`

## How to Run

### Option 1: Using npm script (Recommended)

```bash
cd server
npm run import:season2
```

### Option 2: Direct node execution

```bash
cd server
node scripts/import-season2-to-db.js
```

## What the Script Does

1. **Connects to MongoDB** using the connection string from your `.env` file
2. **Checks for existing Season 2 data** in the database
3. **Prompts for confirmation** if Season 2 already exists (5-second delay)
4. **Deletes existing Season 2** if found (to avoid duplicates)
5. **Imports the new Season 2 data** from `ifc-season2-migrated.json`
6. **Verifies the import** by checking:
   - Season metadata
   - Division structure
   - Rounds and fights
   - Fighter references
7. **Displays summary information** including:
   - Document ID
   - Season statistics
   - Sample fight data

## Data Structure

The imported Season 2 includes:

- **Season Number**: 2
- **Divisions**: 1
- **Fighters per Division**: 10
- **Total Rounds**: 9
- **Total Fights**: 45 (5 fights per round)
- **Winner**: Fighter F034 (Maksymilian Kuchnik)

## After Import

Once imported, you can query Season 2 data using:

- **GraphQL queries** via your API
- **MongoDB queries** directly
- **Frontend components** in your React app

## Troubleshooting

### Connection Issues

If you see connection errors:
- Check your `.env` file has the correct `MONGODB_URI`
- Ensure MongoDB is running
- Check network connectivity

### CompetitionMeta Not Found

If the script fails with "Invalid competitionMetaId reference":
- Verify the CompetitionMeta document exists
- Check the ID matches: `67780dcc09a4c4b25127f8f6`

### Duplicate Key Errors

If you see duplicate key errors:
- The script should handle this automatically
- Wait for the 5-second prompt and let it delete the old data
- Or manually delete Season 2 before running the script

## Success Indicators

You should see output like:

```
✅ Connected to MongoDB
✅ Loaded Season 2 data
✅ Successfully imported Season 2!
✅ Season 2 verified in database
✨ IMPORT SUCCESSFUL! ✨
```

## Notes

- The script is safe to run multiple times
- Existing Season 2 data will be replaced (with confirmation)
- The import process takes only a few seconds
- All fighter IDs are converted to MongoDB ObjectId references

