# Fight Result Service - Implementation Guide

## Overview
This service prepares comprehensive MongoDB update payloads for fight results. It handles all 8 steps of the update process in a structured, organized manner to prevent data corruption.

### **Competition Type Support**
✅ **Works for BOTH League and Cup competitions:**

| **Update Type** | **League (IFL)** | **Cup (IC, CC)** |
|-----------------|------------------|------------------|
| Competition Update | ✅ Yes | ✅ Yes |
| Fighter Stats | ✅ Yes | ✅ Yes |
| Competition History | ✅ Yes | ✅ Yes |
| Opponents History | ✅ Yes | ✅ Yes |
| Debut Information | ✅ Yes | ✅ Yes |
| Streaks | ✅ Yes | ✅ Yes |
| Fight Stats | ✅ Yes | ✅ Yes |
| **Season Details** | ✅ Yes | ❌ No (cup-specific) |
| **Round Standings** | ✅ Yes | ❌ No (no divisions) |
| **Bracket Progression** | ❌ No | ✅ Yes (automatic) |
| **IC Creation** | ✅ Yes (at 25%) | ❌ No |
| **CC Creation** | ✅ Yes (at 100%) | ❌ No |

The service automatically detects competition type and applies the correct updates.

---

## 📁 Files Created

### 1. **`frontend/src/services/fightResultService.ts`**
Core service containing all data preparation logic.

---

## 🔄 Data Flow

```
User Action (Simulate/Choose Winner)
    ↓
Prepare ChatGPT Input Payload
    ↓
Send to ChatGPT API (TODO)
    ↓
Receive ChatGPT Response
    ↓
prepareFightResultPayload()
    ↓
MongoDB Update Payload
    ↓
Backend API (TODO)
    ↓
MongoDB Transaction (Rollback on Failure)
```

---

## 📦 ChatGPT Response Structure

```typescript
{
  winner: string,              // Fighter MongoDB ID
  date: string,                // ISO timestamp
  userDescription?: string,    // If user provided (manual winner selection)
  genAIDescription: string,    // AI-generated description
  isSimulated: boolean,        // true = AI simulated, false = user chose winner
  fighterStats: [
    {
      fighterId: string,
      stats: {
        fightTime: number,
        finishingMove: string | null,
        grappling: { accuracy: number, defence: number },
        significantStrikes: { ... },
        strikeMap: { head, torso, leg: { absorb, strike } },
        submissions: { ... },
        takedowns: { ... }
      }
    }
  ]
}
```

---

## 🛠️ MongoDB Update Steps

### **Step 1-2: Competition Fight Update**
Updates the fight document in the competition's season/division/round:
- `winner`
- `date` (current timestamp)
- `userDescription`
- `genAIDescription`
- `isSimulated`
- `fighterStats`

### **Step 3: Competition History Update** (Both Fighters)
Updates `competitionHistory` for each fighter:
- `totalFights` (+1)
- `totalWins` (if winner +1)
- `totalLosses` (if loser +1)
- `winPercentage` (recalculated)
- Creates new entry if competition doesn't exist

### **Step 4: Season Details Update** (Both Fighters)
Updates `seasonDetails` for each fighter:
- `fights` (+1)
- `wins` (if winner +1)
- `losses` (if loser +1)
- `points` (+3 if winner, +0 if loser)
- `winPercentage` (recalculated)
- Creates new entry if season/division doesn't exist

### **Step 5-6: Opponents History Update** (Both Fighters)
Updates `opponentsHistory` for each fighter:
- `totalFights` (+1)
- `totalWins` (if winner +1)
- `totalLosses` (if loser +1)
- `winPercentage` (recalculated)
- Adds new `details` entry:
  ```typescript
  {
    competitionId: string,
    season: number,
    divisionId: number,
    roundId: number,
    fightId: string,
    isWinner: boolean,
    date: string
  }
  ```
- Creates new opponent entry if doesn't exist

### **Step 7A: Debut Information Update** (Both Fighters - If Needed)
Checks if `debutInformation` is empty or doesn't exist:
- If empty/missing: Adds first fight information:
  ```typescript
  {
    competitionId: string,
    season: number,
    fightId: string,
    dateOfDebut: string  // ISO timestamp
  }
  ```
- If already exists: No update (returns null)

### **Step 7B: Streaks Update** (Both Fighters)
Updates or creates fighter streaks based on fight result:

**Case 1: No Active Streak**
- Creates new streak with:
  - `type`: 'win' or 'lose' (based on result)
  - `start`: { season, division, round }
  - `end`: { season, division, round }
  - `count`: 1
  - `active`: true
  - `opponents`: [opponentId]

**Case 2: Active Streak Continues** (same type as result)
- Updates existing streak:
  - `count` (+1)
  - `end`: Updated to current fight
  - `opponents`: Adds new opponentId to array

**Case 3: Active Streak Breaks** (different type than result)
- **Ends current streak:**
  - Sets `active`: false
  - Keeps `end` as is (last fight of that streak)
- **Creates new streak:**
  - Same structure as Case 1

**Return Format:**
```typescript
{
  action: 'create' | 'continue' | 'break',
  // If continue:
  streakId: string,
  updates: { count, end, opponents },
  // If break:
  endStreak: { streakId, updates: { end, active: false } },
  newStreak: { ... },
  // If create:
  newStreak: { ... }
}
```

### **Step 7C: Fight Stats Update** (Both Fighters)
Updates `fightStats` (top-level property):
- `fightsCount` (+1) - **New property for accurate averaging**
- `finishingMoves[]` - Adds new move if not already in array
- **All other metrics are AVERAGED** with existing stats:
  - `grappling.accuracy`, `grappling.defence`
  - `significantStrikes.*` (all fields)
  - `strikeMap.*` (all body parts)
  - `submissions.*`
  - `takedowns.*`

**Averaging Formula:**
```typescript
newAverage = ((currentValue × currentCount) + newValue) / (currentCount + 1)
```

---

## 📤 Final MongoDB Payload Structure

