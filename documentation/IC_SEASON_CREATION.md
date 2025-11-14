# 🏆 IC Season Creation (25% League Completion)

## 📋 Overview

The **Invicta Cup (IC)** is automatically created when a league season reaches **exactly 25% completion**. This cup competition features 8 fighters competing in a knockout tournament format, with fights drawn from the current league season.

---

## 🎯 Purpose

- **Automatic Mid-Season Event**: Creates excitement during the league season
- **Champion Defense**: Previous IC champion gets automatic entry
- **Fair Distribution**: Ensures representation from all divisions
- **Knockout Format**: 8 fighters → 4 quarter-finals → 2 semi-finals → 1 final

---

## ⚡ Trigger Condition

### **Exactly 25% League Completion**

**Calculation:**
```typescript
completionPercentage = (completedFights / totalFights) * 100

// Must be exactly 25% (±0.5% tolerance)
if (Math.abs(completionPercentage - 25) <= 0.5) {
  // Create IC season
}
```

**Example:**
```
Total league fights: 108 (across all divisions)
Completed: 27 fights
Percentage: 25.00% ✅

Completed: 26 fights
Percentage: 24.07% ❌ (not yet)

Completed: 28 fights
Percentage: 25.93% ❌ (already past)
```

### **Important:**
- Only triggers ONCE when threshold is hit
- Skips if percentage is <25% or >25%
- Prevents duplicate IC seasons for same league season

---

## 👥 Fighter Selection

### **Total: 8 Fighters**

#### **1 Previous IC Champion (Auto-Selected)**
- Queries MongoDB for previous IC season (e.g., IC S4 for IFL S1)
- Gets winner from `seasonMeta.winners[0]`
- Automatically included in new IC season

#### **7 Random Fighters from Current League**
- Selected from ALL divisions in current league season
- **Minimum: 1 fighter per division**
- Previous champion is excluded from random selection

### **Selection Algorithm:**

```javascript
// Step 1: Get previous IC champion
const previousChampion = getPreviousICChampion();
participants = [previousChampion];

// Step 2: Select 1 fighter from each division (ensures representation)
for each division in league:
  availableFighters = division.fighters.filter(f => f !== previousChampion)
  randomFighter = selectRandom(availableFighters)
  participants.push(randomFighter)

// Step 3: Fill remaining spots randomly from all divisions
remainingSlots = 8 - participants.length
availableFighters = allLeagueFighters.filter(f => !participants.includes(f))
randomFighters = selectRandom(availableFighters, remainingSlots)
participants.push(...randomFighters)

// Final: 8 fighters
```

### **Example Selection:**

**IFL Season 1 Fighters:**
- Division 1: 6 fighters
- Division 2: 6 fighters
- Division 3: 6 fighters
- **Total:** 18 fighters

**IC Season 5 Selection:**
```
1. Previous Champion (IC S4): Sayali Raut
2. Division 1 (random):       Marina Silva
3. Division 2 (random):       Lina Chen
4. Division 3 (random):       Emma Johnson
5. Random from any:           Sofia Rodriguez
6. Random from any:           Yuki Tanaka
7. Random from any:           Priya Patel
8. Random from any:           Anna Kowalski
```

---

## 🥊 Fight Pairings

### **Round 1: Quarter-Finals (4 Fights)**

**Random Pairings:**
1. Shuffle all 8 selected fighters
2. Pair them sequentially: 1-2, 3-4, 5-6, 7-8
3. Create fight documents with `fightStatus: 'scheduled'`

**Fight Identifiers:**
- `IC-S5-R1-F1` (Quarter-final 1)
- `IC-S5-R1-F2` (Quarter-final 2)
- `IC-S5-R1-F3` (Quarter-final 3)
- `IC-S5-R1-F4` (Quarter-final 4)

**Example:**
```
🥊 Quarter-final 1: Sayali Raut vs Marina Silva
🥊 Quarter-final 2: Lina Chen vs Emma Johnson
🥊 Quarter-final 3: Sofia Rodriguez vs Yuki Tanaka
🥊 Quarter-final 4: Priya Patel vs Anna Kowalski
```

---

## 📊 IC Season Structure

### **Competition Document:**

```json
{
  "competitionMetaId": "...",  // IC competition meta ID
  "competitionMeta": {
    "competitionName": "Invicta Cup",
    "type": "cup",
    "logo": "competitions/ic-logo.png"
  },
  "isActive": true,
  "seasonMeta": {
    "seasonNumber": 5,
    "startDate": "2025-01-15T10:30:00.000Z",
    "endDate": null,
    "winners": [],  // Populated when season ends
    "leagueDivisions": null,
    "cupParticipants": {
      "fighters": [
        "676d6ecceb38b2b97c6da945",  // Sayali Raut (champion)
        "676d7631eb38b2b97c6da9ab",  // Marina Silva
        "676d8542eb38b2b97c6da9bc",  // Lina Chen
        // ... 5 more fighters
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
        "fightIdentifier": "IC-S5-R1-F1",
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
      "perFightFeeInEur": 10000,
      "winningFeeInEur": 100000,
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

### **1. Fight Result Completed**
```javascript
const payload = prepareFightResultPayload(...);
// Includes all fighter updates, standings, etc.
```

### **2. Check 25% Completion**
```javascript
// Automatically called (currently commented)
checkAndCreateICSeasonIfNeeded(
  competitionData,
  leagueCompetitionId,
  leagueSeasonNumber
);
```

### **3. If 25% Threshold Met:**
```
🔍 Checking if IC Season should be created...
   📊 Completion: 27/108 fights (25.00%)
