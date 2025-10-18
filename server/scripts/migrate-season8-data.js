/**
 * Migrate Season 8 Data from Raw JSON to MongoDB Format
 * This script converts the raw Season 8 data (ifc-season8-season.json and ifc-season8-rounds.json)
 * into the migrated format compatible with MongoDB import
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const COMPETITION_META_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 8;

/**
 * Load fighter mapping from JSON file
 */
function loadFighterMapping() {
  const mappingPath = path.join(__dirname, '../../old-data/fighter-mapping.json');
  
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Fighter mapping file not found: ${mappingPath}`);
  }
  
  const rawData = fs.readFileSync(mappingPath, 'utf8');
  return JSON.parse(rawData);
}

/**
 * Load Season 8 raw data
 */
function loadSeason8RawData() {
  const seasonPath = path.join(__dirname, '../../old-data/ifc-season8-season.json');
  const roundsPath = path.join(__dirname, '../../old-data/ifc-season8-rounds.json');
  
  if (!fs.existsSync(seasonPath)) {
    throw new Error(`Season 8 data file not found: ${seasonPath}`);
  }
  
  if (!fs.existsSync(roundsPath)) {
    throw new Error(`Season 8 rounds file not found: ${roundsPath}`);
  }
  
  const seasonData = JSON.parse(fs.readFileSync(seasonPath, 'utf8'));
  const roundsData = JSON.parse(fs.readFileSync(roundsPath, 'utf8'));
  
  return { seasonData, roundsData };
}

/**
 * Convert fight identifier from Season 8 format to MongoDB format
 */
function convertFightIdentifier(originalId, divisionNumber, roundNumber, fightNumber) {
  // Keep original ID format if it exists, otherwise generate new one
  return originalId || `S8-D${divisionNumber}-R${roundNumber}-F${fightNumber}`;
}

/**
 * Convert raw fight data to migrated format
 */
function convertFight(rawFight, divisionNumber, roundNumber, fightNumber, fighterMapping) {
  return {
    fighter1: fighterMapping[rawFight.player1],
    fighter2: fighterMapping[rawFight.player2],
    winner: rawFight.winner ? fighterMapping[rawFight.winner] : null,
    fightIdentifier: convertFightIdentifier(rawFight.id, divisionNumber, roundNumber, fightNumber),
    date: rawFight.date || null,
    userDescription: null,
    genAIDescription: null,
    isSimulated: false,
    fighterStats: [],
    fightStatus: rawFight.winner ? 'completed' : 'pending'
  };
}

/**
 * Get fighters for a specific division from final positions
 */
function getDivisionFighters(divisionNumber, seasonData, fighterMapping) {
  const divisionData = seasonData.finalPositions.find(d => d.division === divisionNumber);
  if (!divisionData) {
    throw new Error(`Division ${divisionNumber} not found in final positions`);
  }
  
  return divisionData.positions.map(pos => fighterMapping[pos.fighterId]);
}

/**
 * Get winners for a specific division
 */
function getDivisionWinners(divisionNumber, seasonData, fighterMapping) {
  const winnerData = seasonData.winners.find(w => w.division === divisionNumber);
  if (!winnerData) {
    return [];
  }
  
  return [fighterMapping[winnerData.winner]];
}

/**
 * Convert Season 8 data to migrated format
 */
function migrateSeason8Data() {
  console.log('🔄 Starting Season 8 data migration...');
  
  // Load data
  const fighterMapping = loadFighterMapping();
  const { seasonData, roundsData } = loadSeason8RawData();
  
  console.log(`✅ Loaded fighter mapping (${Object.keys(fighterMapping).length} fighters)`);
  console.log(`✅ Loaded Season 8 data with ${seasonData.divisionMeta.length} divisions`);
  
  // Create the migrated data structure
  const migratedData = {
    competitionMetaId: COMPETITION_META_ID,
    isActive: seasonData.current || false,
    seasonMeta: {
      seasonNumber: SEASON_NUMBER,
      startDate: seasonData.timeline?.start || null,
      endDate: seasonData.timeline?.end || null,
      winners: [],
      leagueDivisions: [],
      cupParticipants: {
        fighters: []
      }
    },
    leagueData: {
      divisions: []
    }
  };
  
  // Process each division
  seasonData.divisionMeta.forEach(divisionMeta => {
    const divisionNumber = divisionMeta.divisionId;
    const divisionKey = `division${divisionNumber}`;
    
    console.log(`\n📊 Processing Division ${divisionNumber}...`);
    
    // Get fighters and winners for this division
    const fighters = getDivisionFighters(divisionNumber, seasonData, fighterMapping);
    const winners = getDivisionWinners(divisionNumber, seasonData, fighterMapping);
    
    console.log(`   Fighters: ${fighters.length}`);
    console.log(`   Winners: ${winners.length}`);
    
    // Add to season meta
    migratedData.seasonMeta.leagueDivisions.push({
      divisionNumber: divisionNumber,
      fighters: fighters,
      winners: winners
    });
    
    // Process rounds for this division
    const divisionRounds = [];
    const roundsDataForDivision = roundsData[divisionKey];
    
    if (!roundsDataForDivision) {
      throw new Error(`No rounds data found for ${divisionKey}`);
    }
    
    // Sort rounds by round number
    const roundKeys = Object.keys(roundsDataForDivision).sort((a, b) => {
      const aNum = parseInt(a.replace('round', ''));
      const bNum = parseInt(b.replace('round', ''));
      return aNum - bNum;
    });
    
    roundKeys.forEach(roundKey => {
      const roundNumber = parseInt(roundKey.replace('round', ''));
      const roundData = roundsDataForDivision[roundKey];
      
      console.log(`   Processing Round ${roundNumber} (${roundData.fights.length} fights)`);
      
      const fights = roundData.fights.map((fight, index) => 
        convertFight(fight, divisionNumber, roundNumber, index + 1, fighterMapping)
      );
      
      divisionRounds.push({
        roundNumber: roundNumber,
        fights: fights
      });
    });
    
    // Add division to league data
    migratedData.leagueData.divisions.push({
      divisionNumber: divisionNumber,
      divisionName: `Division ${divisionNumber}`,
      totalRounds: divisionRounds.length,
      currentRound: divisionRounds.length,
      rounds: divisionRounds
    });
  });
  
  return migratedData;
}

/**
 * Save migrated data to file
 */
function saveMigratedData(migratedData) {
  const outputPath = path.join(__dirname, '../../old-data/ifc-season8-migrated.json');
  
  console.log(`\n💾 Saving migrated data to: ${outputPath}`);
  
  fs.writeFileSync(outputPath, JSON.stringify(migratedData, null, 2));
  
  console.log('✅ Migration completed successfully!');
  console.log(`📁 Output file: ${outputPath}`);
  
  // Print summary
  console.log('\n📋 Migration Summary:');
  console.log(`   Season: ${migratedData.seasonMeta.seasonNumber}`);
  console.log(`   Divisions: ${migratedData.leagueData.divisions.length}`);
  console.log(`   Start Date: ${migratedData.seasonMeta.startDate}`);
  console.log(`   End Date: ${migratedData.seasonMeta.endDate}`);
  
  migratedData.leagueData.divisions.forEach(division => {
    const totalFights = division.rounds.reduce((sum, round) => sum + round.fights.length, 0);
    console.log(`   Division ${division.divisionNumber}: ${division.rounds.length} rounds, ${totalFights} fights`);
  });
}

/**
 * Main migration function
 */
function main() {
  try {
    console.log('🚀 Season 8 Data Migration Tool');
    console.log('================================');
    
    const migratedData = migrateSeason8Data();
    saveMigratedData(migratedData);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the migrated data file (old-data/ifc-season8-migrated.json)');
    console.log('2. Run standings calculation script if needed');
    console.log('3. Import to MongoDB using import-season8-to-db.js');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the migration
main();

