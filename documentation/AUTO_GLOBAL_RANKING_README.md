# 🏆 Automatic Global Ranking Calculation

## Overview

When all three competitions (League, CC, IC) for a season are completed, the system **automatically** calculates fresh global rankings to update the ranks of all fighters. This happens without any manual intervention.

---

## 🔄 How It Works

### 1. **Trigger Condition**

Global ranking calculation is triggered when:
- ✅ **League Season is completed** (all divisions, all rounds)
- ✅ **Champions Cup (CC) is completed** (final fight)
- ✅ **Invicta Cup (IC) is completed** (final fight)

**All three must be completed for the same linked season.**

### 2. **Automatic Detection**

When any competition season is updated (via `updateCompetitionSeason` mutation):

1. **Check if it's a cup competition** (CC or IC)
2. **Check if the cup is now completed** (final round finished)
3. **Check if all 3 competitions for that season are completed**
4. **If yes → Automatically trigger global ranking calculation**

### 3. **Flow Diagram**

```
Cup Fight Completed (CC or IC)
        ↓
updateCompetitionSeason mutation called
        ↓
autoTriggerGlobalRankingIfNeeded() runs
        ↓
Is this a cup competition?
        ↓ YES
Is the cup completed?
        ↓ YES
Find linked league season
        ↓
Check: League completed? ✅
Check: CC completed? ✅
Check: IC completed? ✅
        ↓ ALL COMPLETED
Calculate Global Rankings
        ↓
Update all fighter records
        ↓
✨ DONE!
```

---

## 📁 Files Created/Modified

### **New Services**

#### 1. `server/services/season-completion.service.js`
Validates if all three competitions for a season are completed.

**Key Functions:**
- `checkAllCompetitionsCompleted(linkedLeagueSeason)` - Check if League, CC, IC are all complete
- `shouldTriggerGlobalRanking(cupCompetition)` - Check if global ranking should be triggered
- `isLeagueSeasonCompleted(leagueCompetition)` - Check if league is complete
- `isCupSeasonCompleted(cupCompetition)` - Check if cup is complete

#### 2. `server/services/global-ranking.service.js`
Calculates global rankings for all fighters.

**Key Function:**
- `calculateAndSaveGlobalRankings(leagueCompetitionMetaId)` - Main calculation function

**Formula:**
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

### **New Resolvers**

#### 3. `server/resolvers/global-ranking-trigger.resolver.js`
Handles manual and automatic triggering of global ranking calculations.

**Key Functions:**
- `autoTriggerGlobalRankingIfNeeded(competition)` - Auto-trigger after competition update
- **Mutation:** `triggerGlobalRankingCalculation` - Manual trigger
- **Mutation:** `checkSeasonCompletionStatus` - Check status (for debugging)

### **Modified Resolvers**

#### 4. `server/resolvers/competition.resolver.js`
Updated `updateCompetitionSeason` mutation to call auto-trigger logic.

**Changes:**
```javascript
updateCompetitionSeason: catchAsyncErrors(async(_, { id, input }) => {
    const updatedCompetitionSeason = await Competition.findByIdAndUpdate(
        id,
        input,
        { new: true }
    );
    if(!updatedCompetitionSeason) throw new NotFoundError("Competition not found");
    
    // 🆕 Auto-trigger global ranking calculation
    autoTriggerGlobalRankingIfNeeded(updatedCompetitionSeason).catch(err => {
        console.error('Error in auto-trigger global ranking:', err);
    });
    
    return updatedCompetitionSeason;
}),
```

### **New TypeDefs**

#### 5. `server/typeDefs/global-ranking-trigger.typedef.js`
GraphQL type definitions for global ranking operations.

**Types:**
- `GlobalRankingCalculationResult` - Result of calculation
- `SeasonCompletionStatus` - Status of season completion

**Mutations:**
- `triggerGlobalRankingCalculation(leagueCompetitionMetaId: ID!)` - Manual trigger
- `checkSeasonCompletionStatus(leagueSeasonId: ID!)` - Check completion status

### **Updated Index Files**

#### 6. `server/resolvers/index.js`
Added `globalRankingTriggerResolver` to merged resolvers.

#### 7. `server/typeDefs/index.js`
Added `globalRankingTriggerTypeDef` to merged typedefs.

---

## 🎯 Key Features