✅ Exactly at 25% completion!

📝 Creating new IC season...
   👥 Total league fighters: 18
   👑 Previous IC champion: Sayali Raut
   ✓ Division 1: Selected Marina Silva
   ✓ Division 2: Selected Lina Chen
   ✓ Division 3: Selected Emma Johnson
   ✓ Random: Selected Sofia Rodriguez
   ✓ Random: Selected Yuki Tanaka
   ✓ Random: Selected Priya Patel
   ✓ Random: Selected Anna Kowalski
   ✅ Selected 8 fighters for IC season
   
   🥊 Fight 1: Sayali Raut vs Marina Silva
   🥊 Fight 2: Lina Chen vs Emma Johnson
   🥊 Fight 3: Sofia Rodriguez vs Yuki Tanaka
   🥊 Fight 4: Priya Patel vs Anna Kowalski

✨ IC Season created successfully!
   🏆 Season: IC S5
   👥 Participants: 8 fighters
   🥊 Round 1 Fights: 4 (all scheduled)
   🔗 Linked to: IFL S1
```

### **4. Save to MongoDB:**
```javascript
// Currently commented - will be uncommented after integration
await Competition.create(icSeasonData);
```

---

## 🛠️ MongoDB Queries Needed

### **1. Check if IC Season Already Exists**
```javascript
const existingICSeasons = await Competition.find({
  'linkedLeagueSeason.competitionId': leagueCompetitionId,
  'linkedLeagueSeason.seasonNumber': leagueSeasonNumber
});

if (existingICSeasons.length > 0) {
  return null; // Already exists
}
```

### **2. Get Previous IC Champion**
```javascript
const IC_COMPETITION_META_ID = '...'; // Get from database

const previousICSeason = await Competition.findOne({
  competitionMetaId: IC_COMPETITION_META_ID
})
.sort({ 'seasonMeta.seasonNumber': -1 })
.limit(1);

const previousChampion = previousICSeason?.seasonMeta?.winners?.[0];
```

### **3. Get IC Competition Meta ID**
```javascript
const icMeta = await CompetitionMeta.findOne({
  competitionName: 'Invicta Cup',
  type: 'cup'
});

const IC_COMPETITION_META_ID = icMeta._id;
```

### **4. Determine New IC Season Number**
```javascript
const latestICSeason = await Competition.findOne({
  competitionMetaId: IC_COMPETITION_META_ID
})
.sort({ 'seasonMeta.seasonNumber': -1 })
.limit(1);

const newSeasonNumber = (latestICSeason?.seasonMeta?.seasonNumber || 0) + 1;
```

---

## ⚠️ Edge Cases

### **Not Enough Fighters**
If after excluding the previous champion, there are fewer than 7 available fighters:
```
❌ Error: Not enough fighters available after excluding champion
```
**Action:** Season cannot be created. Log error and skip.

---

### **Previous Champion Not in Current League**
This is fine! The champion is selected from previous IC, not current league.
```
Previous IC S4 Champion: Sayali Raut
Current IFL S1: Includes Sayali Raut ✅

// Sayali gets automatic IC S5 entry
// 7 other fighters selected from IFL S1
```

---

### **Exactly 25% Multiple Times**
Due to fight scheduling, it's possible (but unlikely) to hit 25% with different completed fights.

**Prevention:**
```javascript
const existingIC = await Competition.find({
  'linkedLeagueSeason.competitionId': leagueCompetitionId,
  'linkedLeagueSeason.seasonNumber': leagueSeasonNumber
});

if (existingIC.length > 0) {
  console.log('IC season already exists');
  return null;
}
```

---

### **Division Has No Fighters Available**
If a division has only the previous champion:
```javascript
const divisionFighters = division.fighters.filter(f => f !== previousChampion);

if (divisionFighters.length === 0) {
  // Skip this division, select more from other divisions
}
```

---

## 🧪 Testing

### **Manual Testing:**

1. **Set up test league:**
   - Create IFL S1 with 18 fighters (6 per division)
   - Total fights: 108

2. **Complete fights until 25%:**
   - Complete 27 fights (exactly 25%)

3. **Trigger check:**
   ```javascript
   const result = await checkAndCreateICSeasonIfNeeded(
     competitionData,
     'competitionId',
     1
   );
   ```

4. **Verify console output:**
   - Should show fighter selection
   - Should create 4 scheduled fights
   - Should log IC season structure

5. **Check for duplicates:**
   - Complete one more fight (28th)
   - Should skip: "Already past 25% threshold"

---

## 📚 Related Documentation

- **FIGHT_RESULT_SERVICE_README.md** - Full service documentation
- **SEASON_COMPLETION_CHECK.md** - Season completion logic
- **Competition Schema** - MongoDB schema for competitions

---

## 🔮 Future Enhancements

1. **Seeded Pairings**: Instead of random, seed fighters by division rankings
2. **Notification System**: Alert fighters when IC season is created
3. **Prize Pool**: Automatically calculate based on league entry fees
4. **Schedule Automation**: Auto-schedule IC fights between league rounds
5. **Historical Stats**: Track IC performance separate from league stats

---

**Last Updated:** November 2, 2025  
**Version:** 1.0.0  
**Status:** ✅ Implemented (MongoDB integration pending)

