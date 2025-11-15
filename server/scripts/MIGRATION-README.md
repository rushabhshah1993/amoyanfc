# Migration: Populate Dates in Fighter OpponentsHistory

## Problem
Fighter's `opponentsHistory` details don't have dates populated, which prevents proper chronological sorting in the Performance component.

## Solution
Migrate dates from the actual fight documents in Competition collection to fighter's opponentsHistory.

## Steps to Run Migration Safely

### Step 1: Create Backup
```bash
cd server
node scripts/backup-before-migration.js
```

This will create a timestamped backup in `backups/migration-YYYY-MM-DDTHH-MM-SS/` containing:
- `fighters.json` - All fighter documents
- `competitions.json` - All competition documents
- `metadata.json` - Backup information

### Step 2: Run Migration
```bash
node scripts/migrate-opponent-history-dates.js
```

This will:
- Loop through all fighters
- For each fight in opponentsHistory without a date
- Look up the fight in the Competition collection
- Copy the date from the fight to opponentsHistory
- Save the updated fighter

### Step 3: Verify Results
Check a few fighters in MongoDB Compass to verify dates are populated:
```javascript
db.fighters.findOne(
  { firstName: "Kinjal" },
  { "opponentsHistory.details.date": 1 }
)
```

### Step 4: If Something Goes Wrong - Restore
```bash
node scripts/restore-from-backup.js migration-YYYY-MM-DDTHH-MM-SS
```

Replace `migration-YYYY-MM-DDTHH-MM-SS` with your actual backup directory name.

## Important Notes

1. **Backup First**: Always run the backup script before migration
2. **Check Fight Dates**: If fights in Competition collection don't have dates, the migration won't help
3. **Future Fights**: The `fight-result.service.js` already saves dates, so new fights will have dates automatically
4. **Old Data**: Historical fights might not have dates in Competition collection - those will remain null

## Verification Query

After migration, check how many fights have dates:
```javascript
db.fighters.aggregate([
  { $unwind: "$opponentsHistory" },
  { $unwind: "$opponentsHistory.details" },
  {
    $group: {
      _id: null,
      totalFights: { $sum: 1 },
      fightsWithDate: {
        $sum: { $cond: [{ $ne: ["$opponentsHistory.details.date", null] }, 1, 0] }
      }
    }
  }
])
```

## Related Files
- `backup-before-migration.js` - Creates backup
- `migrate-opponent-history-dates.js` - Runs migration
- `restore-from-backup.js` - Restores from backup if needed
- `../services/fight-result.service.js` - Updates opponentsHistory with dates for new fights

