# 🏆 League Division Title Updates

## 📋 Overview

When a league season completes (all fights in all divisions finished), the service provides a function to prepare title updates for all division winners. This ensures that each division champion's `competitionHistory.titles` is updated efficiently in a single batch operation.

---

## 🎯 Purpose

- **Track Division Championships**: Record which fighters won which division titles
- **Historical Record**: Maintain complete title history for each fighter
- **Batch Processing**: Update all 3 division winners' titles at once
- **Data Integrity**: Ensure atomicity with other season completion updates

---

## 🔄 Complete Workflow

### **When League Season Completes**

```
Last Fight of Season Completes
        ↓
1. prepareFightResultPayload()
   → detects isSeasonCompleted === true
        ↓
2. Backend queries final standings
   → GET_FINAL_SEASON_STANDINGS for each division
        ↓
3. prepareDivisionWinnersUpdate()
   → determines rank 1 fighters for each division
        ↓
4. Backend queries full fighter data
   → for all 3 division winners
        ↓
5. prepareDivisionWinnersTitleUpdates()
   → prepares title updates for all winners
        ↓
6. Update MongoDB in single transaction:
   - Season meta (isActive, endDate)
   - Division winners (seasonMeta.leagueDivisions[].winners)
   - Fighter titles (competitionHistory.titles)
   - Create CC season (optional)
```

---

## 🛠️ Implementation

### **Function: `prepareDivisionWinnersTitleUpdates()`**

**Location:** `/frontend/src/services/fightResultService.ts`

**Signature:**
```typescript
export const prepareDivisionWinnersTitleUpdates = (
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
) => {
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

---

## 📊 Title Structure

### **Fighter Schema - competitionHistory.titles**

```json
{
  "competitionHistory": [
    {
      "competitionId": "67780dcc09a4c4b25127f8f6",
      "numberOfSeasonAppearances": 5,
      "totalFights": 45,
      "totalWins": 32,
      "totalLosses": 13,
      "titles": {
        "totalTitles": 3,
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
          },
          {
            "competitionSeasonId": "68f0065f8cf32f1236924ad1",
            "seasonNumber": 5,
            "divisionNumber": 2
          }
        ]
      }
    }
  ]
}
```

### **Field Descriptions:**

- **`totalTitles`**: Total number of division championships won in this competition
- **`details[]`**: Array of all title wins
  - **`competitionSeasonId`**: ID of the specific season document
  - **`seasonNumber`**: Season number (e.g., 1, 2, 5)
  - **`divisionNumber`**: Which division the title was won in (1, 2, or 3)

---

## 🔀 Update Logic

### **Case 1: First Title**
```javascript
// Fighter has never won this competition before
{
  totalTitles: 1,
  details: [
    {
      competitionSeasonId: "...",
      seasonNumber: 5,
      divisionNumber: 1
    }
  ]
}
```

### **Case 2: Additional Title**
```javascript
// Fighter previously won Division 1 in Season 2
// Now wins Division 1 in Season 5
{
  totalTitles: 2,  // Increment from 1 → 2
  details: [
    {
      competitionSeasonId: "...",
      seasonNumber: 2,
      divisionNumber: 1
    },
    {
      competitionSeasonId: "...",  // New entry
      seasonNumber: 5,
      divisionNumber: 1
    }
  ]
}
```

---

## 📝 Example Usage

### **Backend Implementation:**

```javascript
// 1. Last fight completes - season ends
const payload = prepareFightResultPayload(...);

