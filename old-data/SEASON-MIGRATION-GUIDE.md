# Season Migration Guide

This guide documents the complete process for migrating historical season data into the MongoDB database. This process was used for Season 1 and Season 2, and can be followed for Season 3 and beyond.

## Overview

The migration process transforms legacy season data (fighter IDs, fight results, standings) into the MongoDB schema format required by the application. This involves:
1. Creating a migrated JSON file with proper structure
2. Creating an import script
3. Running the import to populate MongoDB

---

## Prerequisites

Before starting the migration:

1. ✅ **Source Data Files** must exist in `/old-data/`:
   - `ifc-season{N}-season.json` - Season metadata and final standings
   - `ifc-season{N}-rounds.json` - Round-by-round fight data
   - `fighter-mapping.json` - Mapping from legacy fighter IDs (F001, F002, etc.) to MongoDB ObjectIds

2. ✅ **MongoDB Setup**:
   - MongoDB connection configured in `.env`
   - CompetitionMeta document exists (e.g., `67780dcc09a4c4b25127f8f6` for IFC)
   - Fighter documents created with proper ObjectIds

3. ✅ **Environment**:
   - Node.js and npm installed
   - All dependencies installed (`npm install`)

---

## Step-by-Step Migration Process

### Step 1: Verify Source Data

Ensure you have the required source files:

```bash
ls -la old-data/ifc-season{N}-*.json
```

For Season 2, we had:
- `ifc-season2-season.json` - Contains final positions, winners, season metadata
- `ifc-season2-rounds.json` - Contains all fight data for 9 rounds
- `ifc-season2-tables.json` - Contains round-by-round point totals (optional, for verification)

### Step 2: Create Migrated JSON File

Create `old-data/ifc-season{N}-migrated.json` with the proper structure.

**File Structure Template:**

```json
{
  "competitionMetaId": "67780dcc09a4c4b25127f8f6",
  "isActive": false,
  "seasonMeta": {
    "seasonNumber": {N},
    "startDate": null,
    "endDate": null,
    "winners": [],
    "leagueDivisions": [
      {
        "divisionNumber": 1,
        "fighters": [
          "MongoDB ObjectId 1",
          "MongoDB ObjectId 2",
          ...
        ],
        "winners": [
          "Winner MongoDB ObjectId"
        ]
      }
    ],
    "cupParticipants": {
      "fighters": []
    }
  },
  "leagueData": {
    "divisions": [
      {
        "divisionNumber": 1,
        "divisionName": "Division 1",
        "totalRounds": 9,
        "currentRound": 9,
        "rounds": [
          {
            "roundNumber": 1,
            "fights": [
              {
                "fighter1": "MongoDB ObjectId",
                "fighter2": "MongoDB ObjectId",
                "winner": "MongoDB ObjectId",
                "fightIdentifier": "IFC-S{N}-D1-R1-F1",
                "date": null,
                "userDescription": null,
                "genAIDescription": null,
                "isSimulated": false,
                "fighterStats": [],
                "fightStatus": "completed"
              }
            ]
          }
        ]
      }
    ],
    "activeLeagueFights": []
  },
  "cupData": null,
  "config": {
    "leagueConfiguration": {
      "numberOfDivisions": 1,
      "fightersPerDivision": [
        {
          "divisionNumber": 1,
          "numberOfFighters": 10
        }
      ],
      "perFightFeePerDivision": [],
      "winningFeePerDivision": [],
      "fighterOfTheSeasonPrizeMoneyInEur": null,
      "pointsPerWin": 3
    },
    "cupConfiguration": null
  },
  "linkedLeagueSeason": null,
  "createdAt": null,
  "updatedAt": null
}
```

**Key Mapping Steps:**

1. **Map Fighter IDs to MongoDB ObjectIds** using `fighter-mapping.json`:
   ```
   F009 → 676d7201eb38b2b97c6da95f
   F010 → 676d721aeb38b2b97c6da961
   etc.
   ```

2. **Convert Fight Data** from `ifc-season{N}-rounds.json`:
   - Extract each round's fights
   - Map fighter1, fighter2, and winner using the mapping file
   - Generate proper fightIdentifier: `IFC-S{N}-D1-R{round}-F{fight}`
   - Set fightStatus to "completed"

3. **Set Season Metadata** from `ifc-season{N}-season.json`:
   - Season number
   - List of fighters in the division (converted to ObjectIds)
   - Winner(s) (converted to ObjectIds)

4. **Configure Division Settings**:
   - For seasons without divisions: `numberOfDivisions: 1`
   - For single division: all fighters in Division 1
   - totalRounds: count from rounds data (typically 9 for 10 fighters)
   - currentRound: set to final round number

### Step 3: Verify the Migrated File

Quick verification checks:

