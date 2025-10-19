# Invicta Cup Migration Guide

## Overview
This guide documents the process for migrating Invicta Cup data from `old-data/invicta-cup.json` to the MongoDB Competition collection.

## ✅ Completed Migrations

### Invicta Cup Season 1 (W0001)
- **Status:** ✅ COMPLETE
- **Linked to:** IFC Season 7 (S0007)
- **MongoDB ID:** `68f508e05b3c2537134030e9`
- **Timeline:** 2022-01-24 → 2022-02-17
- **Participants:** 8 fighters
- **Winner:** F032 (676d75dfeb38b2b97c6da9a5)
- **Uploaded:** 2025-10-19

### Invicta Cup Season 2 (W0002)
- **Status:** ✅ COMPLETE
- **Linked to:** IFC Season 8 (S0008)
- **MongoDB ID:** `68f51be7f39401ab6de7a23e`
- **Timeline:** 2022-05-20 → 2022-06-05
- **Participants:** 8 fighters
- **Winner:** F042 (676d72c5eb38b2b97c6da969)
- **Uploaded:** 2025-10-19

### Invicta Cup Season 3 (W0003)
- **Status:** ✅ COMPLETE
- **Linked to:** IFC Season 9 (S0009)
- **MongoDB ID:** `68f51cf313d57b6372013fd5`
- **Timeline:** 2022-10-21 → 2022-11-03
- **Participants:** 8 fighters
- **Winner:** F030 (676d6ecceb38b2b97c6da945)
- **Uploaded:** 2025-10-19

## 🔄 Remaining Migrations

### Invicta Cup Season 4 (W0004)
- **Status:** ⏳ PENDING
- **Linked to:** IFC Season 10 (S0010)
- **IFC Season ID:** `68f38270761a2d83b46c03e1`
- **Tournament ID in source:** W0004
- **Timeline:** 2023-04-14 → 2023-05-19
- **Winner:** F030

---

## Migration Process

### Step 1: Create Data Structure Script

```javascript
/**
 * Create Invicta Cup Season X Data
 * Replace X with season number (2, 3, or 4)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants - UPDATE THESE FOR EACH SEASON
const INVICTA_CUP_META_ID = '6778103309a4c4b25127f8fc';
const IFC_COMPETITION_META_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 2; // Change to 2, 3, or 4
const TOURNAMENT_ID = 'W0002'; // Change to W0002, W0003, or W0004
const IFC_SEASON_ID = '68f32fafbd3c514277e377ee'; // Update based on linked IFC season

async function createInvictaCupData() {
  console.log(`\n🏆 CREATING INVICTA CUP SEASON ${SEASON_NUMBER} DATA\n`);
  
  // Read source data
  const invictaCupPath = path.join(__dirname, '../../old-data/invicta-cup.json');
  const invictaCupData = JSON.parse(fs.readFileSync(invictaCupPath, 'utf8'));
  
  // Extract tournament data
  const tournament = invictaCupData.tournaments.find(t => t.id === TOURNAMENT_ID);
  const fights = invictaCupData.fights.find(f => f.id === TOURNAMENT_ID);
  
  if (!tournament || !fights) {
    throw new Error(`Tournament ${TOURNAMENT_ID} not found`);
  }
  
  // Create cupData fights
  const cupFights = [];
  
  const createFight = (fightData, round) => ({
    fighter1: fightData.fighter1,
    fighter2: fightData.fighter2,
    winner: fightData.winner,
    fightIdentifier: fightData.id.replace(TOURNAMENT_ID, `IC-S${SEASON_NUMBER}`),
    date: null,
    userDescription: null,
    genAIDescription: null,
    isSimulated: false,
    fighterStats: [],
    fightStatus: 'completed'
  });
  
  // Add fights
  if (fights.round1) fights.round1.forEach(f => cupFights.push(createFight(f, 'R1')));
  if (fights.semifinals) fights.semifinals.forEach(f => cupFights.push(createFight(f, 'SF')));
  if (fights.finals) cupFights.push(createFight(fights.finals, 'FN'));
  
  // Create competition document
  const invictaCupSeason = {
    competitionMetaId: INVICTA_CUP_META_ID,
    isActive: false,
    seasonMeta: {
      seasonNumber: SEASON_NUMBER,
      startDate: tournament.timeline.start,
      endDate: tournament.timeline.end,
      winners: [tournament.winner],
      leagueDivisions: null,
      cupParticipants: {
        fighters: tournament.fighters.map(f => f.id)
      }
    },
    leagueData: null,
    cupData: {
      fights: cupFights,
      currentStage: 'Finals'
    },
    config: {
      leagueConfiguration: null,
      cupConfiguration: {
        knockoutRounds: 3,
        numberOfFighters: 8,
        perFightFeeInEur: null,
        winningFeeInEur: null,
        stages: ['Preliminary', 'Semi-finals', 'Finals']
      }
    },
    linkedLeagueSeason: {
      competitionId: IFC_COMPETITION_META_ID,
      seasonId: IFC_SEASON_ID
    },
    createdAt: new Date(tournament.timeline.start),
    updatedAt: new Date()
  };
  
  // Save
  const outputPath = path.join(__dirname, `../../backups/invicta-cup-s${SEASON_NUMBER}-generated.json`);
  fs.writeFileSync(outputPath, JSON.stringify(invictaCupSeason, null, 2));
  console.log(`✅ Generated data saved to: invicta-cup-s${SEASON_NUMBER}-generated.json\n`);
}

createInvictaCupData();
```

### Step 2: Map Fighter IDs Script

