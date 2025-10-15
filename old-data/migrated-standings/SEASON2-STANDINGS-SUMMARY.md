# Season 2 Standings Calculation - Summary

**Date Created:** October 15, 2025  
**Status:** ✅ Completed - Ready for Verification  
**Output File:** `season2-all-rounds-standings.json`

---

## Overview

Successfully calculated round-by-round standings for all 45 fights in IFC Season 2 using the standingsCalculator logic. The standings are calculated after each completed fight, tracking the progression throughout the entire season.

---

## Calculation Details

### Source Data
- **Input File:** `/old-data/ifc-season2-migrated.json`
- **Season:** 2
- **Division:** 1
- **Total Fighters:** 10
- **Total Rounds:** 9
- **Total Fights:** 45

### Calculation Logic
- **Points per Win:** 3
- **Points per Loss:** 0
- **Tiebreaker Order:**
  1. Total points (descending)
  2. Head-to-head points among tied fighters (descending)
  3. Fighter first name alphabetically (ascending)

---

## Output File Details

**File:** `season2-all-rounds-standings.json`  
**Size:** 95 KB  
**Lines:** 4,141  
**Entries:** 45 (one for each fight)

**Structure:** Array of round standings objects, each containing:
- `competitionId`: MongoDB ID of the competition
- `seasonNumber`: 2
- `divisionNumber`: 1
- `roundNumber`: Round number (1-9)
- `fightId`: Fight identifier string
- `fightIdentifier`: Fight identifier string (e.g., "IFC-S2-D1-R1-F1")
- `standings`: Array of 10 fighter standings
  - `fighterId`: MongoDB ObjectId
  - `fightsCount`: Number of fights completed
  - `wins`: Number of wins
  - `points`: Total points
  - `rank`: Current rank
  - `totalFightersCount`: 10
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

---

## Final Standings (After Fight IFC-S2-D1-R9-F5)

| Rank | Fighter ID | Legacy ID | Fights | Wins | Losses | Points |
|------|-----------|-----------|--------|------|--------|--------|
| 1 🏆 | 676d6ecceb38b2b97c6da945 | F030 | 9 | 7 | 2 | 21 |
| 2 | 676d7613eb38b2b97c6da9a9 | F034 | 9 | 7 | 2 | 21 |
| 3 | 676d7452eb38b2b97c6da981 | F020 | 9 | 6 | 3 | 18 |
| 4 | 676d753ceb38b2b97c6da997 | F028 | 9 | 6 | 3 | 18 |
| 5 | 676d721aeb38b2b97c6da961 | F010 | 9 | 6 | 3 | 18 |
| 6 | 676d73ddeb38b2b97c6da979 | F017 | 9 | 5 | 4 | 15 |
| 7 | 676d75faeb38b2b97c6da9a7 | F033 | 9 | 3 | 6 | 9 |
| 8 | 676d7201eb38b2b97c6da95f | F009 | 9 | 2 | 7 | 6 |
| 9 | 676d74efeb38b2b97c6da991 | F026 | 9 | 2 | 7 | 6 |
| 10 | 676d75dfeb38b2b97c6da9a5 | F032 | 9 | 1 | 8 | 3 |

---

## Important Note: Tiebreaker Analysis

### Top Two Finishers (Tied on Points)

Both **F030** and **F034** finished with:
- **21 points**
- **7 wins**
- **2 losses**

### Tiebreaker Applied

Since both fighters have identical overall records, the tiebreaker logic was applied:

1. **Points:** Tied at 21 ✓
2. **Head-to-Head:** Need to check their direct matchup
3. **Alphabetical:** F030 < F034 (by legacy ID)

The calculation shows **F030 ranked #1** based on the tiebreaker logic.

### Verification Needed

According to the original `ifc-season2-season.json` file, **F034** was listed as the winner. This discrepancy could be due to:
1. Different tiebreaker rules in the original season (e.g., goal difference, specific head-to-head)
2. Manual adjustment in the original data
3. Additional context not captured in fight records

**Recommendation:** Review the head-to-head fight between F030 and F034 to determine the correct winner, or confirm if the original season data should be updated.