```typescript
{
  fightId: string,
  competitionId: string,
  seasonNumber: number,
  divisionNumber: number,
  roundNumber: number,
  timestamp: string,              // ISO format
  chatGPTResponse: { ... },       // Full ChatGPT response
  competitionUpdate: {            // Steps 1-2
    winner: string,
    date: string,
    userDescription: string | null,
    genAIDescription: string,
    isSimulated: boolean,
    fighterStats: Array<...>
  },
  fighter1Updates: {              // Steps 3-7 + Debut + Streaks for Fighter 1
    fighterId: string,
    competitionHistoryUpdate: { ... },
    seasonDetailsUpdate: { ... },
    opponentsHistoryUpdate: { ... },
    debutInformationUpdate: { ... } | null,
    streaksUpdate: {
      action: 'create' | 'continue' | 'break',
      ...
    },
    fightStatsUpdate: { ... }
  },
  fighter2Updates: {              // Steps 3-7 + Debut + Streaks for Fighter 2
    fighterId: string,
    competitionHistoryUpdate: { ... },
    seasonDetailsUpdate: { ... },
    opponentsHistoryUpdate: { ... },
    debutInformationUpdate: { ... } | null,
    streaksUpdate: {
      action: 'create' | 'continue' | 'break',
      ...
    },
    fightStatsUpdate: { ... }
  },
  roundStandingsUpdate: {         // Current standings after this fight
    competitionId: string,
    seasonNumber: number,
    divisionNumber: number,
    roundNumber: number,
    fightId: string,
    fightIdentifier: string,
    standings: Array<{
      fighterId: string,
      fightsCount: number,
      wins: number,
      points: number,
      rank: number,
      totalFightersCount: number
    }>
  } | null,
  seasonCompletionStatus: {       // Automatic season completion check
    isSeasonCompleted: boolean,
    competitionType: 'league' | 'cup',
    divisionStatuses?: Array<...>,
    seasonNumber: number,
    competitionId: string
  },
  seasonMetaUpdate?: {            // Season lifecycle updates (conditional)
    isActive?: boolean,           // Set to false when season ends
    endDate?: string,             // Timestamp when season ends
    createdAt?: string            // Timestamp of first fight (when season starts)
  }
}
```

---

## 🔧 Functions in Service

### **Helper Functions:**
1. `prepareCompetitionUpdate()` - Steps 1-2
2. `prepareCompetitionHistoryUpdate()` - Step 3
3. `prepareSeasonDetailsUpdate()` - Step 4
4. `prepareOpponentsHistoryUpdate()` - Steps 5-6
5. `prepareDebutInformationUpdate()` - Step 7A
6. `prepareStreaksUpdate()` - Step 7B
7. `prepareFightStatsUpdate()` - Step 7C
8. `prepareFighterUpdates()` - Combines Steps 3-7C for one fighter
9. `prepareRoundStandingsUpdate()` - Calculates round standings after fight
10. `checkSeasonCompletion()` - Checks if season has ended
11. `prepareDivisionWinnersUpdate()` - Determines division winners when season completes
12. `prepareDivisionWinnersTitleUpdates()` - Prepares title updates for league division winners
13. `checkAndCreateICSeasonIfNeeded()` - Creates IC season at 25% league completion
14. `checkAndCreateCCSeasonIfNeeded()` - Creates CC season at 100% league completion
15. `prepareCupBracketProgression()` - Handles cup tournament bracket progression (IC & CC)
16. `getUpcomingFights()` - Gets next scheduled fights from all active competitions (for homepage)

### **Main Exports:**

#### **1. prepareFightResultPayload()**
```typescript
prepareFightResultPayload(
  fightId: string,
  competitionId: string,
  seasonNumber: number,
  divisionNumber: number,
  roundNumber: number,
  fighter1: any,
  fighter2: any,
  competition: any,
  chatGPTResponse: ChatGPTResponse
): FightResultPayload
```
Prepares the complete MongoDB update payload after receiving ChatGPT response. Automatically includes season completion check in the returned payload.

#### **2. checkSeasonCompletion()**
```typescript
checkSeasonCompletion(
  competitionData: any
): {
  isSeasonCompleted: boolean,
  competitionType?: 'league' | 'cup',
  divisionStatuses?: Array<{
    divisionNumber: number,
    totalRounds: number,
    lastRound: number,
    totalFights: number,
    completedFights: number,
    isCompleted: boolean
  }>,
  seasonNumber?: number,
  competitionId?: string,
  roundNumber?: number,  // For cup competitions
  reason?: string
}
```
Checks if a season has ended by verifying all fights in the last round of every division (for leagues) or final round (for cups) are completed.

**League Logic:**
- Checks EVERY division in the league
- For each division, finds the last round (based on `totalRounds`)
- Verifies ALL fights in that round have `fightStatus === 'completed'` or `winner !== null`
- Season is complete only if ALL divisions are complete

**Cup Logic:**
- Checks the final round (last item in rounds array)
- Verifies all fights in that round are completed
- Season is complete when final round is complete

#### **3. prepareRoundStandingsUpdate()**
```typescript
prepareRoundStandingsUpdate(
  competitionData: any,
  fightId: string,
  competitionId: string,
  seasonNumber: number,
  divisionNumber: number,
  roundNumber: number,
  divisionFighters: string[]
): {
  competitionId: string,
  seasonNumber: number,
  divisionNumber: number,
  roundNumber: number,
  fightId: string,
  fightIdentifier: string,
  standings: Array<{
    fighterId: string,
    fightsCount: number,
    wins: number,
    points: number,
    rank: number,
    totalFightersCount: number
  }>
} | null
```

**When to use:**
- Called automatically within `prepareFightResultPayload()` after EVERY fight result
- Calculates the current standings for the division after the fight completes

**What it does:**
- Finds all completed fights in the division up to this point
- Calculates points for each fighter (3 points per win)
- Applies sophisticated tiebreaking logic:
  1. **Primary:** Total points (descending)
  2. **Tiebreaker 1:** Head-to-head points among tied fighters (descending)
  3. **Tiebreaker 2:** Alphabetical by fighter ID (ascending)