if (payload.seasonCompletionStatus.isSeasonCompleted) {
  console.log('Season complete! Processing final updates...');
  
  // 2. Query final standings for all divisions
  const finalStandings = await Promise.all([1, 2, 3].map(divNum =>
    client.query({
      query: GET_FINAL_SEASON_STANDINGS,
      variables: { competitionId, seasonNumber, divisionNumber: divNum }
    })
  ));

  const finalStandingsData = finalStandings.map((result, index) => ({
    divisionNumber: index + 1,
    standings: result.data.getFinalSeasonStandings.standings
  }));

  // 3. Determine division winners
  const divisionWinnersData = prepareDivisionWinnersUpdate(
    competitionFull,
    finalStandingsData
  );

  // 4. Query full fighter data for all winners
  const allWinnerIds = divisionWinnersData.divisionWinners
    .flatMap(div => div.winners);

  const winnerFightersPromises = allWinnerIds.map(id =>
    Fighter.findById(id).lean()
  );
  const winnerFightersData = await Promise.all(winnerFightersPromises);

  // 5. Prepare title updates
  const titleUpdatesData = prepareDivisionWinnersTitleUpdates(
    competitionFull,
    seasonNumber,
    divisionWinnersData,
    winnerFightersData
  );

  // 6. Update MongoDB in transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update season meta
    await Competition.updateOne(
      { _id: competitionId },
      {
        $set: {
          'seasonMeta.isActive': false,
          'seasonMeta.endDate': new Date()
        }
      },
      { session }
    );

    // Update division winners
    for (const division of divisionWinnersData.divisionWinners) {
      await Competition.updateOne(
        {
          _id: competitionId,
          'seasonMeta.leagueDivisions.divisionNumber': division.divisionNumber
        },
        {
          $set: {
            'seasonMeta.leagueDivisions.$.winners': division.winners
          }
        },
        { session }
      );
    }

    // Update fighter titles
    for (const update of titleUpdatesData.titleUpdates) {
      const fighter = await Fighter.findById(update.fighterId);
      const compHistoryIndex = fighter.competitionHistory.findIndex(
        ch => ch.competitionId.toString() === update.competitionId
      );

      const existingTitles = fighter.competitionHistory[compHistoryIndex]?.titles;

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
          },
          { session }
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
          },
          { session }
        );
      }
    }

    await session.commitTransaction();
    console.log('✅ Season completion updates applied successfully');
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error updating season completion data:', error);
    throw error;
  } finally {
    session.endSession();
  }
}
```

---

## 🖥️ Console Output

```
🏆 Determining Division Winners...
🥇 Division 1 Winner: 676d6ecceb38b2b97c6da945 (10 wins, 30 points)
🥇 Division 2 Winner: 676d7631eb38b2b97c6da9ab (9 wins, 27 points)
🥇 Division 3 Winner: 676d8542eb38b2b97c6da9bc (8 wins, 24 points)
✅ Successfully determined winners for 3 division(s)

🏆 Preparing Title Updates for Division Winners...
   ✓ Division 1 - Sayali Raut: 1 → 2 titles
   ✨ Division 2 - Marina Silva: First title!
   ✓ Division 3 - Lina Chen: 0 → 1 titles
✅ Prepared title updates for 3 division winner(s)
```

---

## 🆚 League vs Cup Titles

| **Aspect** | **League (IFL)** | **Cup (IC, CC)** |
|------------|------------------|------------------|
| **Function** | `prepareDivisionWinnersTitleUpdates()` | `prepareTitleUpdate()` (internal) |
| **When Called** | Manually by backend after season ends | Automatically in `prepareCupBracketProgression()` |
| **Number of Winners** | 3 (one per division) | 1 (tournament champion) |
| **Title Detail Fields** | `competitionSeasonId`, `seasonNumber`, `divisionNumber` | `competitionSeasonId`, `seasonNumber` |
| **Batch Processing** | Yes (all 3 in one call) | No (single winner) |
| **Included in Payload** | No (separate function) | Yes (`cupBracketProgression.championTitleUpdate`) |

---

## ⚠️ Important Considerations

### **1. Timing**
- Call AFTER season is confirmed complete
- Call AFTER division winners are determined
- Call BEFORE MongoDB transaction begins

### **2. Data Requirements**
- Full fighter documents needed (not just IDs)
- Must include complete `competitionHistory` array
- Existing `titles` object may or may not exist

### **3. Transaction Safety**
- Should be part of season completion transaction
- Rollback all updates if any fail
- Include with division winners and season meta updates

### **4. Validation**
- Function validates `competitionHistory` exists
- Logs warning if fighter data missing
- Continues processing other winners if one fails

### **5. No Ties Handling**
- Assumes only rank 1 fighters (no ties)
- If ties exist in standings, all rank 1 fighters get titles
- Each title is recorded separately

---

## 🧪 Testing Checklist

### **Unit Tests:**
- [ ] First title creation (totalTitles: 0 → 1)
- [ ] Title increment (totalTitles: 1 → 2, 2 → 3, etc.)
- [ ] Multiple divisions processed correctly
- [ ] Missing fighter data handled gracefully
- [ ] Missing competitionHistory handled gracefully

### **Integration Tests:**
- [ ] Complete IFL Season 1 → verify 3 titles created
- [ ] Same fighter wins multiple seasons → verify increment
- [ ] Fighter wins different divisions → both recorded
- [ ] Transaction rollback on failure
- [ ] Console output matches expectations

---

## 📚 Related Documentation

- **FIGHT_RESULT_SERVICE_README.md** - Full service documentation
- **SEASON_COMPLETION_CHECK.md** - Season completion detection
- **CUP_BRACKET_PROGRESSION.md** - Cup title updates (IC & CC)
- **Fighter Schema** - MongoDB schema for competitionHistory

---

**Last Updated:** November 2, 2025  
**Version:** 1.0.0  
**Status:** ✅ Implemented (Backend integration pending)

