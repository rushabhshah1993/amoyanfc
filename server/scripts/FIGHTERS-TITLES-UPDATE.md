# Fighters Titles Update Script

## Overview
This script updates the `competitionHistory.titles` field for fighters who won IFC league titles in Seasons 1, 2, and 3.

## What It Does

### 1. Data Source
- **Season 1 Winner**: Fighter ID `676d7452eb38b2b97c6da981`
- **Season 2 Winner**: Fighter ID `676d6ecceb38b2b97c6da945`
- **Season 3 Winner**: Fighter ID `676d7613eb38b2b97c6da9a9`
- **Competition**: IFC (Meta ID: `67780dcc09a4c4b25127f8f6`)
- **Division**: All titles are from Division 1

### 2. Update Process
For each season winner, the script:

1. **Queries MongoDB** to get the Competition ObjectId for that season
2. **Finds the fighter** document
3. **Locates or creates** the `competitionHistory` entry for IFC
4. **Adds title information** to `titles.details`:
   - `competitionSeasonId`: Reference to the Competition document
   - `seasonNumber`: 1, 2, or 3
   - `divisionNumber`: 1
5. **Updates `totalTitles`** to reflect the count
6. **Saves** the updated fighter document

### 3. Schema Structure
```javascript
competitionHistory: [
  {
    competitionId: ObjectId,        // IFC Meta ID
    numberOfSeasonAppearances: Number,
    totalFights: Number,
    totalWins: Number,
    totalLosses: Number,
    winPercentage: Number,
    titles: {
      totalTitles: Number,          // Incremented for each title
      details: [
        {
          competitionSeasonId: ObjectId,  // Season's Competition ID
          seasonNumber: Number,            // 1, 2, or 3
          divisionNumber: Number           // 1
        }
      ]
    }
  }
]
```

## Running the Script

### From the server directory:
```bash
cd server
npm run update:fighters-titles
```

### Or directly:
```bash
node scripts/update-fighters-titles.js
```

## Output Example

```
🚀 Starting fighters titles update...

✅ Connected to MongoDB

📊 Fetching IFC competition seasons...
✅ Found 3 IFC competition seasons

   Season 1: 507f1f77bcf86cd799439011
   Season 2: 507f1f77bcf86cd799439012
   Season 3: 507f1f77bcf86cd799439013

🏆 Processing Season 1 winner (Fighter ID: 676d7452eb38b2b97c6da981)...
   ✅ Found fighter: Prachi Gunde
   ✅ Added title for Season 1
   📊 Total titles: 1

🏆 Processing Season 2 winner (Fighter ID: 676d6ecceb38b2b97c6da945)...
   ✅ Found fighter: Sayali Thombare
   ✅ Added title for Season 2
   📊 Total titles: 1

🏆 Processing Season 3 winner (Fighter ID: 676d7613eb38b2b97c6da9a9)...
   ✅ Found fighter: Unnati Chaubal
   ✅ Added title for Season 3
   📊 Total titles: 1

✅ Update complete!
📊 Updated 3 fighter(s) with title information

🔍 Verifying updated fighters...

   Prachi Gunde:
      Total Titles: 1
      Titles: Season 1
   Sayali Thombare:
      Total Titles: 1
      Titles: Season 2
   Unnati Chaubal:
      Total Titles: 1
      Titles: Season 3

✅ All done!
```

## Important Notes

### Safety Features
- ✅ **Duplicate Prevention**: Won't add the same title twice
- ✅ **Validation**: Checks if fighter exists before updating
- ✅ **Verification**: Displays updated data after completion

### What It Doesn't Do
- ❌ Does not update fighters' overall win/loss records (that's in `update-fighters-history.js`)
- ❌ Does not calculate standings (that's in `calculate-seasonX-standings.js`)
- ❌ Does not modify competition documents

### Prerequisites
- ✅ MongoDB must be running
- ✅ Competition documents for Seasons 1, 2, 3 must exist
- ✅ Fighter documents must exist with correct IDs

## Idempotency
This script is **idempotent** - you can run it multiple times safely. It will:
- Skip fighters that already have the title
- Only add missing titles
- Never duplicate title entries

## Related Scripts
1. `update-fighters-history.js` - Updates fight records and opponents history
2. `import-seasonX-to-db.js` - Imports season competition data
3. `calculate-seasonX-standings.js` - Calculates season standings

## Future Enhancements
When adding more seasons:
1. Add the winner's fighter ID to `SEASON_WINNERS` object
2. Run this script again
3. It will automatically pick up the new season from MongoDB

## Troubleshooting

### "No IFC competitions found in database"
- Run the import scripts for seasons 1, 2, 3 first
- Check that `competitionMetaId` matches `67780dcc09a4c4b25127f8f6`

### "Fighter not found"
- Verify fighter IDs are correct in MongoDB
- Check that fighters haven't been archived or deleted

### "No competition history found for IFC"
- This is expected for fighters who haven't been processed by `update-fighters-history.js`
- The script will create a new entry automatically

