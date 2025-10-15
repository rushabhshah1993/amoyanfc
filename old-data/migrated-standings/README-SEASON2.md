# Season 2 Standings - Quick Reference

## File Location
`/old-data/migrated-standings/season2-all-rounds-standings.json`

## Stats
- **Entries:** 45 (one per fight)
- **Size:** 95 KB
- **Lines:** 4,141
- **Status:** ✅ Ready for verification

## Quick Verification

```bash
# Check entry count
jq 'length' season2-all-rounds-standings.json
# Expected: 45

# Check first fight
jq '.[0].fightIdentifier' season2-all-rounds-standings.json
# Expected: "IFC-S2-D1-R1-F1"

# Check last fight
jq '.[-1].fightIdentifier' season2-all-rounds-standings.json
# Expected: "IFC-S2-D1-R9-F5"

# Check final winner
jq '.[-1].standings[0]' season2-all-rounds-standings.json
# Shows top ranked fighter
```

## Import to MongoDB

Once verified, use the import script:

```bash
cd server
npm run import:season2-standings
```

*(Import script to be created)*

## Important Notes

⚠️ **Tiebreaker Discrepancy Found**

The calculated standings show a different order for the top 3 fighters compared to the original season data. All three finished with 21 points (7 wins, 2 losses).

**Calculated:**
1. F030
2. F034  
3. F010

**Original Season Data:**
1. F034 ✓ (marked as winner)
2. F010
3. F030

**Recommendation:** Review the head-to-head records between these three fighters before finalizing the import.

## See Also
- `SEASON2-STANDINGS-SUMMARY.md` - Detailed analysis
- `season2-all-rounds-standings.json` - Full data file

