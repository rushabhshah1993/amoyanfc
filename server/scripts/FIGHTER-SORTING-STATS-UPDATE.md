# Fighter Sorting Statistics Update

## Overview
Updated the fighter sorting statistics calculation to properly distinguish between league (IFC) and cup competitions (IC/CC) for season counting, while maintaining overall statistics across all competitions.

**Date:** October 20, 2025  
**Status:** ✅ COMPLETE

---

## Changes Made

### File Modified
- `server/resolvers/fighter.resolver.js` - `getAllFightersWithBasicStats` resolver

---

## Updated Logic

### Number of Seasons - IFC ONLY ✅

**Previous Behavior:**
```javascript
// Counted seasons across ALL competitions (IFC, IC, CC, etc.)
const totalSeasons = fighter.competitionHistory?.reduce(
    (sum, comp) => sum + (comp.numberOfSeasonAppearances || 0), 0
) || 0;
```

**Problem:** 
- Included cup competition seasons (IC, CC)
- Inflated season counts
- Did not distinguish between league and cup participation

**New Behavior:**
```javascript
// Calculate total seasons ONLY from IFC (league competitions)
// Cup competitions have divisionNumber: null in seasonDetails
// League competitions have divisionNumber: 1, 2, or 3
const totalSeasons = fighter.competitionHistory?.reduce((sum, comp) => {
    // Check if this is a league competition by checking if any seasonDetail has a non-null divisionNumber
    const isLeagueCompetition = comp.seasonDetails?.some(sd => sd.divisionNumber !== null) || false;
    return sum + (isLeagueCompetition ? (comp.numberOfSeasonAppearances || 0) : 0);
}, 0) || 0;
```

**Solution:**
- Identifies league competitions by checking `divisionNumber !== null`
- Only counts seasons from IFC (Invicta Fighting Championship)
- Excludes IC (Invicta Cup), CC (Champions Cup), and any other cup competitions

---

### Overall Statistics - ALL COMPETITIONS ✅

**Unchanged (Working Correctly):**

```javascript
// Calculate total fights, wins, losses across all competitions
const totalFights = fighter.competitionHistory?.reduce(
    (sum, comp) => sum + (comp.totalFights || 0), 0
) || 0;

const totalWins = fighter.competitionHistory?.reduce(
    (sum, comp) => sum + (comp.totalWins || 0), 0
) || 0;

const totalLosses = fighter.competitionHistory?.reduce(
    (sum, comp) => sum + (comp.totalLosses || 0), 0
) || 0;

const winPercentage = totalFights > 0 ? (totalWins / totalFights) * 100 : 0;
```

**These continue to include:**
- IFC (Invicta Fighting Championship)
- IC (Invicta Cup)
- CC (Champions Cup)
- Any other competitions

---

## Detection Logic

### How League vs Cup is Identified

**League Competitions (IFC):**
- `seasonDetails` have `divisionNumber: 1, 2, or 3`
- Example:
  ```javascript
  {
    seasonNumber: 6,
    divisionNumber: 1,  // ← Non-null indicates league
    fights: 9,
    wins: 6,
    losses: 3
  }
  ```

**Cup Competitions (IC, CC):**
- `seasonDetails` have `divisionNumber: null`
- Example:
  ```javascript
  {
    seasonNumber: 3,
    divisionNumber: null,  // ← Null indicates cup
    fights: 3,
    wins: 3,
    losses: 0,
    finalCupPosition: "Champion"
  }
  ```

---

## Examples

### Example 1: Fighter with IFC + IC

**Fighter:** Sayali Raut

**Competition History:**
- IFC: 6 seasons, 54 fights, 38W-16L
- IC: 2 seasons, 6 fights, 6W-0L

**Calculated Stats:**
- **Number of Seasons (IFC):** 6 ✅ (IFC only)
- **Number of Fights (Overall):** 60 ✅ (54 + 6)
- **Number of Wins (Overall):** 44 ✅ (38 + 6)
- **Number of Defeats (Overall):** 16 ✅ (16 + 0)
- **Win % (Overall):** 73.3% ✅ (44/60)

---

### Example 2: Fighter with IFC Only

**Fighter:** Hetal Boricha

**Competition History:**
- IFC: 5 seasons, 43 fights, 25W-18L

