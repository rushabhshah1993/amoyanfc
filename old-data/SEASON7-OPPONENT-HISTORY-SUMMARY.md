# Season 7 Opponent History - Calculation & Import Summary

## Overview
Successfully calculated and imported IFC Season 7 opponent history data to MongoDB fighter documents.

## Date
January 27, 2025

## Process

### 1. Data Calculation
- **Source Data:**
  - `ifc-season7-migrated.json` - Season 7 competition data with all fights
  - `fighters-old.json` - Fighter names and metadata
  - `fighter-mapping.json` - Fighter code to ObjectId mapping

- **Output File:**
  - `season7-opponent-history.json` - Opponent history for all 38 fighters

- **Calculation Script:**
  - `server/scripts/calculate-season7-opponent-history.js`
  - Processes each fight and updates both fighters' opponent history
  - Calculates cumulative statistics and win percentages

### 2. Opponent History Structure
Each fighter's opponent history entry contains:

```javascript
{
  opponentId: ObjectId,              // The opponent's MongoDB ID
  totalFights: Number,               // Total fights against this opponent
  totalWins: Number,                 // Wins against this opponent
  totalLosses: Number,               // Losses against this opponent
  winPercentage: Number,             // Win percentage (0-100)
  details: [{                        // Array of individual fight records
    competitionId: ObjectId,         // Competition ID (IFC)
    season: Number,                  // Season number (7)
    divisionId: Number,              // Division number (1, 2, or 3)
    roundId: Number,                 // Round number
    isWinner: Boolean                // Whether this fighter won
  }]
}
```

**Note:** The `fightId` field was intentionally omitted as fights don't have separate ObjectIds in our system. The combination of `season`, `divisionId`, and `roundId` uniquely identifies the fight.

### 3. Data Merging Strategy
The import script merges Season 7 data with existing opponent history:
- If opponent already exists: adds Season 7 fights to existing record and recalculates stats
- If new opponent: creates new opponent history entry
- Prevents duplication by filtering Season 7 data before merging

### 4. Verification
- ✅ All 38 fighters processed
- ✅ 462 opponent pairs calculated
- ✅ 462 fight relationships (2× 231 fights)
- ✅ Basic structure validated
- ✅ Required fields present
- ✅ Reciprocity verified (if A fought B, then B fought A)
- ✅ Statistics calculations accurate
- ✅ Win percentages correct

### 5. Data Cleanup
Before final import, partial data from failed attempt was cleaned:
- Identified 4 fighters with incomplete Season 7 data
- Removed Season 7 fight records from these fighters
- Recalculated their opponent history statistics
- Verified database was clean before re-import

### 6. MongoDB Import
- **Import Script:** `server/scripts/import-season7-opponent-history.js`
- **NPM Command:** `npm run import:season7:opponent-history`
- **Model:** Fighter (opponentsHistory field)
- **Update Method:** Merge with existing data

## Season 7 Opponent History Statistics

### Overall
- **Total Fighters:** 38
- **Opponent Pairs:** 462
- **Fight Relationships:** 462 (231 fights × 2 fighters per fight)
- **Average Opponents per Fighter:** 12.2

### Division Breakdown

#### Division 1 (Elite)
- **Fighters:** 10
- **Fights per Fighter:** 9
- **Total Fight Records:** 90 (10 fighters × 9 fights)

#### Division 2 (Championship)
- **Fighters:** 12
- **Fights per Fighter:** 11
- **Total Fight Records:** 132 (12 fighters × 11 fights)

#### Division 3
- **Fighters:** 16
- **Fights per Fighter:** 15
- **Total Fight Records:** 240 (16 fighters × 15 fights)

## Notable Statistics

### Rematches in Season 7
No rematches occurred in Season 7 - each fighter faced each opponent only once during the season.

### Most Opponents Faced
- Division 3 fighters: Up to 15 different opponents
- Division 2 fighters: Up to 11 different opponents
- Division 1 fighters: Up to 9 different opponents

## Data Integrity

### Reciprocity Verification
Every fighter-opponent relationship is reciprocal:
- If Fighter A has Fighter B in history, Fighter B has Fighter A
- Fight counts match between both fighters
- Wins and losses are inverse (A's wins = B's losses)

### Statistics Accuracy
- ✅ Total fights = Total wins + Total losses
- ✅ Win percentage = (Total wins / Total fights) × 100
- ✅ Details array length = Total fights
- ✅ Wins in details = Total wins
- ✅ Losses in details = Total losses

## Files Created
1. `old-data/season7-opponent-history.json` - Calculated opponent history data
2. `server/scripts/calculate-season7-opponent-history.js` - Calculation script
3. `server/scripts/verify-season7-opponent-history.js` - Verification script
4. `server/scripts/import-season7-opponent-history.js` - Import script
5. `server/scripts/check-season7-opponent-data.js` - Database check script
6. `server/scripts/delete-season7-opponent-data.js` - Cleanup script
7. Updated `server/package.json` with convenience scripts

## NPM Scripts Added
```json
{
  "calculate:season7:opponent-history": "Calculate opponent history from fights",
  "verify:season7:opponent-history": "Verify calculated data",
  "import:season7:opponent-history": "Import to MongoDB"
}
```

## Import Status
✅ **SUCCESSFULLY IMPORTED TO MONGODB**

## MongoDB Verification
All 38 fighters confirmed to have Season 7 opponent history:
- Division 1: 10 fighters with 9 fight records each
- Division 2: 12 fighters with 11 fight records each
- Division 3: 16 fighters with 15 fight records each

## Example Fighter Data

### Before Season 7
```javascript
opponentsHistory: [
  {
    opponentId: "676d7631eb38b2b97c6da9ab",
    totalFights: 2,
    totalWins: 1,
    totalLosses: 1,
    winPercentage: 50,
    details: [
      { season: 1, divisionId: 1, roundId: 1, isWinner: false },
      { season: 4, divisionId: 1, roundId: 7, isWinner: true }
    ]
  }
]
```

### After Season 7 Merge
```javascript
opponentsHistory: [
  {
    opponentId: "676d7631eb38b2b97c6da9ab",
    totalFights: 3,              // +1 from Season 7
    totalWins: 1,                // No new wins
    totalLosses: 2,              // +1 loss
    winPercentage: 33,           // Recalculated
    details: [
      { season: 1, divisionId: 1, roundId: 1, isWinner: false },
      { season: 4, divisionId: 1, roundId: 7, isWinner: true },
      { season: 7, divisionId: 1, roundId: 3, isWinner: false }  // NEW
    ]
  }
]
```

## Use Cases

1. **Head-to-Head Records:** Display historical record between any two fighters
2. **Rivalry Tracking:** Identify fighters who have faced each other multiple times
3. **Win Rate Analysis:** Analyze fighter performance against specific opponents
4. **Historical Context:** Show how relationships evolved across seasons
5. **Matchup Statistics:** Power advanced analytics and predictions

## Troubleshooting

### Issue: fightId Validation Error
**Problem:** Initial calculation included `fightId` field as string, causing MongoDB validation error.

**Solution:** Removed `fightId` field from details array since fights don't have separate ObjectIds in our system.

### Issue: Partial Data from Failed Import
**Problem:** 4 fighters had incomplete Season 7 data from failed import attempt.

**Solution:** Created cleanup script to remove Season 7 data before fresh import.

## Success! 🎉
Season 7 opponent history is now fully integrated into fighter documents with proper merging of historical data!

## Related Documentation
- See `SEASON7-IMPORT-SUMMARY.md` for competition data import
- See `SEASON7-STANDINGS-SUMMARY.md` for standings data import
- See opponent history scripts for implementation details

