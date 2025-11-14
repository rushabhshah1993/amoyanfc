# Standings Table Data Flow - Complete Explanation

## Example: IFC Season 7, Division 1, Round 6

This document explains step-by-step how the Standings Table in the DivisionPage component gets populated with data.

---

## TL;DR - Yes, You're Correct! ✅

**The standings table is populated fight by fight.** Each time a fight is completed, a new RoundStandings document is created showing the cumulative standings after that specific fight.

---

## Real Data Example: IFC S7, D1, R6

### Round 6 Structure
- **Total Fights in Round 6**: 5 fights
- **All fights completed**: ✅ Yes
- **RoundStandings documents created**: 5 (one per fight)

### Fight Progression

#### Fight 1: IFC-S7-D1-R6-F1
- **Winner**: Fighter 676d7613
- **Standings Document Created**: `S7-D1-R6-F1`
- **Top 3 After This Fight**:
  1. Fighter 676d7613... - 15 pts (5W, 6F)
  2. Fighter 676d7399... - 9 pts (3W, 5F)
  3. Fighter 676d6fa0... - 9 pts (3W, 5F)

#### Fight 2: IFC-S7-D1-R6-F2
- **Winner**: Fighter 676d6ecc
- **Standings Document Created**: `S7-D1-R6-F2`
- **Top 3 After This Fight**:
  1. Fighter 676d7613... - 15 pts (5W, 6F) *(unchanged)*
  2. Fighter 676d6ecc... - 12 pts (4W, 6F) *(moved up!)*
  3. Fighter 676d7399... - 9 pts (3W, 5F)

#### Fight 3: IFC-S7-D1-R6-F3
- **Winner**: Fighter 676d73dd
- **Standings Document Created**: `S7-D1-R6-F3`
- **Top 3**: Same as after Fight 2

#### Fight 4: IFC-S7-D1-R6-F4
- **Winner**: Fighter 676d721a
- **Standings Document Created**: `S7-D1-R6-F4`
- **Top 3**: Same as after Fight 3

#### Fight 5: IFC-S7-D1-R6-F5
- **Winner**: Fighter 676d7663
- **Standings Document Created**: `S7-D1-R6-F5`
- **Top 3 After This Fight**:
  1. Fighter 676d7613... - 15 pts (5W, 6F) *(unchanged)*
  2. Fighter 676d7663... - 12 pts (4W, 6F) *(moved up!)*
  3. Fighter 676d6ecc... - 12 pts (4W, 6F)

---

## Complete Data Flow Architecture

### 1. When a Fight is Completed

**Location**: `server/services/fight-result.service.js` → `applyFightResult()`

```javascript
// After updating fight result, fighter stats, etc.
await calculateAndSaveRoundStandings(
  competition, 
  fightIdentifier,  // e.g., "IFC-S7-D1-R6-F3"
  divisionNumber,    // 1
  roundNumber,       // 6
  competitionType,   // "league"
  session
);
```

### 2. Calculate Standings for ALL Fighters

**Location**: `server/services/fight-result.service.js` → `calculateAndSaveRoundStandings()`

The function:
1. **Gets all fighters** in the division (from `seasonMeta.leagueDivisions`)
2. **Gets all completed fights** in the division (across all rounds up to this point)
3. **Calculates stats for each fighter**:
   - `fightsCount`: Total fights fought
   - `wins`: Total wins
   - `points`: wins × 3 (3 points per win)
4. **Sorts with tiebreakers**:
   - Primary: Points (descending)
   - Tiebreaker: Head-to-head record
   - Further tie: Wins count
5. **Assigns ranks** (1, 2, 3, ...)

### 3. Save to RoundStandings Collection

**Database**: `RoundStandings` collection in MongoDB

```javascript
await RoundStandings.findOneAndUpdate(
  {
    competitionId: competition._id,
    seasonNumber: 7,
    divisionNumber: 1,
    roundNumber: 6,
    fightId: "IFC-S7-D1-R6-F3"  // Unique per fight!
  },
  {
    fightIdentifier: "S7-D1-R6-F3",
    standings: [
      { fighterId: "676d7613...", fightsCount: 6, wins: 5, points: 15, rank: 1, ... },
      { fighterId: "676d6ecc...", fightsCount: 6, wins: 4, points: 12, rank: 2, ... },
      // ... all 10 fighters
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { upsert: true, new: true, session }
);
```

**Key Point**: Each fight creates a **separate document** with:
- `fightIdentifier`: Unique ID (e.g., `S7-D1-R6-F3`)
- `standings`: Complete snapshot of ALL fighters' standings after this specific fight

---

## Frontend Display Logic

### 1. GraphQL Query

**Location**: `frontend/src/pages/DivisionPage/DivisionPage.tsx`

```typescript
const { data: standingsData, loading: standingsLoading } = useQuery(
  GET_ROUND_STANDINGS_BY_ROUND, 
  {
    variables: {
      competitionId: "67780dcc09a4c4b25127f8f6",
      seasonNumber: 7,
      divisionNumber: 1,
      roundNumber: 6,  // User selected round
    }
  }
);
```

### 2. Backend Resolver

**Location**: `server/resolvers/round-standings.resolver.js` → `getRoundStandingsByRound()`

```javascript
// Find the LAST fight of the round (highest fight number)
const standings = await RoundStandings.findOne({
  competitionId,
  seasonNumber: 7,
  divisionNumber: 1,
  roundNumber: 6
})
.sort({ fightIdentifier: -1 })  // Sort descending
.limit(1);                        // Get the last one
```

