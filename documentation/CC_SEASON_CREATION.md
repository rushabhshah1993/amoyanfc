# 🏆 CC Season Creation (100% League Completion)

## 📋 Overview

The **Champions Cup (CC)** is automatically created when a league season reaches **100% completion**. This prestigious cup competition features the top 8 fighters from the league season competing in a knockout tournament format.

---

## 🎯 Purpose

- **End-of-Season Championship**: Crowns the ultimate champion from the league's best fighters
- **Merit-Based Selection**: Only top-ranked fighters qualify
- **Prestige**: Higher prize pool than IC (Invicta Cup)
- **Knockout Format**: 8 fighters → 4 quarter-finals → 2 semi-finals → 1 final

---

## ⚡ Trigger Condition

### **100% League Completion**

**Requirement:**
```typescript
isSeasonCompleted === true

// All fights in all rounds in all divisions must be completed
```

**Example:**
```
Total league fights: 108 (across all divisions)
Completed: 108 fights
Percentage: 100.00% ✅

Division 1: Round 12 - 6/6 fights completed ✅
Division 2: Round 12 - 6/6 fights completed ✅
Division 3: Round 12 - 6/6 fights completed ✅

Result: Season Complete → Create CC
```

### **Important:**
- Only triggers when ALL fights in ALL divisions are complete
- Prevents duplicate CC seasons for same league season
- Called AFTER `prepareDivisionWinnersUpdate()`

---

## 👥 Fighter Selection

### **Total: 8 Fighters (Top-Ranked)**

#### **From Final Round Standings:**

| **Division** | **Fighters Selected** | **Ranks** |
|--------------|----------------------|-----------|
| Division 1   | 3 fighters           | 1, 2, 3   |
| Division 2   | 3 fighters           | 1, 2, 3   |
| Division 3   | 2 fighters           | 1, 2      |
| **Total**    | **8 fighters**       | Top performers |

### **Selection Process:**

```javascript
// Use final round standings (already sorted with head-to-head tiebreakers)

const division1Standings = finalStandingsData.find(d => d.divisionNumber === 1);
const top3Div1 = division1Standings.standings.slice(0, 3); // Ranks 1, 2, 3

const division2Standings = finalStandingsData.find(d => d.divisionNumber === 2);
const top3Div2 = division2Standings.standings.slice(0, 3); // Ranks 1, 2, 3

const division3Standings = finalStandingsData.find(d => d.divisionNumber === 3);
const top2Div3 = division3Standings.standings.slice(0, 2); // Ranks 1, 2

ccParticipants = [...top3Div1, ...top3Div2, ...top2Div3]; // 8 fighters
```

### **Example Selection:**

**IFL Season 1 Final Standings:**

**Division 1:**
1. 🥇 Sayali Raut (30 pts, 10W-2L)
2. 🥈 Marina Silva (27 pts, 9W-3L)
3. 🥉 Lina Chen (24 pts, 8W-4L)

**Division 2:**
1. 🥇 Emma Johnson (28 pts, 9W-3L)
2. 🥈 Sofia Rodriguez (25 pts, 8W-4L)
3. 🥉 Yuki Tanaka (22 pts, 7W-5L)

**Division 3:**
1. 🥇 Priya Patel (26 pts, 8W-4L)
2. 🥈 Anna Kowalski (23 pts, 7W-5L)

**CC Season 3 Participants:**
```
1. Sayali Raut      (Div 1 - Rank 1)
2. Marina Silva     (Div 1 - Rank 2)
3. Lina Chen        (Div 1 - Rank 3)
4. Emma Johnson     (Div 2 - Rank 1)
5. Sofia Rodriguez  (Div 2 - Rank 2)
6. Yuki Tanaka      (Div 2 - Rank 3)
7. Priya Patel      (Div 3 - Rank 1)
8. Anna Kowalski    (Div 3 - Rank 2)
```

---

## 🥊 Fight Pairings

### **Round 1: Quarter-Finals (4 Fights)**

**Random Pairings:**
1. Shuffle all 8 selected fighters
2. Pair them sequentially: 1-2, 3-4, 5-6, 7-8
3. Create fight documents with `fightStatus: 'scheduled'`

**Fight Identifiers:**
- `CC-S3-R1-F1` (Quarter-final 1)
- `CC-S3-R1-F2` (Quarter-final 2)
- `CC-S3-R1-F3` (Quarter-final 3)
- `CC-S3-R1-F4` (Quarter-final 4)

