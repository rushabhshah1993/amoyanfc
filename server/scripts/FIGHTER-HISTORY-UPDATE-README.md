# Fighter History Update Script

## Overview

This script updates all fighters' history based on fight results across all seasons. It processes every fight in every round of every season and updates two main data structures for each fighter:

1. **opponentsHistory** - Tracks fights against each unique opponent
2. **competitionHistory** - Tracks overall competition statistics

## What Gets Updated

### 1. Opponents History (`opponentsHistory`)

For each unique opponent a fighter has faced, the script tracks:

- **opponentId**: MongoDB ObjectId of the opponent
- **totalFights**: Total number of fights against this opponent
- **totalWins**: Number of wins against this opponent
- **totalLosses**: Number of losses against this opponent
- **winPercentage**: Win percentage against this opponent
- **details**: Array of individual fight records containing:
  - `competitionId`: IFC competition meta ID
  - `season`: Season number (1, 2, 3, etc.)
  - `divisionId`: Division number (currently always 1)
  - `roundId`: Round number (1-9)
  - `fightId`: MongoDB ObjectId of the fight document
  - `isWinner`: Boolean indicating if the fighter won this fight

### 2. Competition History (`competitionHistory`)

For each competition (currently just IFC), the script tracks:

- **competitionId**: MongoDB ObjectId of the competition meta
- **numberOfSeasonAppearances**: Count of unique seasons the fighter participated in
- **totalFights**: Total number of fights in this competition
- **totalWins**: Total wins in this competition
- **totalLosses**: Total losses in this competition
- **winPercentage**: Overall win percentage in this competition
- **titles**: Object containing title information (populated separately)
  - `totalTitles`: Number of titles won (default: 0)
  - `details`: Array of title details (empty for now)

## How It Works

### Process Flow

1. **Reset**: Clears all existing `opponentsHistory` and `competitionHistory` for all fighters
2. **Fetch**: Retrieves all seasons (1, 2, 3) from MongoDB
3. **Process**: Iterates through:
   - Each season
   - Each division in the season
   - Each round in the division
   - Each fight in the round
4. **Update**: For each fight:
   - Identifies winner and loser
   - Updates winner's opponents history (marks as win)
   - Updates winner's competition history (increment wins)
   - Updates loser's opponents history (marks as loss)
   - Updates loser's competition history (increment losses)
5. **Save**: Converts modified arrays to plain objects and saves to MongoDB
6. **Verify**: Checks that all data was saved correctly

### Key Technical Details

- **Fighter Caching**: Fighters are cached in memory during processing to minimize database queries
- **Array Index Access**: Uses array indexes instead of references to ensure Mongoose tracks changes
- **Plain Object Conversion**: Converts Mongoose subdocuments to plain objects before saving
- **Season Tracking**: Uses a Set to track unique seasons for `numberOfSeasonAppearances`

## Usage

### Run the Script

```bash
# From the server directory
npm run update:fighters-history

# Or directly
node scripts/update-fighters-history.js
```

### When to Run

Run this script after:
- Importing new season data
- Updating fight results
- Adding new fighters to existing seasons
- Correcting any historical data

## Example Output

### Competition History Example
```javascript
{
  competitionId: "67780dcc09a4c4b25127f8f6", // IFC
  numberOfSeasonAppearances: 2,
  totalFights: 18,
  totalWins: 12,
  totalLosses: 6,
  winPercentage: 66.67,
  titles: {
    totalTitles: 0,
    details: []
  }
}
```

### Opponents History Example
```javascript
{
  opponentId: "676d721aeb38b2b97c6da961",
  totalFights: 3,
  totalWins: 2,
  totalLosses: 1,
  winPercentage: 66.67,
  details: [
    {
      competitionId: "67780dcc09a4c4b25127f8f6",
      season: 1,
      divisionId: 1,
      roundId: 3,
      fightId: "68ed3fc2afd892411fef9ec2",
      isWinner: true
    },
    {
      competitionId: "67780dcc09a4c4b25127f8f6",
      season: 2,
      divisionId: 1,
      roundId: 5,
      fightId: "68f0065f8cf32f1236924ae8",
      isWinner: false
    },
    {
      competitionId: "67780dcc09a4c4b25127f8f6",
      season: 3,
      divisionId: 1,
      roundId: 7,
      fightId: "68f00bb31ea51b0c70a51364",
      isWinner: true
    }
  ]
}
```

## Statistics (Current Data)

Based on the latest run:

- **Fighters Updated**: 24
- **Total Fights Processed**: 135 (45 per season × 3 seasons)
- **Total Fighter Updates**: 270 (2 fighters per fight × 135 fights)
- **Competition History Entries**: 24 (one per fighter for IFC)
- **Opponents History Entries**: ~216 (varies by fighter)

## Future Enhancements

The following fields are **NOT** currently updated by this script and will need separate logic:

1. **streaks** - Winning/losing streak tracking
2. **debutInformation** - First fight information
3. **competitionHistory.titles** - Championship titles won
4. **fightStats** - Detailed fight statistics (strikes, takedowns, etc.)

## Error Handling

The script includes:

- Connection error handling
- Missing fighter warnings
- Verification checks after save
- Statistics comparison (competition vs opponents history should match)

## Important Notes

1. **Destructive Operation**: The script **resets** all history before rebuilding, so any manual edits will be lost
2. **Competition Meta ID**: Currently hardcoded to IFC (`67780dcc09a4c4b25127f8f6`)
3. **Division Numbers**: Uses division number (1) not MongoDB IDs
4. **Round Numbers**: Uses round number (1-9) not MongoDB IDs
5. **Fight IDs**: Uses actual MongoDB `_id` from fight subdocuments for future reference

## Verification

The script outputs verification statistics:
- Number of fighters with history
- Total fights tracked in competition history
- Total fights tracked in opponents history
- Sample fighter data

Both competition and opponents history should track the **same total number** of fights (270 for current data).

