# 🏆 Cup Bracket Progression (IC & CC)

## 📋 Overview

The **Cup Bracket Progression** feature automatically manages tournament advancement for cup competitions (IC and CC). When a fight completes, winners are automatically assigned to their next-round fights, ensuring seamless tournament progression from quarter-finals to finals.

---

## 🎯 Purpose

- **Automatic Bracket Management**: Winners automatically advance to next round
- **Dynamic Fight Creation**: Creates new fights as tournament progresses
- **Champion Tracking**: Sets season winner when final completes
- **Zero Manual Intervention**: Backend handles all progression logic

---

## 🔄 How It Works

### **Tournament Structure (8 Fighters)**

```
ROUND 1 (Quarter-finals) - 4 Fights
├── F1: Fighter A vs Fighter B
├── F2: Fighter C vs Fighter D
├── F3: Fighter E vs Fighter F
└── F4: Fighter G vs Fighter H
        ↓
ROUND 2 (Semi-finals) - 2 Fights
├── SF-F1: Winner F1 vs Winner F2
└── SF-F2: Winner F3 vs Winner F4
        ↓
ROUND 3 (Finals) - 1 Fight
└── Final-F1: Winner SF-F1 vs Winner SF-F2
        ↓
    CHAMPION 🏆
```

---

## 📐 Progression Rules

### **Round 1 → Round 2 (Quarter-finals → Semi-finals)**

| **Completed Fight** | **Winner Goes To** | **Slot** |
|---------------------|---------------------|----------|
| R1-F1 | R2-F1 | fighter1 |
| R1-F2 | R2-F1 | fighter2 |
| R1-F3 | R2-F2 | fighter1 |
| R1-F4 | R2-F2 | fighter2 |

**Logic:**
- `nextRoundFight = Math.ceil(fightNumber / 2)` → F1,F2 → 1; F3,F4 → 2
- `fighterSlot = fightNumber % 2 === 1 ? 'fighter1' : 'fighter2'`

### **Round 2 → Round 3 (Semi-finals → Finals)**

| **Completed Fight** | **Winner Goes To** | **Slot** |
|---------------------|---------------------|----------|
| R2-F1 | R3-F1 | fighter1 |
| R2-F2 | R3-F1 | fighter2 |

### **Round 3 (Finals) → Champion**

- Updates `seasonMeta.winners` array with champion ID
- Marks season as complete (via `checkSeasonCompletion`)

---

## 🛠️ Implementation

### **Function: `prepareCupBracketProgression()`**

**Location:** `/frontend/src/services/fightResultService.ts`

**Signature:**
```typescript
export const prepareCupBracketProgression = (
    competition: any,
    completedFightIdentifier: string,
    winnerId: string
) => {
    // Returns one of three update types
}
```

**Called Automatically:**
- In `prepareFightResultPayload()` when `competitionType === 'cup'`
- For every IC and CC fight result

---

## 🔀 Three Update Types

### **1. Type: `final` - Final Fight Completed**

**When:** Round number equals `cupConfiguration.knockoutRounds` (Round 3)

**Action:** Update season winner

**Return Value:**
```json
{
  "updateType": "final",
  "seasonWinnerUpdate": {
    "winner": "676d6ecceb38b2b97c6da945"
  }
}
```

**Backend Action:**
```javascript
// Update competition document
await Competition.updateOne(
  { _id: competitionId },
  {
    $set: {
      'seasonMeta.winners': [winnerId],
      'isActive': false,
      'seasonMeta.endDate': new Date()
    }
  }
);
```

---

### **2. Type: `update_existing` - Next Fight Already Exists**

**When:** Next round fight document exists in `cupData.fights`

**Action:** Update fighter slot in existing fight

**Return Value:**
```json
{
  "updateType": "update_existing",
  "nextFightUpdate": {
    "fightIdentifier": "IC-S5-R2-F1",
    "fighter1": "676d6ecceb38b2b97c6da945"
  }
}
```