**Example:**
```
After shuffling:
1. Emma Johnson
2. Sayali Raut
3. Priya Patel
4. Marina Silva
5. Yuki Tanaka
6. Lina Chen
7. Sofia Rodriguez
8. Anna Kowalski

🥊 Quarter-final 1: Emma Johnson vs Sayali Raut
🥊 Quarter-final 2: Priya Patel vs Marina Silva
🥊 Quarter-final 3: Yuki Tanaka vs Lina Chen
🥊 Quarter-final 4: Sofia Rodriguez vs Anna Kowalski
```

---

## 📊 CC Season Structure

### **Competition Document:**

```json
{
  "competitionMetaId": "...",  // CC competition meta ID
  "competitionMeta": {
    "competitionName": "Champions Cup",
    "type": "cup",
    "logo": "competitions/cc-logo.png"
  },
  "isActive": true,
  "seasonMeta": {
    "seasonNumber": 3,
    "startDate": "2025-06-30T18:45:00.000Z",
    "endDate": null,
    "winners": [],  // Populated when season ends
    "leagueDivisions": null,
    "cupParticipants": {
      "fighters": [
        "676d6ecceb38b2b97c6da945",  // Sayali Raut (Div 1 - Rank 1)
        "676d7631eb38b2b97c6da9ab",  // Marina Silva (Div 1 - Rank 2)
        "676d8542eb38b2b97c6da9bc",  // Lina Chen (Div 1 - Rank 3)
        "676d9753eb38b2b97c6da9cd",  // Emma Johnson (Div 2 - Rank 1)
        "676da864eb38b2b97c6da9de",  // Sofia Rodriguez (Div 2 - Rank 2)
        "676db975eb38b2b97c6da9ef",  // Yuki Tanaka (Div 2 - Rank 3)
        "676dc086eb38b2b97c6da9f0",  // Priya Patel (Div 3 - Rank 1)
        "676dd197eb38b2b97c6daa01"   // Anna Kowalski (Div 3 - Rank 2)
      ]
    }
  },
  "leagueData": null,
  "cupData": {
    "fights": [
      {
        "fighter1": "676d6ecceb38b2b97c6da945",
        "fighter2": "676d7631eb38b2b97c6da9ab",
        "winner": null,
        "fightIdentifier": "CC-S3-R1-F1",
        "date": null,
        "userDescription": null,
        "genAIDescription": null,
        "isSimulated": false,
        "fighterStats": [],
        "fightStatus": "scheduled"
      },
      // ... 3 more fights
    ],
    "currentStage": "Quarter-finals"
  },
  "config": {
    "leagueConfiguration": null,
    "cupConfiguration": {
      "knockoutRounds": 3,
      "numberOfFighters": 8,
      "perFightFeeInEur": 15000,
      "winningFeeInEur": 150000,
      "stages": ["Quarter-finals", "Semi-finals", "Finals"]
    }
  },
  "linkedLeagueSeason": {
    "competitionId": "67780dcc09a4c4b25127f8f6",  // IFL competition ID
    "seasonNumber": 1
  }
}
```

---

## 🔄 Workflow

### **1. League Season Completes**
```javascript
const payload = prepareFightResultPayload(...);

// Last fight completes
payload.seasonCompletionStatus.isSeasonCompleted === true
```

### **2. Backend Queries Final Standings**
```javascript
const divisionStandingsPromises = [1, 2, 3].map(divNum =>
  client.query({
    query: GET_FINAL_SEASON_STANDINGS,
    variables: {
      competitionId,
      seasonNumber,
      divisionNumber: divNum
    }
  })
);

const standingsResults = await Promise.all(divisionStandingsPromises);

const finalStandingsData = standingsResults.map((result, index) => ({
  divisionNumber: index + 1,
  standings: result.data.getFinalSeasonStandings.standings
}));
```

### **3. Determine Division Winners**
```javascript
const winnersUpdate = prepareDivisionWinnersUpdate(
  competitionFull,
  finalStandingsData
);

// Update MongoDB with division winners
```

### **4. Create CC Season**
```javascript
const ccSeasonResult = await checkAndCreateCCSeasonIfNeeded(
  competitionFull,
  leagueCompetitionId,
  leagueSeasonNumber,
  finalStandingsData
);

if (ccSeasonResult) {
  console.log('✨ CC Season created!');
  // MongoDB save logic here
}
```

