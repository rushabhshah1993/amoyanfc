# Fighter Streak Update System

This system automatically processes all fights chronologically and updates fighter streak data based on their win/loss records.

## Overview

The streak system tracks consecutive wins and losses for each fighter across all competitions. Each streak object contains:

- **Type**: "win" or "lose"
- **Count**: Number of consecutive wins/losses
- **Active**: Boolean indicating if the streak is ongoing
- **Start**: Season, division, and round where the streak began
- **End**: Season, division, and round where the streak ended (null for active streaks)
- **Opponents**: Array of fighter IDs defeated/defeated by during the streak

## Files

- `updateFighterStreaks.js` - Main script for updating streaks
- `verifyFighterStreaks.js` - Verification script to check streak data

## Usage

### Update All Fighter Streaks

```bash
cd server
node --env-file=../.env scripts/updateFighterStreaks.js
```

### Reset All Fighter Streaks

```bash
cd server
node --env-file=../.env scripts/updateFighterStreaks.js reset
```

### Verify Streak Data

```bash
cd server
node --env-file=../.env scripts/verifyFighterStreaks.js
```

## How It Works

1. **Chronological Processing**: Fights are processed in order by season → division → round → fight
2. **Streak Logic**: 
   - When a fighter wins: extends active win streak OR ends lose streak and starts new win streak
   - When a fighter loses: extends active lose streak OR ends win streak and starts new lose streak
3. **Database Update**: All fighter streak data is updated in the database

## Example Streak Data

```json
{
  "streaks": [
    {
      "competitionId": "507f1f77bcf86cd799439011",
      "type": "win",
      "start": { "season": 9, "division": 1, "round": 1 },
      "end": { "season": 9, "division": 1, "round": 3 },
      "count": 3,
      "active": false,
      "opponents": ["507f1f77bcf86cd799439022", "507f1f77bcf86cd799439023"]
    },
    {
      "competitionId": "507f1f77bcf86cd799439011",
      "type": "lose",
      "start": { "season": 9, "division": 1, "round": 4 },
      "end": null,
      "count": 1,
      "active": true,
      "opponents": ["507f1f77bcf86cd799439024"]
    }
  ]
}
```

## Integration for Future Seasons

When adding data for seasons 4-10 (or any new seasons), simply run the update script after importing the new fight data. The system will:

1. Process all existing fights chronologically
2. Update streak data for all fighters
3. Maintain consistency across all seasons

## Error Handling

- Skips fights with missing winner data
- Handles null fight objects gracefully
- Provides detailed logging for debugging
- Exits with appropriate error codes

## Performance

- Processes all 10 seasons with 53 fighters efficiently
- Uses in-memory tracking for optimal performance
- Batch updates to database for better performance
- Progress indicators for long-running operations
