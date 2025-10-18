# Season 10 Migration Guide

**Based on Season 9 Migration Experience (October 18, 2025)**

This comprehensive guide documents the complete process for migrating Season 10 data to MongoDB, including all issues encountered during Season 9 migration and their solutions.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Required Source Files](#required-source-files)
3. [Step-by-Step Migration Process](#step-by-step-migration-process)
4. [Issues Encountered & Solutions](#issues-encountered--solutions)
5. [Verification Checklist](#verification-checklist)
6. [Post-Migration Steps](#post-migration-steps)

---

## Prerequisites

### 1. Source Data Files Required
You must have these files in `/old-data/`:
- ✅ `ifc-season10-season.json` - Season metadata, standings, winners, promotion/relegation
- ✅ `ifc-season10-rounds.json` - All round-by-round fight data
- ✅ `fighter-mapping.json` - Fighter ID to MongoDB ObjectId mapping

### 2. Environment Setup
- ✅ Node.js installed
- ✅ MongoDB connection configured in `.env`
- ✅ All dependencies installed: `npm install`
- ✅ Competition Meta ID: `67780dcc09a4c4b25127f8f6` (IFC)

### 3. Understanding the Source Data Structure

#### `ifc-season10-season.json` contains:
```json
{
  "complete": true,
  "current": false,
  "divisionMeta": [...],         // Metadata for each division
  "divisions": true,
  "finalPositions": [...],       // Final standings per division
  "id": "S0010",
  "label": "Season 10",
  "seasonId": "S0010",
  "timeline": {
    "start": "2023-XX-XXT...",
    "end": "2023-XX-XXT..."
  },
  "winners": [...]               // Winners per division
}
```

#### `ifc-season10-rounds.json` contains:
```json
{
  "division1": {
    "round1": {
      "fights": [...]
    },
    "round2": {...}
  },
  "division2": {...},
  "division3": {...}
}
```

---

## Step-by-Step Migration Process

### Step 1: Create the Migration Script

Create `old-data/migrate-season10.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Read input files
const seasonData = require('./ifc-season10-season.json');
const roundsData = require('./ifc-season10-rounds.json');
const fighterMapping = require('./fighter-mapping.json');

// Constants
const COMPETITION_META_ID = "67780dcc09a4c4b25127f8f6";
const SEASON_NUMBER = 10;

// Helper function to get fighter MongoDB ID
function getFighterMongoId(fighterId) {
  const mongoId = fighterMapping[fighterId];
  if (!mongoId) {
    throw new Error(`Fighter ID ${fighterId} not found in mapping`);
  }
  return mongoId;
}

// Helper function to get winner MongoDB ID
function getWinnerMongoId(winnerId) {
  if (!winnerId) return null;
  return getFighterMongoId(winnerId);
}

// Process divisions and create leagueDivisions array
function createLeagueDivisions() {
  const leagueDivisions = [];
  
  for (let divisionMeta of seasonData.divisionMeta) {
    const divisionNumber = divisionMeta.divisionId;
    const divisionPositions = seasonData.finalPositions.find(
      fp => fp.division === divisionNumber
    ).positions;
    
    // Get all fighters in this division
    const fighters = divisionPositions.map(pos => 
      getFighterMongoId(pos.fighterId)
    );
    
    // Get winner(s) for this division
    const divisionWinner = seasonData.winners.find(
      w => w.division === divisionNumber
    );
    const winners = divisionWinner ? [getFighterMongoId(divisionWinner.winner)] : [];
    
    leagueDivisions.push({
      divisionNumber,
      fighters,
      winners
    });
  }
  
  return leagueDivisions;
}

// Process rounds data for each division
function createLeagueData() {
  const divisions = [];
  
  // Map division keys to division numbers
  const divisionMap = {
    'division1': 1,
    'division2': 2,
    'division3': 3
  };
  
  for (let [divisionKey, divisionRounds] of Object.entries(roundsData)) {
    const divisionNumber = divisionMap[divisionKey];
    const divisionName = `Division ${divisionNumber}`;
    
    // Extract all round keys and sort them
    const roundKeys = Object.keys(divisionRounds).sort((a, b) => {
      const roundNumA = parseInt(a.replace('round', ''));
      const roundNumB = parseInt(b.replace('round', ''));
      return roundNumA - roundNumB;
    });
    
    const totalRounds = roundKeys.length;
    const currentRound = totalRounds; // Season is complete
    
    const rounds = [];
    
    for (let roundKey of roundKeys) {
      const roundNumber = parseInt(roundKey.replace('round', ''));
      const roundData = divisionRounds[roundKey];
      
      // ⚠️ IMPORTANT: Add "IFC-" prefix to fight identifiers
      const fights = roundData.fights.map(fight => ({
        fighter1: getFighterMongoId(fight.player1),
        fighter2: getFighterMongoId(fight.player2),
        winner: getWinnerMongoId(fight.winner),
        fightIdentifier: `IFC-${fight.id}`,  // ← Add IFC- prefix here!
        date: fight.date,
        userDescription: null,
        genAIDescription: null,
        isSimulated: false,
        fighterStats: [],
        fightStatus: "completed"
      }));
      
      rounds.push({
        roundNumber,
        fights
      });
    }
    
    divisions.push({
      divisionNumber,
      divisionName,
      totalRounds,
      currentRound,
      rounds
    });
  }
  
  return { divisions };
}

// Create the final migrated structure
function createMigratedData() {
  const leagueDivisions = createLeagueDivisions();
  const leagueData = createLeagueData();
  
  return {
    competitionMetaId: COMPETITION_META_ID,
    isActive: false,
    seasonMeta: {
      seasonNumber: SEASON_NUMBER,
      startDate: seasonData.timeline.start,
      endDate: seasonData.timeline.end,
      winners: [],
      leagueDivisions,
      cupParticipants: {
        fighters: []
      }
    },
    leagueData
  };
}

// Main execution
try {
  console.log('Starting Season 10 migration...');
  
  const migratedData = createMigratedData();
  
  // Write to file
  const outputPath = path.join(__dirname, 'ifc-season10-migrated.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(migratedData, null, 2),
    'utf8'
  );
  
  console.log('✓ Successfully created ifc-season10-migrated.json');
  console.log(`  - Season: ${SEASON_NUMBER}`);
  console.log(`  - Divisions: ${migratedData.seasonMeta.leagueDivisions.length}`);
  console.log(`  - Total Fights: ${migratedData.leagueData.divisions.reduce((sum, div) => 
    sum + div.rounds.reduce((rSum, round) => rSum + round.fights.length, 0), 0
  )}`);
  
  // Print summary by division
  migratedData.leagueData.divisions.forEach(div => {
    const totalFights = div.rounds.reduce((sum, round) => sum + round.fights.length, 0);
    console.log(`  - Division ${div.divisionNumber}: ${div.totalRounds} rounds, ${totalFights} fights`);
  });
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
```

### Step 2: Run the Migration Script

```bash
cd old-data
node migrate-season10.js
```

**Expected Output:**
```
Starting Season 10 migration...
✓ Successfully created ifc-season10-migrated.json
  - Season: 10
  - Divisions: 3
  - Total Fights: 231
  - Division 1: 9 rounds, 45 fights
  - Division 2: 11 rounds, 66 fights
  - Division 3: 15 rounds, 120 fights
```

### Step 3: Verify the Migrated File

Check that fight identifiers have the correct "IFC-" prefix:

```bash
# Should show: IFC-S10-D1-R1-F1
grep -m 5 "fightIdentifier" old-data/ifc-season10-migrated.json
```

**✅ CORRECT FORMAT:** `"fightIdentifier": "IFC-S10-D1-R1-F1"`
**❌ INCORRECT FORMAT:** `"fightIdentifier": "S10-D1-R1-F1"`

⚠️ **CRITICAL:** The "IFC-" prefix is required! Season 9 was initially created without it and had to be fixed.

### Step 4: Create the Import Script

Create `server/scripts/import-season10-to-db.js`:

```javascript
/**
 * Import IFC Season 10 Competition Data to MongoDB
 * This script imports the migrated Season 10 data into the database
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// ⚠️ IMPORTANT: Import CompetitionMeta BEFORE Competition
// This is required for pre-save hooks to work correctly
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log(`✅ Connected to MongoDB at ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Load Season 10 data from JSON file
 */
function loadSeason10Data() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season10-migrated.json');
  
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const seasonData = JSON.parse(rawData);
  
  console.log(`✅ Loaded Season 10 data with ${seasonData.leagueData.divisions.length} divisions`);
  
  return seasonData;
}

/**
 * Import Season 10 data to database
 */
async function importSeason10Data() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 10 - COMPETITION DATA IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load Season 10 data
    const seasonData = loadSeason10Data();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));

    // Check if Season 10 data already exists
    const existingCompetition = await Competition.findOne({
      competitionMetaId: seasonData.competitionMetaId,
      'seasonMeta.seasonNumber': 10
    });

    if (existingCompetition) {
      console.log(`\n⚠️  WARNING: Found existing competition data for Season 10!`);
      console.log(`   Existing Season ID: ${existingCompetition._id}`);
      console.log('   This script will DELETE the existing Season 10 and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season 10...');
      await Competition.findByIdAndDelete(existingCompetition._id);
      console.log('✅ Deleted existing Season 10 document');
    } else {
      console.log('\n✅ No existing Season 10 data found. Proceeding with fresh import...');
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    // Import CompetitionMeta update
    console.log('\n📥 Updating CompetitionMeta...');
    
    const competitionMetaData = {
      competitionName: 'Invictus Fighting Championship',
      type: 'league',
      logo: 'https://amoyanfc-assets.s3.amazonaws.com/competitions/ifc.png',
      isActive: seasonData.isActive,
      seasonMeta: seasonData.seasonMeta
    };

    await CompetitionMeta.findByIdAndUpdate(
      seasonData.competitionMetaId,
      { $set: competitionMetaData },
      { upsert: true, new: true }
    );
    console.log('✅ CompetitionMeta updated successfully!');

    // Import Competition data
    console.log('\n📥 Creating Season 10 competition document...');
    
    const newCompetition = new Competition(seasonData);
    const savedCompetition = await newCompetition.save();
    
    console.log('✅ Season 10 competition data imported successfully!');
    console.log(`   Document ID: ${savedCompetition._id}`);

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const importedCompetition = await Competition.findById(savedCompetition._id);

    console.log(`\n✅ Season 10 data verified in database:`);
    console.log(`   - Season Number: ${importedCompetition.seasonMeta.seasonNumber}`);
    console.log(`   - Competition Meta ID: ${importedCompetition.competitionMetaId}`);
    console.log(`   - Is Active: ${importedCompetition.isActive}`);
    console.log(`   - Divisions: ${importedCompetition.leagueData.divisions.length}`);
    console.log(`   - Start Date: ${importedCompetition.seasonMeta.startDate}`);
    console.log(`   - End Date: ${importedCompetition.seasonMeta.endDate}`);

    // Show statistics by division
    console.log(`\n📊 Data per Division:`);
    importedCompetition.leagueData.divisions.forEach(division => {
      const totalFights = division.rounds.reduce((sum, round) => sum + round.fights.length, 0);
      const fighters = importedCompetition.seasonMeta.leagueDivisions.find(d => d.divisionNumber === division.divisionNumber);
      console.log(`   Division ${division.divisionNumber}:`);
      console.log(`     - Fighters: ${fighters?.fighters.length || 0}`);
      console.log(`     - Rounds: ${division.totalRounds}`);
      console.log(`     - Fights: ${totalFights}`);
      console.log(`     - Winner: ${fighters?.winners[0] || 'N/A'}`);
    });

    // Show sample data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA (Division 1, Round 1)');
    console.log('='.repeat(70));

    const firstDivision = importedCompetition.leagueData.divisions.find(d => d.divisionNumber === 1);
    if (firstDivision) {
      console.log(`\nDivision: ${firstDivision.divisionName}`);
      console.log(`Rounds: ${firstDivision.totalRounds}`);
      console.log(`Current Round: ${firstDivision.currentRound}`);
      
      const firstRound = firstDivision.rounds.find(r => r.roundNumber === 1);
      if (firstRound && firstRound.fights.length > 0) {
        const firstFight = firstRound.fights[0];
        console.log(`\nFirst Fight: ${firstFight.fightIdentifier}`);
        console.log(`  Fighter 1: ${firstFight.fighter1}`);
        console.log(`  Fighter 2: ${firstFight.fighter2}`);
        console.log(`  Winner: ${firstFight.winner}`);
        console.log(`  Date: ${firstFight.date}`);
        console.log(`  Status: ${firstFight.fightStatus}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 10 competition data has been imported to MongoDB!');
    console.log(`Document ID: ${savedCompetition._id}`);
    console.log('\n📋 Summary:');
    console.log(`   - Total Divisions: ${importedCompetition.leagueData.divisions.length}`);
    console.log(`   - Total Rounds: ${importedCompetition.leagueData.divisions.reduce((sum, d) => sum + d.rounds.length, 0)}`);
    console.log(`   - Total Fights: ${importedCompetition.leagueData.divisions.reduce((sum, d) => sum + d.rounds.reduce((s, r) => s + r.fights.length, 0), 0)}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the import
importSeason10Data();
```

### Step 5: Run the Import to MongoDB

```bash
cd /Users/rushabhshah/Personal\ Projects/amoyanfc
node server/scripts/import-season10-to-db.js
```

**Expected Output:**
- ✅ Connected to MongoDB
- ✅ Loaded Season 10 data
- ✅ Competition data imported
- ✅ Verification successful
- 📊 Statistics displayed
- 🎉 Success message with Document ID

---

## Issues Encountered & Solutions

### Issue #1: Missing "IFC-" Prefix in Fight Identifiers

**Problem:**
During Season 9 migration, fight identifiers were created as `S9-D1-R1-F1` instead of `IFC-S9-D1-R1-F1`.

**Impact:**
- Inconsistent with Seasons 1-4 format
- Breaks search functionality
- Requires database updates

**Root Cause:**
The migration script didn't add the "IFC-" prefix when creating fightIdentifier.

**Solution:**
```javascript
// ❌ WRONG:
fightIdentifier: fight.id,

// ✅ CORRECT:
fightIdentifier: `IFC-${fight.id}`,
```

**Verification:**
```bash
# Check format is correct
grep -m 1 "fightIdentifier" old-data/ifc-season10-migrated.json
# Should output: "fightIdentifier": "IFC-S10-D1-R1-F1"
```

### Issue #2: Schema Not Registered Error

**Problem:**
```
MissingSchemaError: Schema hasn't been registered for model "CompetitionMeta"
```

**Root Cause:**
Competition model has a pre-save hook that references CompetitionMeta, but CompetitionMeta wasn't imported before Competition.

**Solution:**
```javascript
// ⚠️ IMPORTANT: Order matters!

// ✅ CORRECT ORDER:
import { CompetitionMeta } from '../models/competition-meta.model.js';  // Import first
import { Competition } from '../models/competition.model.js';           // Import second

// ❌ WRONG ORDER:
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
```

### Issue #3: Fighter ID Mapping Errors

**Problem:**
```
Error: Fighter ID F999 not found in mapping
```

**Root Cause:**
Fighter ID in source data doesn't exist in `fighter-mapping.json`.

**Solution:**
1. Check if fighter exists in database
2. If fighter exists, add to `fighter-mapping.json`:
   ```json
   "F999": "676d7xxxxxxxxxxxxxxxxxxxxx"
   ```
3. If fighter doesn't exist, create fighter document first

**Prevention:**
Always verify all fighter IDs exist in mapping before running migration:
```bash
# Extract unique fighter IDs from season data
# Compare with fighter-mapping.json
```

### Issue #4: Incorrect Division Structure

**Problem:**
Season 9 has 3 divisions with different numbers of fighters (10, 12, 16), but the structure wasn't handling this correctly.

**Root Cause:**
Hardcoded assumptions about division structure.

**Solution:**
Dynamic division processing that reads:
- Number of divisions from data
- Number of fighters per division from finalPositions
- Number of rounds per division from rounds data

### Issue #5: Date Format Validation

**Problem:**
Dates in source files are ISO strings, but might need validation.

**Solution:**
The script preserves dates as-is from source data. If dates are missing, they remain as provided in the source.

---

## Verification Checklist

After import, verify the following:

### ✅ Database Checks:
- [ ] Season 10 document exists in MongoDB
- [ ] Season number is 10
- [ ] Competition Meta ID is correct
- [ ] isActive is false (season complete)
- [ ] All 3 divisions present

### ✅ Division 1 Checks:
- [ ] 10 fighters
- [ ] 9 rounds
- [ ] 45 fights
- [ ] Winner is set
- [ ] All fight IDs start with "IFC-S10-D1-"

### ✅ Division 2 Checks:
- [ ] 12 fighters
- [ ] 11 rounds
- [ ] 66 fights
- [ ] Winner is set
- [ ] All fight IDs start with "IFC-S10-D2-"

### ✅ Division 3 Checks:
- [ ] 16 fighters
- [ ] 15 rounds
- [ ] 120 fights
- [ ] Winner is set
- [ ] All fight IDs start with "IFC-S10-D3-"

### ✅ Fight Data Checks:
- [ ] All fights have fighter1, fighter2
- [ ] All fights have winner
- [ ] All fights have date
- [ ] All fights have fightStatus: "completed"
- [ ] fightIdentifier format: `IFC-S10-D#-R#-F#`

### ✅ Manual Verification:
```bash
# Check first fight identifier
mongo --eval 'db.competitions.findOne({"seasonMeta.seasonNumber": 10}).leagueData.divisions[0].rounds[0].fights[0].fightIdentifier'

# Count total fights
mongo --eval 'db.competitions.aggregate([
  {$match: {"seasonMeta.seasonNumber": 10}},
  {$project: {
    totalFights: {
      $sum: {
        $map: {
          input: "$leagueData.divisions",
          in: {
            $sum: {
              $map: {
                input: "$$this.rounds",
                in: {$size: "$$this.fights"}
              }
            }
          }
        }
      }
    }
  }}
])'
```

---

## Post-Migration Steps

After successful migration:

### 1. Create Migration Summary
Create `old-data/SEASON10-MIGRATION-SUMMARY.md` documenting:
- Migration date
- Source files used
- Statistics (fights, divisions, fighters)
- Winners by division
- Any issues encountered
- MongoDB Document ID

### 2. Update Competition History
Run scripts to update:
- Fighter competition history
- Opponent history
- Win/loss streaks
- Title records

Example commands:
```bash
node server/scripts/calculate-season10-competition-history.js
node server/scripts/calculate-season10-opponent-history.js
node server/scripts/calculate-season10-streaks.js
node server/scripts/update-season10-titles.js
```

### 3. Update Fighter Season Appearances
```bash
node server/scripts/update-season-appearances.js
```

### 4. Calculate and Import Standings
If standings data needed:
```bash
node server/scripts/calculate-season10-standings.js
node server/scripts/import-season10-standings-to-db.js
```

### 5. Verify Frontend Display
- Check season appears in competition list
- Verify division pages load correctly
- Test fight history displays properly
- Confirm fighter records updated

---

## Quick Reference Commands

### Migration Process:
```bash
# Step 1: Create migrated JSON
cd old-data
node migrate-season10.js

# Step 2: Verify format
grep -m 5 "fightIdentifier" old-data/ifc-season10-migrated.json

# Step 3: Import to MongoDB
cd ..
node server/scripts/import-season10-to-db.js
```

### Verification:
```bash
# Check MongoDB document
mongo <connection-string>
> db.competitions.findOne({"seasonMeta.seasonNumber": 10})

# Count documents
> db.competitions.countDocuments({"seasonMeta.seasonNumber": 10})
# Should return: 1
```

### Cleanup:
```bash
# Remove migration script after success
rm old-data/migrate-season10.js
```

---

## Expected File Structure After Migration

```
old-data/
├── ifc-season10-season.json          (source)
├── ifc-season10-rounds.json          (source)
├── ifc-season10-migrated.json        (generated)
├── SEASON10-MIGRATION-SUMMARY.md     (to be created)
└── fighter-mapping.json               (reference)

server/scripts/
├── import-season10-to-db.js          (created)
├── calculate-season10-competition-history.js   (to be created)
├── calculate-season10-opponent-history.js      (to be created)
├── calculate-season10-streaks.js               (to be created)
└── update-season10-titles.js                   (to be created)
```

---

## Success Criteria

Season 10 migration is successful when:

1. ✅ `ifc-season10-migrated.json` created with correct structure
2. ✅ All fight identifiers have "IFC-" prefix
3. ✅ MongoDB document created successfully
4. ✅ All 231 fights imported (45 + 66 + 120)
5. ✅ All divisions have correct fighter counts
6. ✅ Winners set for all divisions
7. ✅ Verification queries return correct data
8. ✅ Frontend displays season correctly
9. ✅ No errors in console or logs
10. ✅ Migration summary document created

---

## Lessons Learned from Season 9

### ✅ What Worked Well:
1. Automated migration script approach
2. Comprehensive verification at each step
3. Clear error messages with context
4. Ability to re-run import safely

### ⚠️ What to Watch For:
1. Always add "IFC-" prefix to fight identifiers
2. Import CompetitionMeta before Competition model
3. Verify fighter mapping is complete before starting
4. Double-check division structure matches source data
5. Test with small dataset first if unsure

### 🎯 Best Practices:
1. Keep source files immutable
2. Generate migrated file via script (don't hand-edit)
3. Verify at every step
4. Document issues immediately
5. Create comprehensive summary after completion

---

## Support & References

### Related Documents:
- `SEASON9-MIGRATION-SUMMARY.md` - Previous season reference
- `FIGHTID-PREFIX-FIX-SUMMARY.md` - Fight ID format fix
- `SEASON-MIGRATION-GUIDE.md` - General migration guide
- `fighter-mapping.json` - Fighter ID mappings

### Common Queries:
```javascript
// Find Season 10
db.competitions.findOne({"seasonMeta.seasonNumber": 10})

// Get all fight identifiers
db.competitions.aggregate([
  {$match: {"seasonMeta.seasonNumber": 10}},
  {$unwind: "$leagueData.divisions"},
  {$unwind: "$leagueData.divisions.rounds"},
  {$unwind: "$leagueData.divisions.rounds.fights"},
  {$project: {
    fightId: "$leagueData.divisions.rounds.fights.fightIdentifier"
  }},
  {$limit: 10}
])
```

---

**Last Updated:** October 18, 2025  
**Created By:** AI Assistant  
**Based On:** Season 9 Migration Experience  
**Next Season:** Follow this guide for Season 11+

---

## Questions?

If you encounter issues not covered in this guide:
1. Check the "Issues Encountered & Solutions" section
2. Review Season 9 migration summary
3. Verify all prerequisites are met
4. Check MongoDB connection and permissions
5. Ensure fighter-mapping.json is up to date

---

**Good luck with Season 10 migration! 🚀**