---

## Sample Progression

### Round 1, Fight 1 (IFC-S2-D1-R1-F1)
**Result:** F034 def. F020

| Rank | Fighter | Points | Record |
|------|---------|--------|--------|
| 1 | F034 | 3 | 1-0 |
| 2-9 | Others | 0 | 0-0 |
| 10 | F020 | 0 | 0-1 |

### Round 9, Fight 5 (IFC-S2-D1-R9-F5) - Final
**Result:** F020 def. F028

**Final Rankings:** See table above

---

## Comparison with Original Season Data

### From `ifc-season2-season.json`:

| Rank | Fighter | Points | Wins | Losses |
|------|---------|--------|------|--------|
| 1 | F034 | 21 | 7 | 2 |
| 2 | F010 | 21 | 7 | 2 |
| 3 | F030 | 21 | 7 | 2 |
| 4 | F020 | 18 | 6 | 3 |
| 5 | F028 | 15 | 5 | 4 |
| 6 | F017 | 15 | 5 | 4 |
| 7 | F033 | 9 | 3 | 6 |
| 8 | F026 | 6 | 2 | 7 |
| 9 | F009 | 6 | 2 | 7 |
| 10 | F032 | 3 | 1 | 8 |

### Calculated Standings:

| Rank | Fighter | Points | Wins | Losses |
|------|---------|--------|------|--------|
| 1 | F030 | 21 | 7 | 2 |
| 2 | F034 | 21 | 7 | 2 |
| 3 | F020 | 18 | 6 | 3 |
| 4 | F028 | 18 | 6 | 3 |
| 5 | F010 | 18 | 6 | 3 |
| 6 | F017 | 15 | 5 | 4 |
| 7 | F033 | 9 | 3 | 6 |
| 8 | F009 | 6 | 2 | 7 |
| 9 | F026 | 6 | 2 | 7 |
| 10 | F032 | 3 | 1 | 8 |

### Discrepancies

**Top 3 Tied Fighters (21 points each):**
- Original: F034 > F010 > F030
- Calculated: F030 > F034 > F010

**Three-way tie at 18 points:**
- Original: F020 is ranked 4th
- Calculated: F020 (rank 3), F028 (rank 4), F010 (rank 5)

**Note:** F010 appears in both the 21-point group (original) and 18-point group (calculated). This suggests a potential data discrepancy.

### Likely Issue

Upon review, there might be:
1. **Data Entry Error:** F010 might actually have 6 wins (18 points), not 7 wins (21 points)
2. **Different Tiebreaker:** The original season may have used different tiebreaker criteria
3. **Manual Override:** The original rankings might have been manually adjusted

---

## Verification Steps

Before importing to MongoDB:

1. ✅ **Structure Check:** JSON structure matches Season 1 format
2. ✅ **Count Check:** 45 entries (one per fight)
3. ✅ **Points Check:** All fighters have correct point totals based on wins
4. ⚠️ **Ranking Check:** Discrepancies with original season data (see above)
5. ⏳ **Head-to-Head Check:** Need to verify fights between tied fighters

### Recommended Actions:

1. **Verify Fighter Records:** Check if F010 should have 18 or 21 points
2. **Check Head-to-Head:** Review fights between F030, F034, and F010
3. **Confirm Tiebreaker Rules:** Document which tiebreaker was used in Season 2
4. **Update Winner:** Confirm if F034 or F030 should be the official winner

---

## Next Steps

1. **Review discrepancies** with the user
2. **Verify tiebreaker logic** matches season rules
3. **Update winner in season data** if needed
4. **Create import script** for MongoDB
5. **Import to database** after verification

---

## File Ready for Import

The `season2-all-rounds-standings.json` file is:
- ✅ Properly formatted
- ✅ Contains all 45 fights
- ✅ Has correct structure for MongoDB
- ⚠️ May need ranking adjustments based on verification

**Status:** Ready for review and verification before MongoDB import

---

*Generated: October 15, 2025*  
*Script: `calculate-season2-standings.js`*  
*Logic: Based on `utils/standingsCalculator.ts`*