**Backend Action:**
```javascript
// Find and update specific fight in cupData.fights array
await Competition.updateOne(
  { 
    _id: competitionId,
    'cupData.fights.fightIdentifier': nextFightIdentifier
  },
  {
    $set: {
      'cupData.fights.$.fighter1': winnerId  // or fighter2
    }
  }
);
```

---

### **3. Type: `create_new` - Next Fight Doesn't Exist Yet**

**When:** Next round fight hasn't been created yet

**Action:** Create new fight document

**Return Value:**
```json
{
  "updateType": "create_new",
  "newFight": {
    "fighter1": "676d6ecceb38b2b97c6da945",
    "fighter2": null,
    "winner": null,
    "fightIdentifier": "IC-S5-R2-F1",
    "date": null,
    "userDescription": null,
    "genAIDescription": null,
    "isSimulated": false,
    "fighterStats": [],
    "fightStatus": "scheduled"
  }
}
```

**Backend Action:**
```javascript
// Add new fight to cupData.fights array
await Competition.updateOne(
  { _id: competitionId },
  {
    $push: {
      'cupData.fights': newFightObject
    }
  }
);
```

---

## 🏆 Champion Title Update

### **Automatic Title Update on Final Completion**

When the final fight completes, the service automatically prepares a title update for the champion's `competitionHistory.titles`.

**Schema Structure:**
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
            "seasonNumber": 5
          },
          {
            "competitionSeasonId": "68f0065f8cf32f1236924ad0",
            "seasonNumber": 6
          }
        ]
      }
    }
  ]
}
```

### **How It Works**

1. **Final Fight Completes:**
   - Service detects `roundNumber === knockoutRounds` (Round 3)
   - Identifies the champion from winner ID

2. **Checks Existing Titles:**
   - Searches champion's `competitionHistory` for the competition
   - Checks if `titles` object exists and has `totalTitles > 0`

3. **Updates or Creates Titles:**
   - **If titles exist:** Increment `totalTitles` by 1
   - **If no titles:** Create new titles object with `totalTitles: 1`
   - Add new title detail to `details` array

### **Payload Example**

**First Title (IC):**
```json
{
  "updateType": "final",
  "seasonWinnerUpdate": {
    "winner": "676d6ecceb38b2b97c6da945"
  },
  "championTitleUpdate": {
    "competitionId": "67780dcc09a4c4b25127f8f6",
    "titleUpdate": {
      "totalTitles": 1,
      "newTitleDetail": {
        "competitionSeasonId": "68f0065f8cf32f1236924acf",
        "seasonNumber": 5
      }
    }
  }
}
```

**Subsequent Title (IC Season 6):**
```json
{
  "championTitleUpdate": {
    "competitionId": "67780dcc09a4c4b25127f8f6",
    "titleUpdate": {
      "totalTitles": 2,
      "newTitleDetail": {
        "competitionSeasonId": "68f0065f8cf32f1236924ad0",
        "seasonNumber": 6
      }
    }
  }
}
```

### **Backend Implementation**

**Step 1: Update Season Winner**
```javascript
await Competition.updateOne(
  { _id: competitionSeasonId },
  {
    $set: {
      'seasonMeta.winners': [championId],
      'isActive': false,
      'seasonMeta.endDate': new Date()
    }
  }
);
```

**Step 2: Update Champion's Titles**

**Option A: If titles already exist (increment)**
```javascript
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

**Option B: If no titles exist (create)**
```javascript
await Fighter.updateOne(
  { 
    _id: championId,
    'competitionHistory.competitionId': competitionId 
  },
  {
    $set: {
      'competitionHistory.$.titles': {
        totalTitles: 1,
        details: [titleUpdate.newTitleDetail]
      }
    }
  }
);
```