- Assigns ranks based on sorted order
- Returns complete standings snapshot

**Head-to-Head Tiebreaker:**
When fighters have the same points:
1. Find all completed fights between the tied fighters
2. Award 3 points for each head-to-head win
3. Sort by these head-to-head points
4. If still tied, use alphabetical order

**Example:**
```
Fighter A: 15 points (5 wins)
Fighter B: 15 points (5 wins)  ← Tied with A
Fighter C: 12 points (4 wins)

Head-to-head between A and B:
- Fight 1: A beat B → A gets 3 h2h points
- Fight 2: A beat B → A gets 3 more h2h points

Final rankings:
1. Fighter A (15 pts, 6 h2h pts) 🏆
2. Fighter B (15 pts, 0 h2h pts)
3. Fighter C (12 pts)
```

**Important:**
- This is the SAME logic used in the migration scripts (`calculate-season10-standings.js`)
- Ensures consistency with historical standings data
- Backend should save this to the `RoundStandings` collection

#### **4. checkAndCreateICSeasonIfNeeded()**
```typescript
checkAndCreateICSeasonIfNeeded(
  competitionData: any,
  leagueCompetitionId: string,
  leagueSeasonNumber: number
): Promise<{
  success: boolean,
  icSeasonData: any,
  seasonNumber: number,
  participants: string[],
  fights: Array<...>,
  linkedLeagueSeason: {
    competitionId: string,
    seasonNumber: number
  }
} | null>
```

**When to use:**
- Called automatically after EVERY fight result (commented for now)
- Checks if league season has reached exactly 25% completion
- Creates new IC (Invicta Cup) season if threshold is met

**What it does:**
1. **Checks 25% Completion:**
   - Calculates: `(completed fights) / (total fights) * 100`
   - Must be exactly 25% (±0.5% tolerance)
   - Skips if <25% or >25%

2. **Prevents Duplicates:**
   - Queries MongoDB for existing IC seasons linked to this league season
   - Skips if IC season already exists

3. **Selects 8 Fighters:**
   - Gets previous IC champion (from IC S4 for IFL S1)
   - Selects 7 random fighters from current league season
   - **Ensures at least 1 fighter from EACH division**
   - Excludes previous champion from random selection

4. **Creates Random Pairings:**
   - Shuffles all 8 fighters
   - Creates 4 fights for Round 1 (Quarter-finals)
   - All fights have `fightStatus: 'scheduled'`
   - Fight identifiers: `IC-S5-R1-F1`, `IC-S5-R1-F2`, etc.

5. **Generates IC Season Structure:**
   - New competition document
   - `seasonMeta.cupParticipants.fighters` = 8 fighters
   - `cupData.fights` = 4 scheduled fights
   - `linkedLeagueSeason` = links back to source league
   - `config.cupConfiguration` = knockout tournament config

6. **Saves to MongoDB:**
   - Currently commented out
   - Console logs the structure for review
   - Will be uncommented after MongoDB integration

**Fighter Selection Logic:**
```javascript
// Step 1: Previous IC champion is auto-included
participants = [previousChampion]

// Step 2: Select 1 fighter from each division (random)
Division 1: Random selection → Fighter A
Division 2: Random selection → Fighter B
Division 3: Random selection → Fighter C

// Step 3: Fill remaining spots randomly from all divisions
Remaining pool: All fighters except champion and selected 3
Random selection: Fighters D, E, F, G

// Final: 8 fighters (1 champion + 3 from divisions + 4 random)
```

**Example Console Output:**
```
🔍 Checking if IC Season should be created...
   📊 Completion: 27/108 fights (25.00%)
✅ Exactly at 25% completion! Checking if IC season should be created...
📝 Creating new IC season...
   👥 Total league fighters: 18
   👑 Previous IC champion: PREVIOUS_...
   ✓ Division 1: Selected 676d6ecc...
   ✓ Division 2: Selected 676d7631...
   ✓ Division 3: Selected 676d8542...
   ✓ Random: Selected 676d9753...
   ✓ Random: Selected 676da864...
   ✓ Random: Selected 676db975...
   ✓ Random: Selected 676dc086...
   ✅ Selected 8 fighters for IC season
   🥊 Fight 1: 676d6ecc... vs 676d7631...
   🥊 Fight 2: 676d8542... vs 676d9753...
   🥊 Fight 3: 676da864... vs 676db975...
   🥊 Fight 4: 676dc086... vs PREVIOUS_...

✨ IC Season created successfully!
   🏆 Season: IC S5
   👥 Participants: 8 fighters
   🥊 Round 1 Fights: 4 (all scheduled)
   🔗 Linked to: League Competition ... S1
```

**MongoDB Structure Created:**
```json
{
  "competitionMetaId": "...",
  "isActive": true,
  "seasonMeta": {
    "seasonNumber": 5,
    "cupParticipants": {
      "fighters": ["fighter1", "fighter2", ..., "fighter8"]
    }
  },
  "cupData": {
    "fights": [
      {
        "fighter1": "...",
        "fighter2": "...",
        "fightIdentifier": "IC-S5-R1-F1",
        "fightStatus": "scheduled",
        ...
      }
    ],
    "currentStage": "Quarter-finals"
  },
  "linkedLeagueSeason": {
    "competitionId": "...",
    "seasonNumber": 1
  }
}
```

**Important:**
- Only triggers at EXACTLY 25% completion
- Ensures diversity with at least 1 fighter per division
- Previous champion is guaranteed a spot
- Currently logs to console (MongoDB save commented out)
- Will query real data once MongoDB integration is complete

#### **5. prepareDivisionWinnersUpdate()**
```typescript
prepareDivisionWinnersUpdate(
  competitionData: any,
  finalStandingsData: Array<{
    divisionNumber: number,
    standings: Array<{
      fighterId: string,
      fightsCount: number,
      wins: number,
      points: number,
      rank: number,
      totalFightersCount: number
    }>
  }>
): {
  competitionId: string,
  seasonNumber: number,
  divisionWinners: Array<{
    divisionNumber: number,
    winners: string[]
  }>,
  updateType: string
} | null
```