**Calculated Stats:**
- **Number of Seasons (IFC):** 5 ✅ (IFC only)
- **Number of Fights (Overall):** 43 ✅
- **Number of Wins (Overall):** 25 ✅
- **Number of Defeats (Overall):** 18 ✅
- **Win % (Overall):** 58.1% ✅

---

### Example 3: Fighter with IFC + IC + CC

**Hypothetical Fighter:**

**Competition History:**
- IFC: 4 seasons, 36 fights, 20W-16L
- IC: 2 seasons, 4 fights, 2W-2L
- CC: 1 season, 1 fight, 0W-1L

**Calculated Stats:**
- **Number of Seasons (IFC):** 4 ✅ (IFC only)
- **Number of Fights (Overall):** 41 ✅ (36 + 4 + 1)
- **Number of Wins (Overall):** 22 ✅ (20 + 2 + 0)
- **Number of Defeats (Overall):** 19 ✅ (16 + 2 + 1)
- **Win % (Overall):** 53.7% ✅ (22/41)

---

## FightersSortingPage Metrics

### Metrics Using These Stats

| Metric | Data Source | Scope |
|--------|-------------|-------|
| Number of Fights (Overall) | `totalFights` | ALL competitions ✅ |
| Number of Wins (Overall) | `totalWins` | ALL competitions ✅ |
| Number of Defeats (Overall) | `totalLosses` | ALL competitions ✅ |
| Win % (Overall) | `winPercentage` | ALL competitions ✅ |
| Number of Seasons (IFC) | `totalSeasons` | IFC ONLY ✅ |

### Other Metrics (Unchanged)

| Metric | Calculation |
|--------|-------------|
| Number of Opponents Faced | Total unique opponents (all competitions) |
| Number of Titles | Total titles (all competitions) |
| Highest Win Streak (IFC) | IFC streaks only |
| Highest Lose Streak (IFC) | IFC streaks only |

---

## Rationale

### Why Separate Season Counting?

1. **League vs Cup Context:**
   - League seasons (IFC) represent regular, multi-round competitions
   - Cup seasons (IC, CC) are knockout tournaments
   - Mixing them gives misleading "experience" metrics

2. **Sorting Accuracy:**
   - When sorting by "Number of Seasons (IFC)", users want to see IFC experience
   - Including cup tournaments would skew this metric

3. **Statistical Integrity:**
   - A fighter with 5 IFC seasons + 2 IC seasons shouldn't show as "7 seasons"
   - These are different competition formats with different implications

### Why Include All Competitions in Overall Stats?

1. **Complete Fight Record:**
   - Users want to see TOTAL fights, wins, losses
   - Every fight counts toward a fighter's record

2. **True Win Percentage:**
   - Win % should reflect ALL competitive outcomes
   - Excluding cup fights would be misleading

3. **Career Overview:**
   - Overall stats represent the fighter's entire career
   - Includes all competitions they've participated in

---

## Impact on Frontend

### FightersSortingPage Display

**Before:**
```
Name: Sayali Raut
Seasons (IFC): 8  ← WRONG (included IC seasons)
Fights (Overall): 60
Wins (Overall): 44
Win % (Overall): 73.3%
```

**After:**
```
Name: Sayali Raut
Seasons (IFC): 6  ← CORRECT (IFC only)
Fights (Overall): 60
Wins (Overall): 44
Win % (Overall): 73.3%
```

### Sorting Behavior

**Sorting by "Number of Seasons (IFC)":**
- ✅ Now accurately ranks fighters by IFC experience
- ✅ Cup participation doesn't inflate ranking
- ✅ Fighters with more IFC seasons rank higher

**Sorting by "Number of Fights (Overall)":**
- ✅ Includes all fights from all competitions
- ✅ More active fighters (including cups) rank higher
- ✅ Reflects total career activity

---

## Testing

### Verification Steps

1. **Check Fighter with IFC Only:**
   - Verify season count matches IFC seasons exactly
   - Verify overall stats match IFC totals

2. **Check Fighter with IFC + IC:**
   - Verify season count includes only IFC
   - Verify overall stats include both IFC + IC

3. **Check Fighter with IC Only (hypothetical):**
   - Verify season count is 0
   - Verify overall stats include IC fights