**Recommended: Upsert approach**
```javascript
const { competitionId, titleUpdate } = payload.cupBracketProgression.championTitleUpdate;

// Find the competition history entry
const fighter = await Fighter.findById(championId);
const compHistoryIndex = fighter.competitionHistory.findIndex(
  ch => ch.competitionId.toString() === competitionId
);

if (compHistoryIndex === -1) {
  console.error('Competition history not found for champion');
  return;
}

const existingTitles = fighter.competitionHistory[compHistoryIndex].titles;

if (existingTitles && existingTitles.totalTitles > 0) {
  // Increment existing
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
} else {
  // Create new
  await Fighter.updateOne(
    { 
      _id: championId,
      'competitionHistory.competitionId': competitionId 
    },
    {
      $set: {
        'competitionHistory.$.titles': {
          totalTitles: titleUpdate.totalTitles,
          details: [titleUpdate.newTitleDetail]
        }
      }
    }
  );
}
```

### **Console Output**

```
🏆 Processing Cup Bracket Progression...
   Fight: IC-S5-R3-F1
   Winner: 676d6ecc...
   📊 Round 3, Fight 1
   🎉 FINAL FIGHT! Updating season winner and champion title...
   🏆 Preparing title update for champion Sayali Raut
   ✓ Existing titles: 1 → 2
```

**Or for first title:**
```
   🏆 Preparing title update for champion Marina Silva
   ✨ Creating first title for this competition
```

### **Important Notes**

1. **Competition Meta ID**: Uses `competition.competitionMetaId` (not the season document ID)
2. **Season Document ID**: Uses `competition.id` for `competitionSeasonId` in details
3. **No Division Number**: Cup competitions don't include `divisionNumber` in title details
4. **Transaction Safety**: Title update is included in the same payload, ensuring atomic updates
5. **Validation**: Service checks if `competitionHistory` exists before preparing title update

---

## 📊 Complete Example Workflow

### **IC Season 5 - Quarter-finals Complete**

#### **Step 1: R1-F1 Completes**
```
Fight: IC-S5-R1-F1
Winner: Sayali Raut (676d6ecc...)
```

**Result:**
```json
{
  "updateType": "create_new",
  "newFight": {
    "fightIdentifier": "IC-S5-R2-F1",
    "fighter1": "676d6ecc...",  // Sayali
    "fighter2": null,             // Awaiting R1-F2 winner
    "fightStatus": "scheduled"
  }
}
```

#### **Step 2: R1-F2 Completes**
```
Fight: IC-S5-R1-F2
Winner: Marina Silva (676d7631...)
```

**Result:**
```json
{
  "updateType": "update_existing",
  "nextFightUpdate": {
    "fightIdentifier": "IC-S5-R2-F1",
    "fighter2": "676d7631..."  // Marina
  }
}
```

**After Update:**
```
IC-S5-R2-F1: Sayali Raut vs Marina Silva (scheduled)
```

#### **Step 3: R1-F3 Completes**
```
Fight: IC-S5-R1-F3
Winner: Lina Chen (676d8542...)
```

**Result:**
```json
{
  "updateType": "create_new",
  "newFight": {
    "fightIdentifier": "IC-S5-R2-F2",
    "fighter1": "676d8542...",  // Lina
    "fighter2": null
  }
}
```

#### **Step 4: R1-F4 Completes**
```
Fight: IC-S5-R1-F4
Winner: Emma Johnson (676d9753...)
```

**Result:**
```json
{
  "updateType": "update_existing",
  "nextFightUpdate": {
    "fightIdentifier": "IC-S5-R2-F2",
    "fighter2": "676d9753..."  // Emma
  }
}
```

**After All Quarter-finals:**
```
✅ Quarter-finals Complete

Semi-finals Ready:
├── IC-S5-R2-F1: Sayali Raut vs Marina Silva (scheduled)
└── IC-S5-R2-F2: Lina Chen vs Emma Johnson (scheduled)
```

#### **Step 5: Semi-finals Complete**
```
IC-S5-R2-F1: Sayali wins
IC-S5-R2-F2: Lina wins
```

