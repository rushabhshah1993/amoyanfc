# Round Standings Calculator Utility

This utility provides functions for calculating and managing league standings with comprehensive tiebreaking logic.

## Overview

The standings calculator handles:
- Points calculation (3 points for win, 0 for loss)
- Head-to-head tiebreaking for fighters with equal points
- Alphabetical sorting as final tiebreaker
- Incremental standings updates after each fight
- Support for league-style competitions with divisions and rounds

## Core Functions

### `calculateRoundStandings()`

**Main function** to calculate standings after a fight completes.

```typescript
async function calculateRoundStandings(
  winnerId: string,
  loserId: string,
  fightId: string,
  competitionId: string,
  allFightsInDivision: Fight[],
  divisionFighters: string[],
  fightersData: Map<string, FighterData>,
  previousStandings?: FighterStanding[]
): Promise<RoundStandings>
```

**Parameters:**
- `winnerId`: MongoDB ObjectId of the winning fighter
- `loserId`: MongoDB ObjectId of the losing fighter
- `fightId`: Fight identifier string (e.g., "IFC-S1-D1-R1-F1")
- `competitionId`: MongoDB ObjectId of the competition
- `allFightsInDivision`: All fights in the current season/division
- `divisionFighters`: Array of all fighter IDs in this division
- `fightersData`: Map of fighter IDs to fighter data (needed for names)
- `previousStandings` (optional): Previous standings to build upon

**Returns:**
Complete `RoundStandings` object ready to be saved to database.

**Example Usage:**
```typescript
import { calculateRoundStandings } from './standingsCalculator';

// After a fight is completed
const standings = await calculateRoundStandings(
  "676d7452eb38b2b97c6da981", // Winner ID
  "676d740ceb38b2b97c6da97b", // Loser ID
  "IFC-S1-D1-R1-F3",           // Fight identifier
  "67780dcc09a4c4b25127f8f6", // Competition ID
  allFights,                    // All fights array
  divisionFighterIds,          // Fighter IDs in division
  fightersDataMap              // Fighter data map
);

// Save to database
await saveToDB(standings);
```

### `sortStandingsWithTiebreakers()`

Sorts fighters using the tiebreaking logic:

1. **Primary**: Total points (descending)
2. **Secondary**: Head-to-head points among tied fighters (descending)
3. **Tertiary**: First name alphabetically (ascending)

```typescript
function sortStandingsWithTiebreakers(
  standings: FighterStanding[],
  allFights: Fight[],
  fightersData: Map<string, FighterData>
): FighterStanding[]
```

**Tiebreaking Example:**

Scenario: Fighters A, B, C, D all have 3 points each.
- A beat B (3 h2h points)
- B beat C and D (6 h2h points)
- D beat A, B, C (9 h2h points)
- C beat none (0 h2h points)

**Result Order**: D (9), B (6), A (3), C (0)

### `parseFightIdentifier()`

Parses fight identifier strings into components.

```typescript
function parseFightIdentifier(fightIdentifier: string): ParsedFightId

// Example
const parsed = parseFightIdentifier("IFC-S1-D1-R1-F3");
// Returns: {
//   competition: "IFC",
//   seasonNumber: 1,
//   divisionNumber: 1,
//   roundNumber: 1,
//   fightNumber: 3
// }
```

### `getCompletedFightsUpToPoint()`

Gets all completed fights up to and including a specific fight.

```typescript
function getCompletedFightsUpToPoint(
  allFights: Fight[],
  upToFightIdentifier: string
): Fight[]

// Example: Get all completed fights up to Round 2, Fight 3
const completedFights = getCompletedFightsUpToPoint(
  allFights,
  "IFC-S1-D1-R2-F3"
);
```

### `initializeStandings()`

Creates initial standings for all fighters (all zeros).

```typescript
function initializeStandings(fighterIds: string[]): FighterStanding[]

// Example
const initialStandings = initializeStandings([
  "676d7452eb38b2b97c6da981",
  "676d740ceb38b2b97c6da97b",
  // ... more fighter IDs
]);
```

## Data Types

### `FighterStanding`
```typescript
interface FighterStanding {
  fighterId: string;          // MongoDB ObjectId
  fightsCount: number;         // Total fights in season
  wins: number;                // Total wins
  points: number;              // Total points (3 per win)
  rank: number;                // Current rank
  totalFightersCount: number;  // Total fighters in division
}
```

### `RoundStandings`
```typescript
interface RoundStandings {
  id?: string;                 // MongoDB ObjectId (optional)
  competitionId: string;       // Competition reference
  seasonNumber: number;        // Season number
  divisionNumber: number;      // Division number
  roundNumber: number;         // Round number
  fightId: string;             // Fight reference (MongoDB ObjectId)
  standings: FighterStanding[]; // Sorted standings array
  createdAt?: string;          // ISO timestamp
  updatedAt?: string;          // ISO timestamp
}
```