### ✅ Automatic Triggering
- No manual intervention required
- Happens immediately when all 3 competitions complete
- Non-blocking (doesn't slow down competition updates)

### ✅ Dynamic League Support
- Works with any active league competition (not hardcoded to IFC)
- Dynamically finds the league linked to CC and IC
- Uses `linkedLeagueSeason` property from cup competitions

### ✅ Comprehensive Validation
- Checks all divisions in the league are complete
- Checks final round of CC is complete
- Checks final round of IC is complete
- Only triggers when ALL THREE are done

### ✅ Manual Override
- Can manually trigger via GraphQL mutation if needed
- Useful for testing or re-calculation

---

## 🔍 How to Test

### 1. **Check Season Completion Status**

```graphql
mutation CheckStatus {
  checkSeasonCompletionStatus(leagueSeasonId: "your-season-id") {
    allCompleted
    leagueCompleted
    ccCompleted
    icCompleted
    seasonNumber
    leagueName
    reason
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "checkSeasonCompletionStatus": {
      "allCompleted": true,
      "leagueCompleted": true,
      "ccCompleted": true,
      "icCompleted": true,
      "seasonNumber": 10,
      "leagueName": "International Fighting Championship",
      "reason": "All competitions completed"
    }
  }
}
```

### 2. **Manually Trigger Global Ranking Calculation**

```graphql
mutation TriggerGlobalRanking {
  triggerGlobalRankingCalculation(leagueCompetitionMetaId: "67780dcc09a4c4b25127f8f6") {
    success
    message
    globalRankId
    totalFighters
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "triggerGlobalRankingCalculation": {
      "success": true,
      "message": "Global rankings calculated successfully for 53 fighters",
      "globalRankId": "673abc123def456789012345",
      "totalFighters": 53
    }
  }
}
```

### 3. **Complete a Cup Final Fight**

Update the CC or IC final fight result:

```graphql
mutation UpdateFinalFight {
  updateCompetitionSeason(
    id: "cc-season-id",
    input: {
      # ... fight result data
    }
  ) {
    id
    seasonMeta {
      winners {
        firstName
        lastName
      }
    }
  }
}
```

**Console Output:**
```
🔍 Checking if global ranking should be triggered...
   ✅ League Season 10: Completed
   ✅ CC Season 3: Completed
   ✅ IC Season 5: Completed

✨ ALL THREE COMPETITIONS COMPLETED!
   Automatically triggering global ranking calculation...
   League Competition Meta ID: 67780dcc09a4c4b25127f8f6

🏆 CALCULATING GLOBAL RANKINGS FOR ALL FIGHTERS
======================================================================
   League Competition Meta ID: 67780dcc09a4c4b25127f8f6

📥 Fetching all active fighters from MongoDB...
✅ Fetched 53 active fighters

🔢 Calculating global scores...

🏅 TOP 10 GLOBAL RANKINGS:
======================================================================
1. Unnati Vora                    Score: 85.75
   Win%: 87.5% | League Titles: 6 | CC Titles: 5 | IC Titles: 0
   CC Apps: 5 | IC Apps: 0 | Longest Streak: 15

2. Sayali Raut                    Score: 46.76
   Win%: 67.65% | League Titles: 2 | CC Titles: 0 | IC Titles: 2
   CC Apps: 2 | IC Apps: 2 | Longest Streak: 10

...

📝 Marking existing global rankings as historical...
💾 Saving new global rankings to database...
✅ Global rankings saved successfully!
   - Total fighters ranked: 53
   - Document ID: 673abc123def456789012345

📝 Updating fighter globalRank fields...
✅ Updated 53 fighter records

======================================================================
✨ GLOBAL RANKINGS CALCULATION COMPLETE! ✨
======================================================================

🎉 GLOBAL RANKINGS AUTOMATICALLY CALCULATED!
   Total Fighters: 53
   Global Rank ID: 673abc123def456789012345
   Season: 10 (International Fighting Championship)
```

---

## 📊 Database Updates

When global ranking calculation runs:

### 1. **GlobalRank Collection**
- Creates new document with `isCurrent: true`
- Marks previous rankings as `isCurrent: false`
- Stores all fighter rankings with:
  - `fighterId`
  - `score`
  - `rank`
  - `titles[]`
  - `cupAppearances[]`
  - `leagueAppearances[]`

### 2. **Fighter Collection**
- Updates each fighter's `globalRank` field:
  - `rank` - Their global position (1-53)
  - `score` - Their calculated score
  - `globalRankId` - Reference to GlobalRank document

---

## 🎮 Frontend Integration

The frontend automatically displays updated rankings on the `/global-rankings` page via the existing `getCurrentGlobalRank` query. No changes needed!

---

## 🛠️ Maintenance

### Viewing Logs

Check server console for detailed logs during calculation:
- Competition completion checks
- Season validation
- Ranking calculation progress
- Top 10 rankings display
- Database update confirmations

### Error Handling

The auto-trigger is **non-blocking**:
- Errors are logged but don't affect competition updates
- Competition updates complete successfully even if ranking calculation fails
- Can manually retry via GraphQL mutation if needed

### Re-calculating Rankings

If you need to recalculate rankings:

1. **Manual GraphQL Mutation** (recommended):
   ```graphql
   mutation {
     triggerGlobalRankingCalculation(
       leagueCompetitionMetaId: "your-league-meta-id"
     ) {
       success
       message
       totalFighters
     }
   }
   ```

2. **Script** (from terminal):
   ```bash
   node server/scripts/calculate-global-rankings.js
   node server/scripts/update-fighter-global-ranks.js
   ```

---

## 📝 Summary

✅ **Automatic**: Triggers when all 3 competitions complete
✅ **Dynamic**: Works with any league competition
✅ **Validated**: Checks all competitions are truly complete
✅ **Reliable**: Non-blocking with error handling
✅ **Manual Override**: Can trigger manually via GraphQL
✅ **Tested**: Includes debugging queries

**The system now automatically maintains global rankings after each season completion!** 🎉

---

## 🔗 Related Documentation

- `server/scripts/GLOBAL-RANKINGS-GUIDE.md` - Detailed ranking formula guide
- `server/scripts/GLOBAL-RANKINGS-SUMMARY.md` - Implementation summary
- `SEASON_COMPLETION_CHECK.md` - Season completion logic
- `CUP_BRACKET_PROGRESSION.md` - Cup competition progression

---

**Last Updated**: November 2, 2025