**When to use:**
- Call this AFTER confirming `isSeasonCompleted === true`
- Requires standings data from `GET_FINAL_SEASON_STANDINGS` GraphQL query for each division
- Backend should query final standings for all divisions, then call this function

**What it does:**
- Takes final standings data for all divisions
- Identifies the fighter(s) with rank 1 in each division
- Supports ties (multiple fighters with rank 1)
- Returns structure to update `seasonMeta.leagueDivisions[].winners` in MongoDB

**Important:**
- Only works for league competitions (not cups)
- Returns `null` for non-league competitions
- Handles ties gracefully by including all rank 1 fighters

#### **6. prepareDivisionWinnersTitleUpdates()**
```typescript
prepareDivisionWinnersTitleUpdates(
  competitionData: any,
  seasonNumber: number,
  divisionWinnersData: {
    competitionId: string,
    seasonNumber: number,
    divisionWinners: Array<{
      divisionNumber: number,
      winners: string[]
    }>,
    updateType: string
  },
  winnerFightersData: Array<any>
): {
  titleUpdates: Array<{
    fighterId: string,
    fighterName: string,
    divisionNumber: number,
    competitionId: string,
    titleUpdate: {
      totalTitles: number,
      newTitleDetail: {
        competitionSeasonId: string,
        seasonNumber: number,
        divisionNumber: number
      }
    }
  }>
} | null
```

**When to use:**
- Called when league season is 100% complete AND after division winners are determined
- Requires output from `prepareDivisionWinnersUpdate()`
- Backend must query full fighter documents for all division winners
- Should be called BEFORE MongoDB updates to minimize requests

**What it does:**
1. **Processes Each Division Winner:**
   - Iterates through all divisions and their winners
   - Finds each winner's `competitionHistory` entry for this competition

2. **Checks Existing Titles:**
   - Looks for existing `titles` object in competitionHistory
   - Checks if `totalTitles > 0`

3. **Prepares Title Update:**
   - **If titles exist:** Increments `totalTitles` by 1
   - **If no titles:** Creates new titles object with `totalTitles: 1`
   - Adds new title detail with `competitionSeasonId`, `seasonNumber`, and `divisionNumber`

4. **Returns Batch Update:**
   - All title updates in a single array
   - Allows backend to update all winners in one transaction

**Schema Update:**
```json
{
  "competitionHistory": [
    {
      "competitionId": "67780dcc09a4c4b25127f8f6",
      "titles": {
        "totalTitles": 2,
        "details": [
          {
            "competitionSeasonId": "68f0065f8cf32f1236924acf",
            "seasonNumber": 1,
            "divisionNumber": 1
          },
          {
            "competitionSeasonId": "68f0065f8cf32f1236924ad0",
            "seasonNumber": 2,
            "divisionNumber": 1
          }
        ]
      }
    }
  ]
}
```

**Console Output Example:**
```
🏆 Preparing Title Updates for Division Winners...
   ✓ Division 1 - Sayali Raut: 1 → 2 titles
   ✨ Division 2 - Marina Silva: First title!
   ✓ Division 3 - Lina Chen: 0 → 1 titles
✅ Prepared title updates for 3 division winner(s)
```

**Backend Implementation:**
```javascript
const { titleUpdates } = prepareDivisionWinnersTitleUpdates(...);

for (const update of titleUpdates) {
  const existingTitles = // query existing titles for fighter
  
  if (existingTitles && existingTitles.totalTitles > 0) {
    // Increment existing
    await Fighter.updateOne(
      { 
        _id: update.fighterId,
        'competitionHistory.competitionId': update.competitionId 
      },
      {
        $set: {
          'competitionHistory.$.titles.totalTitles': update.titleUpdate.totalTitles
        },
        $push: {
          'competitionHistory.$.titles.details': update.titleUpdate.newTitleDetail
        }
      }
    );
  } else {
    // Create new
    await Fighter.updateOne(
      { 
        _id: update.fighterId,
        'competitionHistory.competitionId': update.competitionId 
      },
      {
        $set: {
          'competitionHistory.$.titles': {
            totalTitles: 1,
            details: [update.titleUpdate.newTitleDetail]
          }
        }
      }
    );
  }
}
```

**Important:**
- Only for league competitions (divisions)
- Cup competitions use `prepareTitleUpdate()` internally in `prepareCupBracketProgression()`
- Includes `divisionNumber` in title details (unlike cup titles)
- Should be called in the same transaction as division winners update
- Validates that fighter's competitionHistory exists before updating

#### **7. checkAndCreateCCSeasonIfNeeded()**
```typescript
checkAndCreateCCSeasonIfNeeded(
  competitionData: any,
  leagueCompetitionId: string,
  leagueSeasonNumber: number,
  finalStandingsData: Array<{
    divisionNumber: number,
    standings: Array<{
      fighterId: string,
      fightsCount: number,
      wins: number,
      points: number,
      rank: number,
      totalFightersCount: number
    }>
  }>
): Promise<{
  success: boolean,
  ccSeasonData: any,
  seasonNumber: number,
  participants: string[],
  fights: Array<...>,
  linkedLeagueSeason: {
    competitionId: string,
    seasonNumber: number
  }
} | null>
```

**When to use:**
- Called when league season is 100% complete (`isSeasonCompleted === true`)
- Requires final standings data from all divisions
- Backend should call this AFTER `prepareDivisionWinnersUpdate()`

**What it does:**
1. **Checks Duplicate:**
   - Queries MongoDB for existing CC seasons linked to this league season
   - Skips if CC season already exists

2. **Selects Top-Ranked Fighters (8 total):**
   - **Division 1**: Top 3 fighters (ranks 1, 2, 3)
   - **Division 2**: Top 3 fighters (ranks 1, 2, 3)
   - **Division 3**: Top 2 fighters (ranks 1, 2)
   - Uses final round standings (with head-to-head tiebreakers already applied)