### `Fight`
```typescript
interface Fight {
  _id?: string;               // MongoDB ObjectId
  fighter1: string;           // First fighter ID
  fighter2: string;           // Second fighter ID
  winner?: string;            // Winner ID (if completed)
  fightIdentifier: string;    // Fight identifier (e.g., "IFC-S1-D1-R1-F1")
  fightStatus: string;        // "pending" | "completed"
}
```

### `FighterData`
```typescript
interface FighterData {
  _id: string;                // MongoDB ObjectId
  firstName: string;          // For alphabetical tiebreaker
  lastName: string;           // Additional info
}
```

## Integration with Redux

### Recommended Redux Setup

```typescript
// In your Redux store/slice
interface CompetitionState {
  currentCompetition: Competition;
  fighters: Map<string, FighterData>;
  currentStandings: RoundStandings;
  // ... other state
}

// Action to update standings after fight
export const updateStandingsAfterFight = createAsyncThunk(
  'competition/updateStandings',
  async (params: {
    winnerId: string;
    loserId: string;
    fightId: string;
  }, { getState }) => {
    const state = getState() as RootState;
    
    const standings = await calculateRoundStandings(
      params.winnerId,
      params.loserId,
      params.fightId,
      state.competition.currentCompetition._id,
      state.competition.allFights,
      state.competition.divisionFighters,
      state.competition.fighters,
      state.competition.currentStandings?.standings
    );
    
    return standings;
  }
);
```

## Complete Workflow Example

```typescript
// 1. Initialize when starting a new season
const divisionFighterIds = extractFighterIdsFromFights(divisionFights);
const initialStandings = initializeStandings(divisionFighterIds);

// 2. After each fight completes
const handleFightComplete = async (winnerId: string, loserId: string, fightId: string) => {
  // Calculate new standings
  const newStandings = await calculateRoundStandings(
    winnerId,
    loserId,
    fightId,
    competitionId,
    allDivisionFights,
    divisionFighterIds,
    fightersDataMap
  );
  
  // Save to database
  const response = await api.post('/round-standings', newStandings);
  
  // Update Redux store
  dispatch(setCurrentStandings(response.data));
  
  return newStandings;
};

// 3. Display in UI
const StandingsTable = () => {
  const standings = useSelector(state => state.competition.currentStandings);
  
  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Fighter</th>
          <th>Fights</th>
          <th>Wins</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {standings?.standings.map(s => (
          <tr key={s.fighterId}>
            <td>{s.rank}</td>
            <td>{getFighterName(s.fighterId)}</td>
            <td>{s.fightsCount}</td>
            <td>{s.wins}</td>
            <td>{s.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## Testing Tiebreaker Logic

```typescript
// Test case 1: Simple tie (no head-to-head)
// A and B both have 3 points, no fights between them
// Result: Alphabetical order (A before B if A's firstName < B's firstName)

// Test case 2: Head-to-head decides
// A, B, C all have 3 points
// B beat C
// Result: B, A, C (assuming A's name < C's name alphabetically)

// Test case 3: Complex head-to-head
// A, B, C, D all have 3 points
// A beat B (3 h2h)
// B beat C and D (6 h2h)
// D beat A, B, C (9 h2h)
// C beat none (0 h2h)
// Result: D, B, A, C
```

## Important Notes

1. **Head-to-head calculation**: Only counts fights between tied fighters, not all fights
2. **Alphabetical sorting**: Based on `firstName` field, case-insensitive
3. **Fight status**: Only `completed` fights with a `winner` are counted
4. **Season/Division scope**: Standings only consider fights within the same season and division
5. **Incremental updates**: Function recalculates from scratch using all completed fights (not truly incremental)

## Performance Considerations

- For divisions with many fighters (>20), consider caching fighter data
- The function recalculates all standings from scratch each time
- For real-time updates, use optimistic updates in Redux before API confirmation
- Consider memoization for expensive calculations with React.memo or useMemo

## Error Handling

```typescript
try {
  const standings = await calculateRoundStandings(/* ... */);
} catch (error) {
  if (error.message.includes('Invalid fight identifier')) {
    // Handle invalid fight ID format
  }
  // Handle other errors
}
```

## Future Enhancements

- [ ] Support for draws (1 point each)
- [ ] Support for bonus points
- [ ] Goal difference tiebreaker
- [ ] Performance optimization for large datasets
- [ ] Caching layer for repeated calculations

