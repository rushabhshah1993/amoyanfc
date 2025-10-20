# Global Rankings System Guide

## Overview
The Global Rankings system provides a comprehensive ranking of all fighters based on their overall performance across all competitions. Rankings are calculated at the end of each season (introduced in IFC Season 10).

---

## Ranking Formula

```
Score = (Win% ÷ 10) + 
        (League Titles × 5) + 
        (CC Titles × 4) + 
        (IC Titles × 4) + 
        (CC Appearances × 3) + 
        (IC Appearances × 2) + 
        (Div 1 Appearances × 1) + 
        (Div 2 Appearances × 0.75) + 
        (Div 3 Appearances × 0.5) + 
        ((Longest Win Streak ÷ 5) × 1)
```

### Component Breakdown

| Component | Weight | Description |
|-----------|--------|-------------|
| **Win Percentage** | ÷ 10 | Overall win rate across all competitions (e.g., 87.5% → 8.75 points) |
| **League Titles** | × 5 | Number of IFC division championships won |
| **CC Titles** | × 4 | Number of Champions' Cup titles won |
| **IC Titles** | × 4 | Number of Invicta Cup titles won |
| **CC Appearances** | × 3 | Number of seasons participated in Champions' Cup |
| **IC Appearances** | × 2 | Number of seasons participated in Invicta Cup |
| **Division 1 Apps** | × 1 | Number of seasons in Division 1 |
| **Division 2 Apps** | × 0.75 | Number of seasons in Division 2 |
| **Division 3 Apps** | × 0.5 | Number of seasons in Division 3 |
| **Longest Win Streak** | (÷ 5) × 1 | Longest consecutive win streak across all competitions |

### Why These Weights?

- **Win %**: Divided by 10 to balance with other metrics (87.5% = 8.75 points)
- **League Titles**: Highest weight (5) as they represent sustained excellence over an entire season
- **Cup Titles**: High weight (4) as they represent knockout tournament victories
- **Cup Appearances**: Rewards fighters who qualify for elite competitions
  - CC qualification requires top 3 in Div 1/2 or top 2 in Div 3
- **Division Appearances**: Rewards experience at different competitive levels
- **Win Streaks**: Captures peak performance periods (10 fight streak = 2 points)

---

## Data Structure

### GlobalRank Collection
```javascript
{
  _id: ObjectId,
  fighters: [
    {
      fighterId: ObjectId,
      score: Number,
      rank: Number,
      titles: [
        {
          competitionId: ObjectId,
          numberOfTitles: Number
        }
      ],
      cupAppearances: [
        {
          competitionId: ObjectId,
          appearances: Number
        }
      ],
      leagueAppearances: [
        {
          competitionId: ObjectId,
          divisionAppearances: [
            {
              division: Number,
              appearances: Number
            }
          ]
        }
      ]
    }
  ],
  isCurrent: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Fighter.globalRank Field
```javascript
{
  rank: Number,
  score: Number,
  globalRankId: ObjectId
}
```

---

## Scripts

### 1. Calculate Global Rankings
**File**: `calculate-global-rankings.js`

**Purpose**: Calculates global rankings for all fighters and stores them in the GlobalRank collection.

**Usage**:
```bash
node server/scripts/calculate-global-rankings.js
```

**What it does**:
1. Fetches all active fighters from the database
2. For each fighter:
   - Calculates overall win percentage
   - Counts titles (League, CC, IC)
   - Counts cup appearances
   - Counts division-wise league appearances
   - Finds longest win streak
3. Applies the ranking formula
4. Sorts fighters by score (descending)
5. Assigns ranks
6. Marks previous rankings as historical (`isCurrent: false`)
7. Saves new rankings to GlobalRank collection

**Output**:
- Displays top 10 rankings in console
- Shows breakdown of scores
- Saves to MongoDB

---

### 2. Update Fighter Global Ranks
**File**: `update-fighter-global-ranks.js`

**Purpose**: Updates each fighter's `globalRank` field with their current ranking data.

**Usage**:
```bash
node server/scripts/update-fighter-global-ranks.js
```

**What it does**:
1. Fetches current global rankings (where `isCurrent: true`)
2. For each fighter in rankings:
   - Updates their `globalRank` field with:
     - `rank`: Their position (1-53)
     - `score`: Their calculated score
     - `globalRankId`: Reference to GlobalRank document
3. Displays verification of top 5 fighters

**Note**: Must be run AFTER `calculate-global-rankings.js`

---

### 3. Verify Global Rankings
**File**: `verify-global-rankings.js`

**Purpose**: Displays current rankings and exports them to JSON for verification.

**Usage**:
```bash
node server/scripts/verify-global-rankings.js
```

**What it does**:
1. Fetches current global rankings
2. Displays top 20 in formatted table
3. Shows statistics (min/max/avg scores)
4. Exports full rankings to `backups/global-rankings-[timestamp].json`

**Output**:
- Console table with rankings
- JSON export file with fighter names and full data

---

## Competition IDs

These are the MongoDB ObjectIds for the main competitions:

```javascript
const COMPETITION_IDS = {
  IFC: '67780dcc09a4c4b25127f8f6',
  CHAMPIONS_CUP: '6778100309a4c4b25127f8fa',
  INVICTA_CUP: '6778103309a4c4b25127f8fc'
};
```

---

## Running the Full Process

### After Each Season

```bash
# Step 1: Calculate new rankings
node server/scripts/calculate-global-rankings.js

# Step 2: Update fighter records
node server/scripts/update-fighter-global-ranks.js