3. **Creates Random Pairings:**
   - Shuffles all 8 fighters
   - Creates 4 fights for Round 1 (Quarter-finals)
   - All fights have `fightStatus: 'scheduled'`
   - Fight identifiers: `CC-S3-R1-F1`, `CC-S3-R1-F2`, etc.

4. **Generates CC Season Structure:**
   - New competition document
   - `seasonMeta.cupParticipants.fighters` = 8 fighters
   - `cupData.fights` = 4 scheduled fights
   - `linkedLeagueSeason` = links back to source league
   - `config.cupConfiguration` = knockout tournament config

5. **Saves to MongoDB:**
   - Currently commented out
   - Console logs the structure for review
   - Will be uncommented after MongoDB integration

**Fighter Selection Logic:**
```javascript
// From final standings (already sorted with tiebreakers)

Division 1 standings: [Fighter A (rank 1), Fighter B (rank 2), Fighter C (rank 3), ...]
→ Select: Fighter A, Fighter B, Fighter C

Division 2 standings: [Fighter D (rank 1), Fighter E (rank 2), Fighter F (rank 3), ...]
→ Select: Fighter D, Fighter E, Fighter F

Division 3 standings: [Fighter G (rank 1), Fighter H (rank 2), ...]
→ Select: Fighter G, Fighter H

CC Participants: [A, B, C, D, E, F, G, H]
```

**Example Console Output:**
```
🏆 Checking if CC Season should be created...
📝 Creating new CC season from league champions...
   🥇 Division 1 - Top 3: 676d6ecc..., 676d7631..., 676d8542...
   🥈 Division 2 - Top 3: 676d9753..., 676da864..., 676db975...
   🥉 Division 3 - Top 2: 676dc086..., 676dd197...
   ✅ Selected 8 fighters for CC season
   🥊 Fight 1: 676d6ecc... vs 676d9753...
   🥊 Fight 2: 676d7631... vs 676da864...
   🥊 Fight 3: 676d8542... vs 676db975...
   🥊 Fight 4: 676dc086... vs 676dd197...

✨ CC Season created successfully!
   🏆 Season: CC S3
   👥 Participants: 8 fighters (top-ranked from league)
   🥊 Round 1 Fights: 4 (all scheduled)
   🔗 Linked to: League Competition ... S1
```

**MongoDB Structure Created:**
```json
{
  "competitionMetaId": "...",
  "isActive": true,
  "seasonMeta": {
    "seasonNumber": 3,
    "cupParticipants": {
      "fighters": [
        "fighter_a",  // Division 1 - Rank 1
        "fighter_b",  // Division 1 - Rank 2
        "fighter_c",  // Division 1 - Rank 3
        "fighter_d",  // Division 2 - Rank 1
        "fighter_e",  // Division 2 - Rank 2
        "fighter_f",  // Division 2 - Rank 3
        "fighter_g",  // Division 3 - Rank 1
        "fighter_h"   // Division 3 - Rank 2
      ]
    }
  },
  "cupData": {
    "fights": [
      {
        "fighter1": "...",
        "fighter2": "...",
        "fightIdentifier": "CC-S3-R1-F1",
        "fightStatus": "scheduled",
        ...
      }
    ],
    "currentStage": "Quarter-finals"
  },
  "linkedLeagueSeason": {
    "competitionId": "...",
    "seasonNumber": 1
  }
}
```

**Important:**
- Only triggers when league season is 100% complete
- Selection is based on final rankings (no randomness except pairings)
- Champions Cup represents the "best of the best" from the league
- Currently logs to console (MongoDB save commented out)
- Will query real data once MongoDB integration is complete

#### **8. prepareCupBracketProgression()**
```typescript
prepareCupBracketProgression(
  competition: any,
  completedFightIdentifier: string,
  winnerId: string
): {
  updateType: 'final' | 'update_existing' | 'create_new',
  seasonWinnerUpdate?: { winner: string },
  nextFightUpdate?: { fightIdentifier: string, fighter1?: string, fighter2?: string },
  newFight?: { ... }
}
```

**When to use:**
- Called automatically for EVERY cup competition fight result
- Handles bracket progression for IC and CC tournaments
- Updates next round fights with winners
- Sets season winner when final completes

**What it does:**

1. **Parses Fight Identifier:**
   - Extracts: competition code (IC/CC), season, round, fight number
   - Example: `IC-S5-R1-F1` → IC, Season 5, Round 1, Fight 1

2. **Determines Next Round Logic:**
   - **Round 1 (Quarter-finals) → Round 2 (Semi-finals):**
     - F1 winner → SF-F1 as fighter1
     - F2 winner → SF-F1 as fighter2
     - F3 winner → SF-F2 as fighter1
     - F4 winner → SF-F2 as fighter2
   
   - **Round 2 (Semi-finals) → Round 3 (Finals):**
     - SF-F1 winner → Final-F1 as fighter1
     - SF-F2 winner → Final-F1 as fighter2
   
   - **Round 3 (Finals):**
     - Updates `seasonMeta.winners` with champion

3. **Three Update Types:**

   **a) `final` - When final fight completes:**
   ```json
   {
     "updateType": "final",
     "seasonWinnerUpdate": {
       "winner": "676d6ecceb38b2b97c6da945"
     }
   }
   ```

   **b) `update_existing` - Next fight already exists:**
   ```json
   {
     "updateType": "update_existing",
     "nextFightUpdate": {
       "fightIdentifier": "IC-S5-R2-F1",
       "fighter1": "676d6ecceb38b2b97c6da945"
     }
   }
   ```

   **c) `create_new` - Next fight needs to be created:**
   ```json
   {
     "updateType": "create_new",
     "newFight": {
       "fighter1": "676d6ecceb38b2b97c6da945",
       "fighter2": null,
       "winner": null,
       "fightIdentifier": "IC-S5-R2-F1",
       "date": null,
       "fightStatus": "scheduled",
       ...
     }
   }
   ```