```javascript
/**
 * Map Fighter F-codes to MongoDB ObjectIds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEASON_NUMBER = 2; // Update for each season

async function mapFighterIds() {
  console.log(`\n🔄 MAPPING FIGHTER IDS FOR SEASON ${SEASON_NUMBER}\n`);
  
  // Load fighter mapping
  const fighterMappingPath = path.join(__dirname, '../../old-data/fighter-mapping.json');
  const fighterMapping = JSON.parse(fs.readFileSync(fighterMappingPath, 'utf8'));
  
  // Load generated data
  const generatedPath = path.join(__dirname, `../../backups/invicta-cup-s${SEASON_NUMBER}-generated.json`);
  const data = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
  
  // Map IDs
  const mapId = (fCode) => fighterMapping[fCode] || fCode;
  
  const mappedData = {
    ...data,
    seasonMeta: {
      ...data.seasonMeta,
      winners: data.seasonMeta.winners.map(mapId),
      cupParticipants: {
        fighters: data.seasonMeta.cupParticipants.fighters.map(mapId)
      }
    },
    cupData: {
      ...data.cupData,
      fights: data.cupData.fights.map(fight => ({
        ...fight,
        fighter1: mapId(fight.fighter1),
        fighter2: mapId(fight.fighter2),
        winner: fight.winner ? mapId(fight.winner) : null
      }))
    }
  };
  
  // Save
  const outputPath = path.join(__dirname, `../../backups/invicta-cup-s${SEASON_NUMBER}-final.json`);
  fs.writeFileSync(outputPath, JSON.stringify(mappedData, null, 2));
  console.log(`✅ Mapped data saved to: invicta-cup-s${SEASON_NUMBER}-final.json\n`);
}

mapFighterIds();
```

### Step 3: Upload Script

```javascript
/**
 * Upload Invicta Cup Season to MongoDB
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEASON_NUMBER = 2; // Update for each season

async function connectDB() {
  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10
  });
  console.log(`✅ Connected to MongoDB`);
  return connection;
}

async function uploadInvictaCup() {
  console.log(`\n🚀 UPLOADING INVICTA CUP SEASON ${SEASON_NUMBER}\n`);
  
  try {
    await connectDB();
    
    const finalDataPath = path.join(__dirname, `../../backups/invicta-cup-s${SEASON_NUMBER}-final.json`);
    const data = JSON.parse(fs.readFileSync(finalDataPath, 'utf8'));
    
    // Check for duplicates
    const existing = await Competition.findOne({
      competitionMetaId: data.competitionMetaId,
      'seasonMeta.seasonNumber': data.seasonMeta.seasonNumber
    });
    
    if (existing) {
      console.log(`⚠️  Season ${SEASON_NUMBER} already exists!`);
      process.exit(1);
    }
    
    // Upload
    const newCompetition = new Competition(data);
    await newCompetition.save();
    
    console.log(`✅ Successfully created Invicta Cup Season ${SEASON_NUMBER}!`);
    console.log(`   MongoDB ID: ${newCompetition._id}\n`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

uploadInvictaCup();
```

---

## Quick Reference Data

### Competition IDs
- **IFC Competition Meta ID:** `67780dcc09a4c4b25127f8f6`
- **Invicta Cup Meta ID:** `6778103309a4c4b25127f8fc`

### IFC Season IDs (for linking)
| IFC Season | Season ID | Timeline |
|------------|-----------|----------|
| S7 | `68f2a2e3e25ec66dfba26c31` | 2021-12-11 → 2022-02-21 |
| S8 | `68f32fafbd3c514277e377ee` | 2022-03-08 → 2022-06-09 |
| S9 | `68f34bba9e1df8e0f8137afe` | 2022-09-02 → 2022-11-04 |
| S10 | `68f38270761a2d83b46c03e1` | 2023-02-22 → 2023-05-20 |

### Fight Identifier Format
- **Pattern:** `IC-S{seasonNumber}-{round}-F{fightNumber}`
- **Examples:**
  - Round 1: `IC-S2-R1-F1`, `IC-S2-R1-F2`, etc.
  - Semifinals: `IC-S2-SF-F1`, `IC-S2-SF-F2`
  - Finals: `IC-S2-FN`

### Source Data Location
- **Fighter Mapping:** `old-data/fighter-mapping.json`
- **Invicta Cup Data:** `old-data/invicta-cup.json`

---

## Execution Steps for Each Season

1. **Update constants** in each script (season number, tournament ID, IFC season ID)
2. **Run create script:** `node create-invicta-cup-sX-data.js`
3. **Run mapping script:** `node map-fighter-ids-invicta-cup-sX.js`
4. **Review generated files:**
   - Check `invicta-cup-sX-generated.json`
   - Verify `invicta-cup-sX-final.json`
5. **Get approval** from stakeholder
6. **Run upload script:** `node upload-invicta-cup-sX.js`
7. **Verify in database**
8. **Clean up temporary scripts**

---

## Notes

- Always create a backup before uploading: `node backup-competitions.js`
- Fighter IDs are mapped from F-codes using `old-data/fighter-mapping.json`
- Fight identifiers must follow the `IC-S{X}-{ROUND}-F{#}` format
- All seasons link to their corresponding IFC season
- Upload scripts have duplicate detection to prevent re-uploading

---

## Success Criteria

✅ Correct competition meta ID  
✅ Correct season number  
✅ All fighter IDs mapped to MongoDB ObjectIds  
✅ Fight identifiers follow proper format  
✅ Linked to correct IFC season  
✅ Timeline dates preserved  
✅ Winner correctly set  
✅ All fights marked as completed  

---

**Last Updated:** 2025-10-19  
**Completed Seasons:** 3 of 4  
**Next Season:** Invicta Cup S4 (W0004)