### **5. Console Output:**
```
🏁 Season completed! Backend should create CC season with final standings.

🏆 Checking if CC Season should be created...
📝 Creating new CC season from league champions...
   🥇 Division 1 - Top 3: 676d6ecc..., 676d7631..., 676d8542...
   🥈 Division 2 - Top 3: 676d9753..., 676da864..., 676db975...
   🥉 Division 3 - Top 2: 676dc086..., 676dd197...
   ✅ Selected 8 fighters for CC season
   🥊 Fight 1: 676d9753... vs 676d6ecc...
   🥊 Fight 2: 676d7631... vs 676da864...
   🥊 Fight 3: 676d8542... vs 676db975...
   🥊 Fight 4: 676dc086... vs 676dd197...

✨ CC Season created successfully!
   🏆 Season: CC S3
   👥 Participants: 8 fighters (top-ranked from league)
   🥊 Round 1 Fights: 4 (all scheduled)
   🔗 Linked to: IFL S1
```

---

## 🛠️ MongoDB Queries Needed

### **1. Check if CC Season Already Exists**
```javascript
const existingCCSeasons = await Competition.find({
  'linkedLeagueSeason.competitionId': leagueCompetitionId,
  'linkedLeagueSeason.seasonNumber': leagueSeasonNumber,
  'competitionMeta.competitionName': 'Champions Cup'
});

if (existingCCSeasons.length > 0) {
  return null; // Already exists
}
```

### **2. Get CC Competition Meta ID**
```javascript
const ccMeta = await CompetitionMeta.findOne({
  competitionName: 'Champions Cup',
  type: 'cup'
});

const CC_COMPETITION_META_ID = ccMeta._id;
```

### **3. Determine New CC Season Number**
```javascript
const latestCCSeason = await Competition.findOne({
  competitionMetaId: CC_COMPETITION_META_ID
})
.sort({ 'seasonMeta.seasonNumber': -1 })
.limit(1);

const newSeasonNumber = (latestCCSeason?.seasonMeta?.seasonNumber || 0) + 1;
```

---

## ⚠️ Edge Cases

### **Insufficient Fighters in a Division**
If a division doesn't have enough fighters in final standings:
```
❌ Error: Division 2 does not have 3 fighters in standings
```
**Action:** Season cannot create CC. Log error and skip.

---

### **Ties in Rankings**
The final standings already have tiebreakers applied (head-to-head). Rankings are definitive:
```
Division 1:
1. Fighter A (rank 1)
2. Fighter B (rank 2) ← Beat Fighter C in head-to-head
3. Fighter C (rank 3)
```
**All three are selected** for CC based on their final ranks.

---

## 🆚 IC vs CC Comparison

| **Aspect**          | **Invicta Cup (IC)**               | **Champions Cup (CC)**            |
|---------------------|-----------------------------------|-----------------------------------|
| **Trigger**         | 25% league completion             | 100% league completion            |
| **Selection**       | 1 previous champion + 7 random    | Top 3 Div1 + Top 3 Div2 + Top 2 Div3 |
| **Criteria**        | Random (with division diversity)  | Merit-based (final rankings)      |
| **Prize**           | €100,000                          | €150,000                          |
| **Prestige**        | Mid-season excitement             | End-season championship           |
| **Purpose**         | Give champion defense chance      | Crown the best of the best        |

---

## 🧪 Testing

### **Manual Testing:**

1. **Complete a league season:**
   - Ensure all fights in all divisions are completed
   - Verify final standings are calculated

2. **Trigger CC creation:**
   ```javascript
   const result = await checkAndCreateCCSeasonIfNeeded(
     competitionData,
     'competitionId',
     1,
     finalStandingsData
   );
   ```

3. **Verify console output:**
   - Should show top fighters selection
   - Should create 4 scheduled fights
   - Should log CC season structure

4. **Check fighter distribution:**
   - 3 from Division 1 ✓
   - 3 from Division 2 ✓
   - 2 from Division 3 ✓
   - Total: 8 ✓

---

## 📚 Related Documentation

- **FIGHT_RESULT_SERVICE_README.md** - Full service documentation
- **IC_SEASON_CREATION.md** - Invicta Cup creation (25%)
- **SEASON_COMPLETION_CHECK.md** - Season completion logic
- **Competition Schema** - MongoDB schema for competitions

---

## 🔮 Future Enhancements

1. **Seeded Brackets**: Seed fighters by division (Div 1 vs Div 3, Div 2 vs Div 2)
2. **Runner-Up Tournament**: Separate tournament for ranks 4-8
3. **Prize Distribution**: Graduated prizes for semi-finalists, finalists
4. **Historical Stats**: Track CC performance separate from league
5. **Promotion Incentive**: CC winner gets automatic Div 1 spot next season

---

**Last Updated:** November 2, 2025  
**Version:** 1.0.0  
**Status:** ✅ Implemented (MongoDB integration pending)