4. **Check Sorting:**
   - Sort by "Number of Seasons (IFC)" - should only consider IFC
   - Sort by "Number of Fights (Overall)" - should include all

---

## Edge Cases

### Case 1: Fighter with Cup Participation Only

**Scenario:** Fighter participated in IC but never in IFC

**Behavior:**
- Number of Seasons (IFC): 0 ✅
- Number of Fights (Overall): IC fights counted ✅
- Win % (Overall): Calculated from IC record ✅

**Note:** Will not appear when filtering by "has IFC seasons > 0"

---

### Case 2: Mixed Season Details

**Scenario:** Competition history has corrupted data with mixed divisionNumbers

**Behavior:**
```javascript
const isLeagueCompetition = comp.seasonDetails?.some(
    sd => sd.divisionNumber !== null
) || false;
```

- If ANY seasonDetail has non-null divisionNumber → Counted as league ✅
- This is a fail-safe for data consistency

---

### Case 3: Empty Competition History

**Scenario:** Fighter with no competition history

**Behavior:**
- Number of Seasons (IFC): 0 ✅
- All overall stats: 0 ✅
- Handled by `|| 0` fallback

---

## Related Components

### Components That Use These Stats

1. **FightersSortingPage** (`frontend/src/pages/FightersSortingPage/`)
   - Sorting metrics
   - Filter options
   - Display values

2. **Fighter Profile** (indirectly)
   - May display overall stats
   - Uses same data source

---

## Backend Changes Only

### No Frontend Changes Required

- ✅ Frontend uses the stats as provided by resolver
- ✅ Label already says "Number of Seasons (IFC)"
- ✅ No component code changes needed
- ✅ Just restart backend server for changes to take effect

---

## Deployment Notes

### Steps to Deploy

1. **Backend:**
   ```bash
   # Restart backend server
   npm run server:restart
   # or
   pm2 restart server
   ```

2. **Frontend:**
   - No changes needed
   - May need to refresh browser to clear cached data

3. **Testing:**
   - Navigate to Fighters Sorting page
   - Sort by "Number of Seasons (IFC)"
   - Verify counts are correct (IFC only)
   - Sort by "Number of Fights (Overall)"
   - Verify counts include all competitions

---

## Data Consistency

### Verification Query

To manually verify the calculation is correct:

```javascript
// For a specific fighter in MongoDB
db.fighters.findOne({ firstName: "Sayali", lastName: "Raut" }, {
    competitionHistory: 1
})

// Check competitionHistory
// - IFC entry will have seasonDetails with divisionNumber: 1, 2, or 3
// - IC entry will have seasonDetails with divisionNumber: null
```

---

## Future Considerations

### Potential Additional Metrics

**Option 1: Separate Cup Season Count**
- "Number of Seasons (Cups)" - Count IC + CC seasons
- Provides complete picture of tournament experience

**Option 2: Competition Breakdown**
- "IFC Seasons: 6"
- "Cup Seasons: 2"
- More granular information

**Option 3: Win % by Competition Type**
- "Win % (League): 70%"
- "Win % (Cups): 100%"
- Shows performance in different formats

---

## Success Metrics

| Metric | Status |
|--------|--------|
| IFC seasons counted correctly | ✅ |
| Cup seasons excluded from season count | ✅ |
| Overall fights include all competitions | ✅ |
| Overall wins include all competitions | ✅ |
| Overall losses include all competitions | ✅ |
| Overall win % calculated correctly | ✅ |
| No linter errors | ✅ |
| Backward compatible | ✅ |

---

## Summary

### What Changed
- ✅ Season counting now excludes cup competitions (IC, CC)
- ✅ Season count represents IFC (league) seasons only

### What Stayed the Same
- ✅ Overall fights, wins, losses, win % include ALL competitions
- ✅ All other statistics unchanged
- ✅ Frontend display unchanged (already labeled correctly)

### Result
- ✅ More accurate sorting by IFC experience
- ✅ Complete overall career statistics
- ✅ Clear distinction between league and cup participation

---

**Status:** ✅ COMPLETE  
**Backend Restart Required:** YES  
**Frontend Changes Required:** NO

Season counting is now accurate! 📊

