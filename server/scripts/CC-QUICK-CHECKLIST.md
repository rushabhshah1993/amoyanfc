# Champions Cup (CC) - Quick Implementation Checklist

**Updated:** October 20, 2025  
**Note:** All infrastructure (schema, GraphQL, frontend) already supports cup competitions!

## Pre-Implementation

```bash
# 1. Get CC Meta ID
node -e "const m=require('mongoose');require('dotenv').config();m.connect(process.env.MONGODB_URI).then(async()=>{const r=await m.connection.db.collection('competitionmetas').findOne({competitionName:'Champions Cup'});console.log('CC_META_ID:',r._id.toString());process.exit(0)});"

# 2. Create backups
node server/scripts/backup-fighters.js
node server/scripts/backup-competitions.js

# Record the CC Meta ID:
CC_META_ID = "_________________"
```

---

## Script Creation

For each script, copy from IC version and update:

### 1. Competition History
```bash
cp server/scripts/update-ic-competition-history.js server/scripts/update-cc-competition-history.js
```
**Change:**
- `IC_COMPETITION_META_ID` → `CC_COMPETITION_META_ID`
- `IC_SEASONS = [1,2,3,4]` → `CC_SEASONS = [1,2,3,4,5]`
- All "IC" → "CC" in messages
- All "ic-" → "cc-" in filenames

### 2. Competition History Verification
```bash
cp server/scripts/verify-ic-competition-history.js server/scripts/verify-cc-competition-history.js
```
**Change:** Same as above

### 3. Titles
```bash
cp server/scripts/update-ic-titles.js server/scripts/update-cc-titles.js
```
**Change:** Same as #1

### 4. Titles Verification
```bash
cp server/scripts/verify-ic-titles.js server/scripts/verify-cc-titles.js
```
**Change:** Same as above

### 5. Opponent History
```bash
cp server/scripts/update-ic-opponent-history.js server/scripts/update-cc-opponent-history.js
```
**Change:** Same as #1

### 6. Opponent History Verification
```bash
cp server/scripts/verify-ic-opponent-history.js server/scripts/verify-cc-opponent-history.js
```
**Change:** Same as above

### 7. Streaks
```bash
cp server/scripts/update-ic-streaks.js server/scripts/update-cc-streaks.js
```
**Change:** Same as #1

### 8. Streaks Verification
```bash
cp server/scripts/verify-ic-streaks.js server/scripts/verify-cc-streaks.js
```
**Change:** Same as above

---

## Execution Order

```bash
# 1. Competition History
node server/scripts/update-cc-competition-history.js
node server/scripts/verify-cc-competition-history.js
# Expected: XX fighters updated, 0 errors

# 2. Titles
node server/scripts/update-cc-titles.js
node server/scripts/verify-cc-titles.js
# Expected: 5 championships added, 0 errors

# 3. Opponent History
node server/scripts/update-cc-opponent-history.js
node server/scripts/verify-cc-opponent-history.js
# Expected: 35 fights processed, 70 records, 0 errors

# 4. Streaks
node server/scripts/update-cc-streaks.js
node server/scripts/verify-cc-streaks.js
# Expected: XX streaks added, 0 errors
```

---

## Verification Checklist

### Data ✅
- [ ] All CC fighters have competition history
- [ ] `divisionNumber` is null everywhere
- [ ] `points` is null everywhere
- [ ] `finalCupPosition` set (Champion/Finals/Semifinals/Round 1)
- [ ] 5 championships added with null divisions
- [ ] 35 fights = 70 opponent records (35 × 2)
- [ ] All streaks have `division: null`
- [ ] Zero errors in all verification scripts

### Frontend ✅
- [ ] CC appears in Competition History section
- [ ] No division badges on CC
- [ ] No points column in CC season tables
- [ ] Titles show "2x Champion • S1, S3" (no divisions)
- [ ] Position shows strings (Champion/Finals/etc)
- [ ] CC matchups in Opponents section
- [ ] CC streaks show "S3 R1 - S4 FN" (no division)
- [ ] Hover shows "S3-SF" format

### Fighter Sorting Stats (Automatic) ✅
- [ ] Overall fights include CC (IFC + IC + CC)
- [ ] Overall wins include CC
- [ ] Overall losses include CC
- [ ] Overall win% includes CC
- [ ] IFC seasons exclude CC (IFC only)
- [ ] IFC win% excludes CC (IFC only)

---

## Expected Numbers

| Metric | Value |
|--------|-------|
| Seasons | 5 |
| Fights per Season | 7 |
| Total Fights | 35 |
| Fight Records | 70 (both sides) |
| Championships | 5 |

---

## Quick Troubleshooting

**No CC seasons found?**
→ Check CC meta ID is correct

**Fighter not found?**
→ Verify fighter exists and participated in CC

**Frontend not showing CC?**
→ Restart server, clear cache

**Need to rollback?**
→ Use backup files from step 2

---

## Time Estimate

- Script creation: 30 min
- Execution: 15 min
- Verification: 15 min
- Testing: 10 min
- Stats verification: 2 min
**Total: ~72 minutes**

---

## Search & Replace Template

For each script, use find & replace:

| Find | Replace |
|------|---------|
| `IC_COMPETITION_META_ID` | `CC_COMPETITION_META_ID` |
| `IC_SEASONS` | `CC_SEASONS` |
| `[1, 2, 3, 4]` | `[1, 2, 3, 4, 5]` |
| `IC` (in messages) | `CC` |
| `ic-` (in filenames) | `cc-` |
| `processICSeason` | `processCCSeason` |
| `updateICCompetitionHistory` | `updateCCCompetitionHistory` |
| `updateICTitles` | `updateCCTitles` |
| `updateICOpponentHistory` | `updateCCOpponentHistory` |
| `updateICStreaks` | `updateCCStreaks` |

---

## Important Notes

### Automatic Statistics Integration

Once CC data is added, fighter sorting statistics automatically update:

**What Happens Automatically:**
- ✅ Overall stats (fights, wins, losses, win%) include CC
- ✅ IFC-specific stats (seasons, win%) exclude CC
- ✅ Frontend filters by competition ID - no code changes needed

**Example:**
```
Fighter with IFC (4 seasons, 36 fights, 20W-16L) + IC + CC:

Number of Seasons (IFC): 4 ← IFC only
Win % (IFC): 55.6% ← IFC only
Number of Fights (Overall): 43 ← All competitions
Win % (Overall): 60.5% ← All competitions
```

**How:** Frontend filters `competitionHistory` by IFC competition ID for IFC metrics. Backend aggregates across all competitions for overall metrics.

---

✅ **After completion:** All CC data integrated, frontend works automatically!