**What this returns for Round 6**: The standings document for `S7-D1-R6-F5` (the last fight)

### 3. Display in UI

**Location**: `frontend/src/pages/DivisionPage/DivisionPage.tsx` → `renderStandingsTable()`

```typescript
const standings = standingsData.getRoundStandingsByRound.standings;

// Displays:
// Rank 1: Fighter 676d7613 - 15 pts (5W, 6F)
// Rank 2: Fighter 676d7663 - 12 pts (4W, 6F)
// Rank 3: Fighter 676d6ecc - 12 pts (4W, 6F)
// ... (all 10 fighters)
```

---

## Why This Design?

### Advantages of Fight-by-Fight Standings

1. **Historical Accuracy**: We can see standings at ANY point in the season
   - "What were the standings after Fight 3 of Round 6?"
   - Just query: `fightIdentifier: "S7-D1-R6-F3"`

2. **Audit Trail**: Complete history of how standings evolved

3. **No Recalculation**: Standings are pre-calculated when fights complete
   - Frontend just displays the saved data
   - Fast queries, no complex calculations

4. **Fight Context**: Each standings document knows which fight it came after

### Disadvantages

1. **Storage**: More documents (5 per round vs 1 per round)
2. **Consistency**: Must ensure every fight creates a standings document

---

## Data Structure in MongoDB

### RoundStandings Document Schema

```javascript
{
  _id: ObjectId("..."),
  competitionId: ObjectId("67780dcc09a4c4b25127f8f6"),  // IFC
  seasonNumber: 7,
  divisionNumber: 1,
  roundNumber: 6,
  fightId: "IFC-S7-D1-R6-F5",      // Original identifier
  fightIdentifier: "S7-D1-R6-F5",  // Human-readable
  standings: [
    {
      fighterId: "676d7613eb38b2b97c6da9a9",
      fightsCount: 6,
      wins: 5,
      points: 15,
      rank: 1,
      totalFightersCount: 10
    },
    {
      fighterId: "676d7663eb38b2b97c6da9af",
      fightsCount: 6,
      wins: 4,
      points: 12,
      rank: 2,
      totalFightersCount: 10
    },
    // ... 8 more fighters
  ],
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Indexes for Performance

```javascript
// Composite index for queries
{ competitionId: 1, seasonNumber: 1, roundNumber: 1 }

// Unique index to prevent duplicates
{ fightIdentifier: 1 } [unique]

// Index for fighter lookups
{ "standings.fighterId": 1 }
```

---

## Cumulative Calculation Logic

### How Points Accumulate

**Example**: Fighter 676d7613 in IFC S7 D1

| After Fight | Round | Fights | Wins | Points | Rank |
|-------------|-------|--------|------|--------|------|
| R1-F1       | 1     | 1      | 1    | 3      | 2    |
| R2-F2       | 2     | 2      | 2    | 6      | 1    |
| R3-F3       | 3     | 3      | 2    | 6      | 2    |
| R4-F1       | 4     | 4      | 3    | 9      | 1    |
| R5-F5       | 5     | 5      | 4    | 12     | 1    |
| **R6-F5**   | **6** | **6**  | **5**| **15** | **1** |

**Key Point**: The system looks at ALL completed fights across ALL rounds up to the current fight, not just fights in the current round.

```javascript
// In calculateAndSaveRoundStandings()
const allFights = [];
division.rounds.forEach(round => {
  round.fights.forEach(fight => {
    if (fight.fightStatus === 'completed' || fight.winner) {
      allFights.push(fight);  // ALL completed fights
    }
  });
});

// Then calculate stats from ALL these fights
allFights.forEach(fight => {
  // Update fightsCount, wins, points for both fighters
});
```

---

## How the UI Shows Round-Specific Standings

### User Selects Round 6

1. **DivisionPage** queries: `roundNumber: 6`
2. **Backend** finds: Last fight of Round 6 → `S7-D1-R6-F5`
3. **Standings shown**: Cumulative standings after ALL fights up to and including R6-F5

### User Selects Round 3

1. **DivisionPage** queries: `roundNumber: 3`
2. **Backend** finds: Last fight of Round 3 → `S7-D1-R3-F5`
3. **Standings shown**: Cumulative standings after ALL fights up to and including R3-F5

**Important**: The standings always show cumulative results from Round 1 through the selected round, not just fights within that round.

---

## Summary

### ✅ Your Understanding is Correct!

1. **Fight-by-Fight**: Each completed fight generates a new RoundStandings document
2. **Cumulative**: Each standings document shows ALL fights completed up to that point
3. **Last Fight Wins**: The UI displays the standings from the last fight of the selected round
4. **All Fighters**: Every standings document includes ALL fighters in the division

### Data Flow Chain

```
Fight Completed 
  ↓
Calculate Standings (ALL completed fights, ALL fighters)
  ↓
Save RoundStandings Document (fightIdentifier = "S7-D1-R6-F3")
  ↓
User Selects Round 6
  ↓
Query: Get last fight of Round 6 (sorted desc, limit 1)
  ↓
Display: Show standings from "S7-D1-R6-F5" (last fight)
```

---

## Verification Query

To verify this for any season/division/round:

```javascript
// Check how many standings documents exist for a round
await RoundStandings.countDocuments({
  competitionId: "67780dcc09a4c4b25127f8f6",
  seasonNumber: 7,
  divisionNumber: 1,
  roundNumber: 6
});
// Returns: 5 (one per fight in the round)
```

---

**Last Updated**: November 8, 2025  
**Author**: AI Assistant (analyzing IFC Season 7 production data)