**Bracket Progression Example:**

```
ROUND 1 (Quarter-finals):
IC-S5-R1-F1: Fighter A beats Fighter B
IC-S5-R1-F2: Fighter C beats Fighter D
IC-S5-R1-F3: Fighter E beats Fighter F
IC-S5-R1-F4: Fighter G beats Fighter H

↓ Creates/Updates ↓

ROUND 2 (Semi-finals):
IC-S5-R2-F1: Fighter A vs Fighter C (scheduled)
IC-S5-R2-F2: Fighter E vs Fighter G (scheduled)

↓ After R2 fights complete ↓

ROUND 3 (Finals):
IC-S5-R3-F1: Winner of R2-F1 vs Winner of R2-F2 (scheduled)

↓ After Final completes ↓

seasonMeta.winners = [Champion ID]
```

**Console Output Example:**
```
🏆 Processing Cup Bracket Progression...
   Fight: IC-S5-R1-F1
   Winner: 676d6ecc...
   📊 Round 1, Fight 1
   ➡️  Winner advances to: IC-S5-R2-F1 as Fighter 1
   ✨ Creating new fight for next round
```

**Important:**
- Automatically called for ALL cup fights (IC & CC)
- Uses odd/even logic: odd fight numbers (1, 3) → fighter1 slot, even (2, 4) → fighter2 slot
- Backend must handle all three update types appropriately
- Final winner updates `seasonMeta.winners` (single champion for cups)
- **Champion Title Update**: When final completes, also updates champion's `competitionHistory.titles`

**Title Update on Final:**
When the final fight completes, the payload includes `championTitleUpdate`:

```json
{
  "updateType": "final",
  "seasonWinnerUpdate": {
    "winner": "676d6ecceb38b2b97c6da945"
  },
  "championTitleUpdate": {
    "competitionId": "67780dcc09a4c4b25127f8f6",
    "titleUpdate": {
      "totalTitles": 2,
      "newTitleDetail": {
        "competitionSeasonId": "68f0065f8cf32f1236924acf",
        "seasonNumber": 5
      }
    }
  }
}
```

**Backend Must Update:**
1. `seasonMeta.winners = [championId]`
2. Find champion's `competitionHistory` entry for this competition
3. If `titles` exists: increment `totalTitles`, push to `details` array
4. If `titles` doesn't exist or is empty: create new titles object

```javascript
// Backend implementation
await Fighter.updateOne(
  { 
    _id: championId,
    'competitionHistory.competitionId': competitionId 
  },
  {
    $set: {
      'competitionHistory.$.titles.totalTitles': titleUpdate.totalTitles
    },
    $push: {
      'competitionHistory.$.titles.details': titleUpdate.newTitleDetail
    }
  }
);
```

---

## 🧪 Testing

### **Current Implementation:**
Both `Simulate Fight` and `Choose Winner` now:
1. Generate mock ChatGPT responses
2. Prepare complete MongoDB payload
3. Log everything to browser console
4. Show success alert

### **To Test:**
1. Navigate to: `http://localhost:3000/fight/scheduled-mock`
2. Click "Simulate Fight" → Confirm
3. Check browser console for:
   - `ChatGPT Input Payload` - Data sent to AI
   - `MongoDB Update Payload` - Complete update structure
4. Repeat for "Choose Winner"

---

## 🚀 Next Steps (TODO)

### **Frontend:**
1. Integrate actual ChatGPT API call
   - Replace mock responses with real API
   - Handle API errors gracefully

### **Backend:**
2. Create GraphQL mutation: `updateFightResult`
   ```graphql
   mutation UpdateFightResult($payload: FightResultInput!) {
     updateFightResult(payload: $payload) {
       success
       fightId
       errors
     }
   }
   ```

3. Implement MongoDB transaction handling:
   ```javascript
   const session = await mongoose.startSession();
   session.startTransaction();
   try {
     // Update competition
     // Update fighter1
     // Update fighter2
     await session.commitTransaction();
   } catch (error) {
     await session.abortTransaction(); // ROLLBACK
     throw error;
   } finally {
     session.endSession();
   }
   ```

4. Add validation:
   - Verify fight exists and is "scheduled"
   - Verify fighters exist
   - Verify ChatGPT response structure

5. Error handling:
   - Return detailed error messages
   - Log all operations
   - Maintain data integrity

---

## 🏁 Season Completion Check Examples

### **League Competition - Season In Progress**
```
Division 1: Round 12 - 5/6 fights completed ❌
Division 2: Round 12 - 6/6 fights completed ✅
Division 3: Round 12 - 6/6 fights completed ✅

Result: isSeasonCompleted = false
Reason: Division 1 still has 1 fight remaining
```

### **League Competition - Season Complete**
```
Division 1: Round 12 - 6/6 fights completed ✅
Division 2: Round 12 - 6/6 fights completed ✅
Division 3: Round 12 - 6/6 fights completed ✅

Result: isSeasonCompleted = true
Message: "✅ SEASON COMPLETED! All divisions have finished their final rounds."
```

### **Cup Competition - Final Complete**
```
Cup Final (Round 4): 1/1 fights completed ✅

Result: isSeasonCompleted = true
Message: "✅ CUP SEASON COMPLETED!"
```

### **When to Use:**
- Call `checkSeasonCompletion()` after EVERY fight result update
- The function is automatically called within `prepareFightResultPayload()`
- Check `seasonCompletionStatus.isSeasonCompleted` in the returned payload
- If `true`, you MUST:
  1. **Query final standings** for all divisions using `GET_FINAL_SEASON_STANDINGS`
  2. **Call `prepareDivisionWinnersUpdate()`** with the standings data
  3. **Update `seasonMeta.leagueDivisions[].winners`** in MongoDB with the returned fighter IDs
  4. Mark the season as complete in the database (`isActive: false`)
  5. Set the `endDate` in `seasonMeta`
  6. Send notifications
  7. Optionally trigger playoff/promotion logic