# Step 3: (Optional) Verify results
node server/scripts/verify-global-rankings.js
```

### Example Output

```
🏅 TOP 10 GLOBAL RANKINGS:
======================================================================
1. Unnati Vora                    Score: 85.75
   Win%: 87.5% | League Titles: 6 | CC Titles: 5 | IC Titles: 0
   CC Apps: 5 | IC Apps: 0 | Longest Streak: 15

2. Sayali Raut                    Score: 46.76
   Win%: 67.65% | League Titles: 2 | CC Titles: 0 | IC Titles: 2
   CC Apps: 2 | IC Apps: 2 | Longest Streak: 10
```

---

## GraphQL API

### Query Current Rankings

```graphql
query GetCurrentGlobalRank {
  getCurrentGlobalRank {
    id
    createdAt
    updatedAt
    isCurrent
    fighters {
      fighterId
      score
      rank
      titles {
        competitionId
        numberOfTitles
      }
      cupAppearances {
        competitionId
        appearances
      }
      leagueAppearances {
        competitionId
        divisionAppearances {
          division
          appearances
        }
      }
      fighter {
        id
        firstName
        lastName
        profileImage
        competitionHistory {
          competitionId
          totalFights
          totalWins
          totalLosses
          winPercentage
        }
        streaks {
          competitionId
          type
          count
        }
      }
    }
  }
}
```

---

## Frontend Integration

### Route
`/global-rankings`

### Components
- **Page**: `GlobalRankingsPage` (`frontend/src/pages/GlobalRankingsPage/`)
- **Component**: `GlobalRankings` (`frontend/src/components/GlobalRankings/`)

### Features
- Displays all fighters ranked by score
- Shows detailed breakdown:
  - Rank with medals for top 3
  - Fighter name and photo
  - Total score
  - Win percentage
  - Title counts (League, CC, IC)
  - Appearance counts (CC, IC, Divisions)
  - Longest win streak
- Clickable rows navigate to fighter details
- Apollo Client cache-first policy for instant loading
- Responsive design matching FighterPage aesthetic

### Navigation
- Trophy icon button in FightersPage header
- Direct link: `/global-rankings`

---

## Performance Optimizations

### Database
- **Batch queries**: Fetches all fighters in 1 query (not 53 separate queries)
- **No competition metadata**: Calculations use existing fighter data only
- **Indexes**: Fighter collection indexed on `_id` for fast lookups

### Frontend
- **Apollo Cache**: `cache-first` policy for instant subsequent loads
- **React.memo()**: Prevents unnecessary component re-renders
- **useMemo()**: Caches expensive calculations

### Result
- **First load**: ~1 second
- **Subsequent loads**: Instant (from cache)
- **Database queries**: Only 2 (GlobalRank + batch Fighter fetch)

---

## Example Score Calculation

### Unnati Vora (Rank #1)

**Statistics**:
- Win%: 87.5%
- League Titles: 6
- CC Titles: 5
- IC Titles: 0
- CC Appearances: 5
- IC Appearances: 0
- Division 1 Appearances: 9
- Division 2 Appearances: 0
- Division 3 Appearances: 0
- Longest Win Streak: 15

**Calculation**:
```
Score = (87.5 ÷ 10) + (6 × 5) + (5 × 4) + (0 × 4) + (5 × 3) + (0 × 2) + 
        (9 × 1) + (0 × 0.75) + (0 × 0.5) + ((15 ÷ 5) × 1)

Score = 8.75 + 30 + 20 + 0 + 15 + 0 + 9 + 0 + 0 + 3

Score = 85.75
```

---

## Maintenance

### Updating the Formula

If you need to change the formula weights:

1. Edit `server/scripts/calculate-global-rankings.js`
2. Modify the score calculation in `calculateGlobalScore()` function
3. Update the formula comment at the top of the file
4. Run the calculation script to regenerate rankings
5. Update this guide

### Adding New Metrics

To add a new component to the ranking:

1. **Backend**:
   - Add getter function in `calculate-global-rankings.js`
   - Include in score calculation
   - Update `breakdown` object

2. **Frontend**:
   - Add column to `GlobalRankings.tsx` table
   - Update `processedRankings` calculation
   - Add styling in `GlobalRankings.module.css`

3. **Documentation**:
   - Update formula in this guide
   - Update component breakdown table

---

## Troubleshooting

### Rankings not updating in frontend
- Clear Apollo Client cache
- Hard refresh browser (Cmd/Ctrl + Shift + R)
- Check if `isCurrent: true` in database

### Fighters missing from rankings
- Check if fighter is archived (`isArchived: true`)
- Verify fighter has competition history
- Run verification script to check data

### Slow query performance
- Ensure indexes exist on Fighter collection
- Check if using `cache-first` fetch policy
- Verify resolver uses batch queries (not N+1 queries)

---

## Future Enhancements

Potential improvements to consider:

1. **Historical Rankings**: View rankings from previous seasons
2. **Ranking Changes**: Show up/down arrows for rank changes
3. **Score Breakdown**: Expandable rows showing detailed score calculation
4. **Filters**: Filter by division, competition, or weight class
5. **Export**: Download rankings as PDF or CSV
6. **Animations**: Smooth transitions for rank changes
7. **Mobile Optimization**: Horizontal scroll improvements for mobile

---

## Version History

### v1.0 (IFC Season 10)
- Initial implementation
- Formula: `(Win% ÷ 10)` + weighted achievements
- 53 fighters ranked
- Real-time calculations from fighter data
- Frontend integration with elegant table UI

---

## Contact

For questions or issues with the global rankings system, please refer to the codebase or create an issue in the repository.

