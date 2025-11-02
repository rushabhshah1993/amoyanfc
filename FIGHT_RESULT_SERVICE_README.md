# Fight Result Service - Implementation Guide

## Overview
This service prepares comprehensive MongoDB update payloads for fight results. It handles all 8 steps of the update process in a structured, organized manner to prevent data corruption.

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

#### **4. prepareDivisionWinnersUpdate()**
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

1. **Round Standings**: Automatically calculated after EVERY fight result using head-to-head tiebreaker logic. Backend MUST save to `RoundStandings` collection.

2. **Tiebreaker Consistency**: The standings calculation uses the SAME logic as migration scripts to ensure historical data consistency.

3. **fightsCount Property**: New property in `fightStats` for accurate averaging. Must be initialized to 0 for existing fighters.

4. **debutInformation**: Only updated if empty/missing. Once set, never changes.

5. **Streaks**: Only ONE active streak per fighter at any time. When a streak breaks, the old one is deactivated before creating a new one.

6. **Season Completion**: Automatically checked after every fight result. The backend should handle season finalization (standings, winners, promotions) when `isSeasonCompleted === true`.

7. **Division Winners**: Uses pre-calculated standings (no sorting). Simply picks all rank 1 fighters from final round standings.

8. **Transaction Required**: All steps must succeed or all must rollback to prevent data corruption.

9. **Date Handling**: Uses current timestamp when user clicks, not the scheduled fight date.

10. **Finishing Moves**: Array of unique strings. Never add duplicates.

11. **New Competitions**: Service handles creating new entries for IFL S1 automatically.

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
```
**Note:** Division 3 shows a tie - both fighters have rank 1 in final standings.

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