---

## 📊 Streaks Logic Examples

### **Example 1: No Active Streak**
```
Current State: No active streak
Fight Result: WIN
Action: CREATE new win streak (count: 1, active: true)
```

### **Example 2: Win Streak Continues**
```
Current State: Win streak (count: 3, active: true)
Fight Result: WIN
Action: CONTINUE - Update count to 4, add opponent, update end
```

### **Example 3: Win Streak Breaks**
```
Current State: Win streak (count: 3, active: true)
Fight Result: LOSS
Action: BREAK
  - End win streak (set active: false)
  - Create new loss streak (count: 1, active: true)
```

### **Example 4: Loss Streak Continues**
```
Current State: Loss streak (count: 2, active: true)
Fight Result: LOSS
Action: CONTINUE - Update count to 3, add opponent, update end
```

### **Example 5: Loss Streak Breaks**
```
Current State: Loss streak (count: 2, active: true)
Fight Result: WIN
Action: BREAK
  - End loss streak (set active: false)
  - Create new win streak (count: 1, active: true)
```

---

## ⚠️ Important Notes

1. **Season Lifecycle Tracking**: 
   - **First Fight**: When the season's first ever fight completes, `seasonMetaUpdate.createdAt` is set to the fight timestamp
   - **Season Ends**: When all fights complete, `seasonMetaUpdate.isActive` is set to `false` and `endDate` is set
   - Backend MUST update the competition document with these values

2. **IC Champion**: Cup competitions (like IC) have a single winner in `seasonMeta.winners[]`, not per-division winners like leagues

3. **IC Season Creation**: At exactly 25% league completion, an IC (Invicta Cup) season is automatically created with 8 fighters (1 previous IC champion + 7 random from current league, ensuring at least 1 from each division).

4. **CC Season Creation**: At 100% league completion, a CC (Champions Cup) season is automatically created with 8 top-ranked fighters (top 3 from Division 1, top 3 from Division 2, top 2 from Division 3).

5. **Round Standings**: Automatically calculated after EVERY fight result using head-to-head tiebreaker logic. Backend MUST save to `RoundStandings` collection.

6. **Tiebreaker Consistency**: The standings calculation uses the SAME logic as migration scripts to ensure historical data consistency.

7. **fightsCount Property**: New property in `fightStats` for accurate averaging. Must be initialized to 0 for existing fighters.

8. **debutInformation**: Only updated if empty/missing. Once set, never changes.

9. **Streaks**: Only ONE active streak per fighter at any time. When a streak breaks, the old one is deactivated before creating a new one.

10. **Season Completion**: Automatically checked after every fight result. The backend should handle season finalization (standings, winners, CC creation) when `isSeasonCompleted === true`.

11. **Division Winners**: Uses pre-calculated standings (no sorting). Simply picks all rank 1 fighters from final round standings.

12. **Transaction Required**: All steps must succeed or all must rollback to prevent data corruption.

13. **Date Handling**: Uses current timestamp when user clicks, not the scheduled fight date.

14. **Finishing Moves**: Array of unique strings. Never add duplicates.

15. **New Competitions**: Service handles creating new entries for IFL S1 automatically.

16. **Competition Type Detection**: The service automatically detects if a competition is a league or cup by checking `competition.leagueData` (if present = league, else = cup). Cup competitions skip `seasonDetails` and `roundStandings` updates.

17. **Cup Bracket Progression**: For cup competitions (IC & CC), the service automatically handles bracket advancement. Winners are assigned to the correct next-round fight slots, and the final winner updates `seasonMeta.winners`.

18. **Champion Title Update**: When a cup final completes, the service automatically prepares a title update for the champion's `competitionHistory.titles`. This is included in the same payload to minimize MongoDB update requests and ensure atomicity.

19. **League Division Title Updates**: When a league season completes, backend should call `prepareDivisionWinnersTitleUpdates()` after determining division winners. This prepares title updates for all 3 division winners in a single batch, ensuring efficient MongoDB updates and data consistency.

---

## 🏆 Cup Competition Updates (IC & CC)

### **What Gets Updated:**
When an IC or CC fight result is processed, the service updates:
- ✅ Fight document (winner, stats, date, description, isSimulated)
- ✅ Fighter `competitionHistory` (total fights, wins/losses for IC or CC)
- ✅ Fighter `opponentsHistory` (head-to-head records)
- ✅ Fighter `fightStats` (averaged stats, finishing moves)
- ✅ Fighter `streaks` (win/loss streaks)
- ✅ Fighter `debutInformation` (if first fight ever)

### **What Gets Skipped:**
- ❌ `seasonDetails` (league-specific: divisions, rounds, points)
- ❌ Round standings calculations (no divisions in cups)
- ❌ IC season creation (only triggered by league)
- ❌ CC season creation (only triggered by league)

### **What Gets Added (Cup-Specific):**
- ✅ `cupBracketProgression` - Advances winners to next round or sets champion

### **Example Console Output:**
```
📊 Competition Type: CUP
⏭️  Skipping round standings calculation (cup competition)

🏆 Processing Cup Bracket Progression...
   Fight: IC-S5-R1-F1
   Winner: 676d6ecc...
   📊 Round 1, Fight 1
   ➡️  Winner advances to: IC-S5-R2-F1 as Fighter 1
   ✨ Creating new fight for next round

✅ MongoDB Payload prepared for IC-S5-R1-F1
   📝 Fight: Updated with winner and stats
   👤 Fighter 1 (Sayali Raut):
      ✓ competitionHistory updated
      ✓ opponentsHistory updated
      ✓ fightStats updated (averaged)
      ✓ streaks updated
      ⏭️  seasonDetails skipped (cup competition)
   👤 Fighter 2 (Marina Silva):
      ✓ competitionHistory updated
      ✓ opponentsHistory updated
      ✓ fightStats updated (averaged)
      ✓ streaks updated
      ⏭️  seasonDetails skipped (cup competition)
   🏆 Cup Bracket Progression:
      ✓ Next fight created: IC-S5-R2-F1
      ✓ Winner assigned to fighter1 slot
```