**After:**
```
Final Created:
└── IC-S5-R3-F1: Sayali Raut vs Lina Chen (scheduled)
```

#### **Step 6: Final Completes**
```
Fight: IC-S5-R3-F1
Winner: Sayali Raut
```

**Result:**
```json
{
  "updateType": "final",
  "seasonWinnerUpdate": {
    "winner": "676d6ecc..."
  }
}
```

**After:**
```
🏆 IC Season 5 Champion: Sayali Raut
```

---

## 🖥️ Console Output Examples

### **Quarter-final Completion:**
```
🏆 Processing Cup Bracket Progression...
   Fight: IC-S5-R1-F1
   Winner: 676d6ecc...
   📊 Round 1, Fight 1
   ➡️  Winner advances to: IC-S5-R2-F1 as Fighter 1
   ✨ Creating new fight for next round
```

### **Semi-final Completion:**
```
🏆 Processing Cup Bracket Progression...
   Fight: IC-S5-R2-F1
   Winner: 676d6ecc...
   📊 Round 2, Fight 1
   ➡️  Winner advances to: IC-S5-R3-F1 as Fighter 1
   ✨ Creating new fight for next round
```

### **Final Completion:**
```
🏆 Processing Cup Bracket Progression...
   Fight: IC-S5-R3-F1
   Winner: 676d6ecc...
   📊 Round 3, Fight 1
   🎉 FINAL FIGHT! Updating season winner...
```

---

## 🔍 Edge Cases & Considerations

### **1. Partial Tournament State**
- **Scenario:** Only R1-F1 completes, R1-F2 still pending
- **Result:** R2-F1 created with only `fighter1` populated
- **Status:** R2-F1 remains `scheduled` until both slots filled

### **2. Fight Identifier Parsing**
- Supports both IC and CC formats
- Examples: `IC-S5-R1-F1`, `CC-S3-R2-F2`
- Robust parsing: handles variations in numbering

### **3. Multiple Knockouts**
- Configured via `cupConfiguration.knockoutRounds`
- Default: 3 rounds (Quarter → Semi → Final)
- Extensible to 4+ rounds if needed

### **4. Concurrent Updates**
- Backend should handle race conditions
- Use MongoDB atomic operations (`$set`, `$push`)
- Consider optimistic locking for fight updates

---

## 🧪 Testing Checklist

### **Unit Tests:**
- [ ] Parse fight identifiers correctly
- [ ] Calculate next round fight numbers
- [ ] Determine fighter slot (fighter1 vs fighter2)
- [ ] Detect final round correctly
- [ ] Handle all three update types

### **Integration Tests:**
- [ ] Complete full IC tournament (8 fighters → champion)
- [ ] Complete full CC tournament (8 fighters → champion)
- [ ] Verify fight documents created correctly
- [ ] Verify season winner set on final
- [ ] Test concurrent fight completions

### **Edge Case Tests:**
- [ ] Complete fights out of order (F2 before F1)
- [ ] Multiple semi-finals complete simultaneously
- [ ] Season with custom knockout rounds count

---

## 📚 Related Documentation

- **FIGHT_RESULT_SERVICE_README.md** - Full service documentation
- **IC_SEASON_CREATION.md** - IC tournament creation (25% trigger)
- **CC_SEASON_CREATION.md** - CC tournament creation (100% trigger)
- **Competition Schema** - MongoDB cupData structure

---

## 🚀 Future Enhancements

1. **Seeded Brackets**: Seed fighters by ranking/performance
2. **Double Elimination**: Losers bracket for 2nd chance
3. **Custom Rounds**: Support for 16, 32, or 64 fighter tournaments
4. **Automatic Scheduling**: AI-based fight date assignment
5. **Bracket Visualization**: Frontend component to display tournament tree

---

**Last Updated:** November 2, 2025  
**Version:** 1.0.0  
**Status:** ✅ Implemented (Backend integration pending)

