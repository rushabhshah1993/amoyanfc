# Quick Season Migration Checklist

Use this checklist when migrating Season 3 or future seasons.

## 📋 Pre-Migration

- [ ] Source files exist:
  - [ ] `old-data/ifc-season{N}-season.json`
  - [ ] `old-data/ifc-season{N}-rounds.json`
  - [ ] `old-data/fighter-mapping.json`
- [ ] MongoDB connection working (`.env` configured)
- [ ] CompetitionMeta document exists in database

## 📝 Step 1: Create Migrated JSON

- [ ] Create `old-data/ifc-season{N}-migrated.json`
- [ ] Set `seasonNumber` to {N}
- [ ] Map all fighter IDs to MongoDB ObjectIds using `fighter-mapping.json`
- [ ] Convert all fight data from rounds.json
- [ ] Set winner(s) in `seasonMeta.leagueDivisions[0].winners`
- [ ] Set all fighters in `seasonMeta.leagueDivisions[0].fighters`
- [ ] Update all `fightIdentifier` to `IFC-S{N}-D1-R{round}-F{fight}`

## ✅ Step 2: Verify Migrated File

```bash
# Count rounds (should be 9)
grep -c '"roundNumber"' old-data/ifc-season{N}-migrated.json

# Count fights (should be 45)
grep -c '"fightIdentifier"' old-data/ifc-season{N}-migrated.json

# Check file size (should be ~650 lines)
wc -l old-data/ifc-season{N}-migrated.json
```

- [ ] 9 rounds present
- [ ] 45 fights present
- [ ] ~650 lines total
- [ ] Winner ObjectId is correct

## 🔧 Step 3: Create Import Script

- [ ] Copy `server/scripts/import-season2-to-db.js` to `import-season{N}-to-db.js`
- [ ] Replace all "Season 2" with "Season {N}"
- [ ] Replace all "season2" with "season{N}"
- [ ] Update season number check from `2` to `{N}` (line ~86)
- [ ] Verify imports include `CompetitionMeta` and `Competition`

## 📦 Step 4: Add NPM Script

In `server/package.json`, add:

```json
"import:season{N}": "node scripts/import-season{N}-to-db.js"
```

- [ ] NPM script added to `package.json`

## 🚀 Step 5: Run Import

```bash
cd server
npm run import:season{N}
```

- [ ] Script runs without errors
- [ ] MongoDB document ID displayed
- [ ] Verification shows correct statistics

## ✨ Step 6: Post-Import Verification

Expected output:
- [ ] ✅ Connected to MongoDB
- [ ] ✅ Loaded Season {N} data
- [ ] ✅ Successfully imported Season {N}
- [ ] Document ID obtained
- [ ] Season Number: {N}
- [ ] Divisions: 1
- [ ] Total Rounds: 9
- [ ] Total Fights: 45
- [ ] Fighters in Division 1: 10
- [ ] Division Winner displayed

## 🎯 Final Checks

- [ ] Query season via GraphQL works
- [ ] Frontend can display Season {N}
- [ ] All fights have correct status ("completed")
- [ ] Winner matches expected fighter
- [ ] Document ID saved for reference

---

## Season 2 Reference (Completed)

✅ **Files Created:**
- `old-data/ifc-season2-migrated.json`
- `server/scripts/import-season2-to-db.js`

✅ **Data:**
- Season Number: 2
- Fighters: 10
- Rounds: 9
- Fights: 45
- Winner: F034 (676d7613eb38b2b97c6da9a9)
- Document ID: `68f0019adf65f41c15654dc4`

---

## For Season 3

Just replace `{N}` with `3` throughout this checklist!

**Estimated Time:** 30-45 minutes

**Difficulty:** Medium (if following the guide)

**Reference:** See `SEASON-MIGRATION-GUIDE.md` for detailed instructions