```bash
# Check file exists and has content
cat old-data/ifc-season{N}-migrated.json | head -50

# Count rounds (should be 9)
grep -c '"roundNumber"' old-data/ifc-season{N}-migrated.json

# Count fights (should be 45 for 10 fighters, 9 rounds)
grep -c '"fightIdentifier"' old-data/ifc-season{N}-migrated.json

# Check line count (should be ~650 lines)
wc -l old-data/ifc-season{N}-migrated.json
```

**Expected Counts for Single Division (10 fighters):**
- Rounds: 9
- Fights: 45 (5 fights per round)
- Lines: ~650

### Step 4: Create Import Script

Create `server/scripts/import-season{N}-to-db.js`:

**Template Script:**

```javascript
/**
 * Import IFC Season {N} Competition Data to MongoDB
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models (CompetitionMeta must be imported for pre-save hooks)
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function loadSeasonData() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season{N}-migrated.json');
  
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const seasonData = JSON.parse(rawData);
  
  console.log(`✅ Loaded Season {N} data`);
  console.log(`   - Season Number: ${seasonData.seasonMeta.seasonNumber}`);
  console.log(`   - Divisions: ${seasonData.leagueData.divisions.length}`);
  console.log(`   - Total Rounds: ${seasonData.leagueData.divisions[0]?.totalRounds || 0}`);
  
  return seasonData;
}

async function importSeason() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON {N} - COMPETITION DATA IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    await connectDB();
    const seasonData = loadSeasonData();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));

    // Check if Season already exists
    const existingSeason = await Competition.findOne({
      competitionMetaId: seasonData.competitionMetaId,
      'seasonMeta.seasonNumber': {N}
    });

    if (existingSeason) {
      console.log('\n⚠️  WARNING: Season {N} already exists in the database!');
      console.log(`   Existing Season ID: ${existingSeason._id}`);
      console.log('   This script will DELETE the existing Season {N} and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season {N}...');
      await Competition.findByIdAndDelete(existingSeason._id);
      console.log('✅ Deleted existing Season {N} document');
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    console.log('\n📥 Creating Season {N} document...');
    const newSeason = new Competition(seasonData);
    const savedSeason = await newSeason.save();
    
    console.log('✅ Successfully imported Season {N}!');
    console.log(`   Document ID: ${savedSeason._id}`);

    // Verification
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifiedSeason = await Competition.findById(savedSeason._id);

    if (!verifiedSeason) {
      throw new Error('Season {N} document not found after import!');
    }

    console.log('\n✅ Season {N} verified in database:');
    console.log(`   - Season Number: ${verifiedSeason.seasonMeta.seasonNumber}`);
    console.log(`   - Competition Meta ID: ${verifiedSeason.competitionMetaId}`);
    console.log(`   - Is Active: ${verifiedSeason.isActive}`);
    console.log(`   - Divisions: ${verifiedSeason.leagueData.divisions.length}`);
    
    const division = verifiedSeason.leagueData.divisions[0];
    if (division) {
      console.log(`\n📊 Division 1 Statistics:`);
      console.log(`   - Total Rounds: ${division.totalRounds}`);
      console.log(`   - Current Round: ${division.currentRound}`);
      console.log(`   - Rounds Data: ${division.rounds.length}`);
      
      let totalFights = 0;
      division.rounds.forEach(round => {
        totalFights += round.fights.length;
      });
      console.log(`   - Total Fights: ${totalFights}`);
    }

    console.log(`\n👥 Fighters in Division 1: ${verifiedSeason.seasonMeta.leagueDivisions[0]?.fighters.length || 0}`);
    console.log(`🏆 Division Winner: ${verifiedSeason.seasonMeta.leagueDivisions[0]?.winners[0] || 'None'}`);

    // Show sample fight
    const firstRound = verifiedSeason.leagueData.divisions[0]?.rounds[0];
    if (firstRound && firstRound.fights.length > 0) {
      const firstFight = firstRound.fights[0];
      console.log('\n' + '='.repeat(70));
      console.log('SAMPLE DATA (First Fight)');
      console.log('='.repeat(70));
      console.log(`\nRound ${firstRound.roundNumber}, Fight 1:`);
      console.log(`  Fight ID: ${firstFight.fightIdentifier}`);
      console.log(`  Fighter 1: ${firstFight.fighter1}`);
      console.log(`  Fighter 2: ${firstFight.fighter2}`);
      console.log(`  Winner: ${firstFight.winner}`);
      console.log(`  Status: ${firstFight.fightStatus}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason {N} has been imported to MongoDB!');
    console.log('You can now query Season {N} data using:');
    console.log('  - GraphQL queries');
    console.log('  - MongoDB queries');
    console.log('  - Frontend components');
    console.log(`\nDocument ID: ${savedSeason._id}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the import
importSeason();
```

**Important:** Replace all `{N}` placeholders with the actual season number.

### Step 5: Add NPM Script

Add to `server/package.json` in the `scripts` section:

```json
"import:season{N}": "node scripts/import-season{N}-to-db.js"
```

For Season 2, this was:
```json
"import:season2": "node scripts/import-season2-to-db.js"
```

### Step 6: Run the Import

Execute the import script:

```bash
cd server
npm run import:season{N}
```

**What to expect:**
1. Connection confirmation to MongoDB
2. Data loading confirmation with statistics
3. Check for existing season (with 5-second warning if found)
4. Import progress
5. Verification with detailed statistics
6. Sample fight data
7. Success message with MongoDB document ID

### Step 7: Verify Import Success

**Check in MongoDB or via GraphQL:**

```graphql
query {
  getCompetitionById(competitionId: "YOUR_DOCUMENT_ID") {
    seasonMeta {
      seasonNumber
      leagueDivisions {
        divisionNumber
        fighters
        winners
      }
    }
    leagueData {
      divisions {
        divisionNumber
        totalRounds
        rounds {
          roundNumber
          fights {
            fightIdentifier
            fighter1
            fighter2
            winner
            fightStatus
          }
        }
      }
    }
  }
}
```

---

## Season 2 Migration Summary

### Files Created:
1. ✅ `/old-data/ifc-season2-migrated.json` - Migrated data file
2. ✅ `/server/scripts/import-season2-to-db.js` - Import script
3. ✅ `/server/scripts/README-SEASON2-IMPORT.md` - Documentation

### Data Imported:
- **Season Number**: 2
- **Divisions**: 1
- **Fighters**: 10 (F009, F010, F017, F020, F026, F028, F030, F032, F033, F034)
- **Rounds**: 9
- **Fights**: 45
- **Winner**: F034 (Maksymilian Kuchnik)
- **Document ID**: `68f0019adf65f41c15654dc4`

### Source Data Used:
- `old-data/ifc-season2-season.json` - Final standings and metadata
- `old-data/ifc-season2-rounds.json` - Fight data for all 9 rounds
- `old-data/ifc-season2-tables.json` - Point progression (used for verification)
- `old-data/fighter-mapping.json` - Fighter ID to ObjectId mapping

---

## For Season 3 Migration

Follow the exact same process:

### 1. Prepare Source Files
```bash
# Ensure these exist:
old-data/ifc-season3-season.json
old-data/ifc-season3-rounds.json
old-data/fighter-mapping.json
```

### 2. Create Migrated File
```bash
# Create: old-data/ifc-season3-migrated.json
# Follow the structure template above
# Replace season number with 3
# Map fighter IDs using fighter-mapping.json
```

### 3. Create Import Script
```bash
# Copy season2 script and update:
cp server/scripts/import-season2-to-db.js server/scripts/import-season3-to-db.js
# Replace all "Season 2" with "Season 3"
# Replace all "season2" with "season3"
# Update season number checks from 2 to 3
```

### 4. Add NPM Script
```json
"import:season3": "node scripts/import-season3-to-db.js"
```

### 5. Run Import
```bash
cd server
npm run import:season3
```

---

## Common Issues & Solutions

### Issue: "Schema hasn't been registered for model CompetitionMeta"
**Solution:** Import CompetitionMeta model before Competition model:
```javascript
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';
```

### Issue: Fighter IDs not found in mapping
**Solution:** Ensure `fighter-mapping.json` has entries for all fighters in the season.

### Issue: Fight count mismatch
**Solution:** Verify source data. For 10 fighters in round-robin:
- 9 rounds (each fighter plays everyone once)
- 5 fights per round
- 45 total fights

### Issue: Winner ObjectId not matching
**Solution:** Double-check the winner from `season.json` matches the mapped ObjectId in `fighter-mapping.json`.

---

## Validation Checklist

Before considering migration complete:

- [ ] Migrated JSON file created with correct structure
- [ ] All fighter IDs mapped to MongoDB ObjectIds
- [ ] All 9 rounds present with correct fight data
- [ ] Fight identifiers follow pattern: `IFC-S{N}-D1-R{round}-F{fight}`
- [ ] Winner properly set in seasonMeta
- [ ] Import script created and added to package.json
- [ ] Import runs successfully without errors
- [ ] MongoDB document ID obtained
- [ ] Verification shows correct counts (rounds, fights, fighters)
- [ ] Sample queries work via GraphQL/MongoDB

---

## Notes

- This process assumes **single division, no divisions** structure for historical seasons
- Fighter mapping file is critical - must be accurate and complete
- Import scripts are safe to run multiple times (they delete and reimport)
- Always verify counts: 9 rounds, 45 fights for 10-fighter single division
- Document IDs will be different each time you import (if you delete and reimport)

---

## References

- Season 1 Migration: Already completed
- Season 2 Migration: Completed on 2025-01-15
  - Document ID: `68f0019adf65f41c15654dc4`
- Season 3 Migration: To be done following this guide

---

*Last Updated: 2025-01-15*
*Author: AI Assistant*
*Purpose: Documentation for consistent season data migration*