---

## 📝 Console Output Example

```json
{
  "fightId": "scheduled-fight-mock-001",
  "competitionId": "67780dcc09a4c4b25127f8f6",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "competitionUpdate": { ... },
  "fighter1Updates": {
    "fighterId": "676d6ecceb38b2b97c6da945",
    "competitionHistoryUpdate": {
      "competitionId": "...",
      "totalFights": 3,
      "totalWins": 2,
      "totalLosses": 1,
      "winPercentage": 66.67
    },
    "seasonDetailsUpdate": { ... },
    "opponentsHistoryUpdate": { ... },
    "debutInformationUpdate": null,  // Already has debut info
    "streaksUpdate": {
      "action": "continue",
      "streakId": "streak_id_123",
      "updates": {
        "count": 4,
        "end": { season: 10, division: 1, round: 5 },
        "opponents": ["opponent1", "opponent2", "opponent3", "676d7631eb38b2b97c6da9ab"]
      }
    },
    "fightStatsUpdate": {
      "fightsCount": 11,
      "finishingMoves": ["Armbar", "Triangle Choke", ...],
      "grappling": { "accuracy": 78.5, "defence": 10.2 }
      // ... all averaged stats
    }
  },
  "fighter2Updates": {
    "fighterId": "676d7631eb38b2b97c6da9ab",
    "debutInformationUpdate": {
      "competitionId": "67780dcc09a4c4b25127f8f6",
      "season": 10,
      "fightId": "scheduled-fight-mock-001",
      "dateOfDebut": "2024-11-02T10:30:00.000Z"
    },  // First fight ever!
    "streaksUpdate": {
      "action": "create",
      "newStreak": {
        "competitionId": "67780dcc09a4c4b25127f8f6",
        "type": "lose",
        "start": { season: 10, division: 1, round: 5 },
        "end": { season: 10, division: 1, round: 5 },
        "count": 1,
        "active": true,
        "opponents": ["676d6ecceb38b2b97c6da945"]
      }
    },
    // ... other updates
  },
  "seasonCompletionStatus": {
    "isSeasonCompleted": false,
    "competitionType": "league",
    "divisionStatuses": [
      {
        "divisionNumber": 1,
        "totalRounds": 12,
        "lastRound": 12,
        "totalFights": 6,
        "completedFights": 5,
        "isCompleted": false
      },
      {
        "divisionNumber": 2,
        "totalRounds": 12,
        "lastRound": 12,
        "totalFights": 6,
        "completedFights": 6,
        "isCompleted": true
      },
      {
        "divisionNumber": 3,
        "totalRounds": 12,
        "lastRound": 12,
        "totalFights": 6,
        "completedFights": 6,
        "isCompleted": true
      }
    ],
    "seasonNumber": 10,
    "competitionId": "67780dcc09a4c4b25127f8f6"
  }
}
```

**Console Log Example:**
```
🔍 Checking Season Completion...
📊 Division 1: Round 12 - 5/6 fights completed
📊 Division 2: Round 12 - 6/6 fights completed
📊 Division 3: Round 12 - 6/6 fights completed
⏳ Season still in progress...
```

**First Fight of Season:**
```
🎉 First fight of the season! Updating createdAt timestamp.

MongoDB Update Payload includes:
{
  ...
  "seasonMetaUpdate": {
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**With Round Standings:**
```
📊 Calculating Round Standings for IFC-S10-D1-R5-F1...
   - Division fighters: 6
   - Completed fights: 10
   ✅ Standings calculated - Top 3:
      1. Fighter 676d6ecc... - 12 pts (4W) 🏆
      2. Fighter 676d7631... - 9 pts (3W)
      3. Fighter 676d8542... - 6 pts (2W)
```

**When Season Completes:**
```
📊 Calculating Round Standings for IFC-S10-D1-R12-F6...
   - Division fighters: 6
   - Completed fights: 36
   ✅ Standings calculated - Top 3:
      1. Fighter 676d6ecc... - 30 pts (10W) 🏆
      2. Fighter 676d7631... - 24 pts (8W)
      3. Fighter 676d8542... - 21 pts (7W)

🔍 Checking Season Completion...
📊 Division 1: Round 12 - 6/6 fights completed
📊 Division 2: Round 12 - 6/6 fights completed
📊 Division 3: Round 12 - 6/6 fights completed
✅ SEASON COMPLETED! All divisions have finished their final rounds.

🏆 Determining Division Winners...
🥇 Division 1 Winner: 676d6ecceb38b2b97c6da945 (10 wins, 30 points)
🥇 Division 2 Winner: 676d7631eb38b2b97c6da9ab (11 wins, 33 points)
🥇 Division 3 Winners: fighter_id_1, fighter_id_2 (9 wins, 27 points)
✅ Successfully determined winners for 3 division(s)

MongoDB Update Payload includes:
{
  ...
  "seasonMetaUpdate": {
    "isActive": false,
    "endDate": "2025-06-30T18:45:00.000Z"
  }
}
```
**Notes:** 
- Division 3 shows a tie - both fighters have rank 1 in final standings
- Season is marked as `isActive: false` since all fights are complete

---

## 🎯 Benefits

✅ **Organized**: Each step in its own function  
✅ **Testable**: Mock responses for development  
✅ **Safe**: Single transaction prevents corruption  
✅ **Maintainable**: Clear separation of concerns  
✅ **Scalable**: Easy to add new update steps  
✅ **Debuggable**: Comprehensive console logging  

---

## 📞 Integration Points

1. **FightPage.tsx**
   - `handleSimulateFightConfirm()` - Simulate fight flow
   - `handleChooseWinnerSubmit()` - Manual winner flow

2. **Backend Resolver** (To be created)
   - Receive payload
   - Start transaction
   - Apply all updates
   - Commit or rollback

3. **ChatGPT API** (To be integrated)
   - Send fighter data
   - Receive fight outcome
   - Generate stats

