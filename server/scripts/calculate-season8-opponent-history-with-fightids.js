/**
 * Calculate Season 8 Opponent History with Fight ObjectIds
 * This script processes all fights in Season 8 and calculates opponent history
 * Including the actual MongoDB fight ObjectIds from the database
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Competition } from '../models/competition.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 8;

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
 * Load Season 8 competition from database
 */
async function loadSeason8FromDB() {
  console.log(`📂 Loading Season 8 data from MongoDB...`);
  
  const competition = await Competition.findOne({
    competitionMetaId: COMPETITION_ID,
    'seasonMeta.seasonNumber': SEASON_NUMBER
  });
  
  if (!competition) {
    throw new Error('Season 8 competition not found in database');
  }
  
  console.log(`✅ Loaded Season 8 with ${competition.leagueData.divisions.length} divisions`);
  
  return competition;
}

/**
 * Load fighters data for names
 */
function loadFightersData() {
  const dataPath = path.join(__dirname, '../../old-data/fighters-old.json');
  console.log(`📂 Loading fighters data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Fighters data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const fightersObj = JSON.parse(rawData);
  
  // Load fighter mapping to convert codes to ObjectIds
  const mappingPath = path.join(__dirname, '../../old-data/fighter-mapping.json');
  const fighterMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  
  const fightersMap = new Map();
  
  Object.entries(fightersObj).forEach(([code, fighter]) => {
    if (code.startsWith('F0')) {
      const objectId = fighterMapping[code];
      if (objectId) {
        fightersMap.set(objectId, {
          ...fighter,
          objectId,
          code
        });
      }
    }
  });
  
  console.log(`✅ Loaded data for ${fightersMap.size} fighters`);
  return fightersMap;
}

/**
 * Calculate win percentage
 */
function calculateWinPercentage(totalWins, totalFights) {
  if (totalFights === 0) return 0;
  return Math.round((totalWins / totalFights) * 100);
}

/**
 * Process all fights and build opponent history
 */
function processSeasonFights(seasonData, fightersData) {
  console.log('\n📊 Processing Season 8 fights for opponent history...');
  
  // Map to store opponent history for each fighter
  // Structure: Map<fighterId, Map<opponentId, historyData>>
  const fighterOpponentHistory = new Map();
  
  // Initialize map for all fighters
  const allFighterIds = new Set();
  seasonData.seasonMeta.leagueDivisions.forEach(division => {
    division.fighters.forEach(fighterId => {
      const fighterIdStr = fighterId.toString();
      allFighterIds.add(fighterIdStr);
      if (!fighterOpponentHistory.has(fighterIdStr)) {
        fighterOpponentHistory.set(fighterIdStr, new Map());
      }
    });
  });
  
  console.log(`   - Total fighters in Season 8: ${allFighterIds.size}`);
  
  let totalFightsProcessed = 0;
  
  // Process each division
  seasonData.leagueData.divisions.forEach(division => {
    console.log(`\n   Processing Division ${division.divisionNumber}...`);
    
    // Process each round
    division.rounds.forEach(round => {
      // Process each fight
      round.fights.forEach(fight => {
        if (fight.fightStatus !== 'completed' || !fight.winner) {
          return; // Skip incomplete fights
        }
        
        const fighter1Id = fight.fighter1.toString();
        const fighter2Id = fight.fighter2.toString();
        const winnerId = fight.winner.toString();
        const fightObjectId = fight._id.toString(); // Get the MongoDB ObjectId
        
        totalFightsProcessed++;
        
        // Update fighter1's history against fighter2
        const fighter1History = fighterOpponentHistory.get(fighter1Id);
        if (fighter1History) {
          if (!fighter1History.has(fighter2Id)) {
            fighter1History.set(fighter2Id, {
              opponentId: fighter2Id,
              totalFights: 0,
              totalWins: 0,
              totalLosses: 0,
              winPercentage: 0,
              details: []
            });
          }
          
          const f1vsf2 = fighter1History.get(fighter2Id);
          f1vsf2.totalFights++;
          
          if (winnerId === fighter1Id) {
            f1vsf2.totalWins++;
          } else {
            f1vsf2.totalLosses++;
          }
          
          f1vsf2.winPercentage = calculateWinPercentage(f1vsf2.totalWins, f1vsf2.totalFights);
          
          f1vsf2.details.push({
            competitionId: COMPETITION_ID,
            season: SEASON_NUMBER,
            divisionId: division.divisionNumber,
            roundId: round.roundNumber,
            fightId: fightObjectId, // Include the fight MongoDB ObjectId
            isWinner: winnerId === fighter1Id
          });
        }
        
        // Update fighter2's history against fighter1
        const fighter2History = fighterOpponentHistory.get(fighter2Id);
        if (fighter2History) {
          if (!fighter2History.has(fighter1Id)) {
            fighter2History.set(fighter1Id, {
              opponentId: fighter1Id,
              totalFights: 0,
              totalWins: 0,
              totalLosses: 0,
              winPercentage: 0,
              details: []
            });
          }
          
          const f2vsf1 = fighter2History.get(fighter1Id);
          f2vsf1.totalFights++;
          
          if (winnerId === fighter2Id) {
            f2vsf1.totalWins++;
          } else {
            f2vsf1.totalLosses++;
          }
          
          f2vsf1.winPercentage = calculateWinPercentage(f2vsf1.totalWins, f2vsf1.totalFights);
          
          f2vsf1.details.push({
            competitionId: COMPETITION_ID,
            season: SEASON_NUMBER,
            divisionId: division.divisionNumber,
            roundId: round.roundNumber,
            fightId: fightObjectId, // Include the fight MongoDB ObjectId
            isWinner: winnerId === fighter2Id
          });
        }
      });
    });
  });
  
  console.log(`\n✅ Processed ${totalFightsProcessed} fights`);
  
  // Convert Map to array format for output
  const opponentHistoryData = [];
  
  fighterOpponentHistory.forEach((opponentMap, fighterId) => {
    const fighterData = fightersData.get(fighterId);
    const opponentsHistory = [];
    
    opponentMap.forEach((history, opponentId) => {
      opponentsHistory.push(history);
    });
    
    if (opponentsHistory.length > 0) {
      opponentHistoryData.push({
        fighterId,
        fighterName: fighterData ? `${fighterData.firstName} ${fighterData.lastName}` : 'Unknown',
        fighterCode: fighterData?.code || 'Unknown',
        totalOpponents: opponentsHistory.length,
        opponentsHistory
      });
    }
  });
  
  return opponentHistoryData;
}

/**
 * Main calculation function
 */
async function calculateOpponentHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('SEASON 8 OPPONENT HISTORY CALCULATION (WITH FIGHT IDS)');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();
    
    // Load Season 8 from database (to get fight ObjectIds)
    const season8Data = await loadSeason8FromDB();
    const fightersData = loadFightersData();
    
    const opponentHistoryData = processSeasonFights(season8Data, fightersData);
    
    // Sort by fighter code for easier verification
    opponentHistoryData.sort((a, b) => a.fighterCode.localeCompare(b.fighterCode));
    
    console.log('\n' + '='.repeat(70));
    console.log('CALCULATION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Calculated opponent history for ${opponentHistoryData.length} fighters`);
    
    // Show sample data
    console.log('\n📋 Sample Opponent History (First 3 fighters):');
    opponentHistoryData.slice(0, 3).forEach(fighter => {
      console.log(`\n   ${fighter.fighterName} (${fighter.fighterCode}):`);
      console.log(`   - Total opponents faced: ${fighter.totalOpponents}`);
      
      fighter.opponentsHistory.slice(0, 2).forEach(opp => {
        const oppData = fightersData.get(opp.opponentId);
        const oppName = oppData ? `${oppData.firstName} ${oppData.lastName}` : 'Unknown';
        console.log(`     vs ${oppName}: ${opp.totalWins}W-${opp.totalLosses}L (${opp.totalFights} fights, ${opp.winPercentage}%)`);
        if (opp.details && opp.details.length > 0) {
          console.log(`       Fight ID sample: ${opp.details[0].fightId}`);
        }
      });
    });
    
    // Statistics
    const totalOpponentPairs = opponentHistoryData.reduce((sum, f) => sum + f.totalOpponents, 0);
    const fightersWithMultipleFights = opponentHistoryData.filter(f => 
      f.opponentsHistory.some(opp => opp.totalFights > 1)
    ).length;
    
    console.log('\n📊 Statistics:');
    console.log(`   - Total fighter-opponent pairs: ${totalOpponentPairs}`);
    console.log(`   - Fighters with rematches: ${fightersWithMultipleFights}`);
    console.log(`   - Average opponents per fighter: ${(totalOpponentPairs / opponentHistoryData.length).toFixed(1)}`);
    
    // Find fighters with most rematches
    const rematchData = [];
    opponentHistoryData.forEach(fighter => {
      fighter.opponentsHistory.forEach(opp => {
        if (opp.totalFights > 1) {
          const oppData = fightersData.get(opp.opponentId);
          const oppName = oppData ? `${oppData.firstName} ${oppData.lastName}` : 'Unknown';
          rematchData.push({
            fighter1: fighter.fighterName,
            fighter2: oppName,
            totalFights: opp.totalFights,
            record: `${opp.totalWins}W-${opp.totalLosses}L`
          });
        }
      });
    });
    
    if (rematchData.length > 0) {
      // Sort by total fights
      rematchData.sort((a, b) => b.totalFights - a.totalFights);
      
      console.log('\n🔄 Notable Rematches in Season 8:');
      rematchData.slice(0, 5).forEach(match => {
        console.log(`   - ${match.fighter1} vs ${match.fighter2}: ${match.totalFights} fights (${match.record})`);
      });
    }
    
    // Save to file
    const outputPath = path.join(__dirname, '../../old-data/season8-opponent-history.json');
    fs.writeFileSync(outputPath, JSON.stringify(opponentHistoryData, null, 2), 'utf8');
    
    console.log(`\n📁 Opponent history saved to: ${outputPath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nOpponent history has been calculated for Season 8 with fight ObjectIds!');
    console.log('\nNext steps:');
    console.log('1. Review the opponent history data');
    console.log('2. Import to MongoDB using import-season8-opponent-history.js');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the calculation
calculateOpponentHistory();

