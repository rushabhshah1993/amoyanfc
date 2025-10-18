/**
 * Calculate Season 8 Streaks Data
 * This script processes Season 8 fights and updates fighter streaks
 * continuing from the active streaks in Season 7 data
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';
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
 * Load Season 8 competition data from MongoDB
 */
async function loadSeason8Data() {
  console.log(`📂 Loading Season 8 data from MongoDB...`);
  
  const competition = await Competition.findOne({
    competitionMetaId: mongoose.Types.ObjectId.createFromHexString(COMPETITION_ID),
    'seasonMeta.seasonNumber': SEASON_NUMBER
  }).lean();
  
  if (!competition) {
    throw new Error('Season 8 competition not found in MongoDB');
  }
  
  console.log(`✅ Loaded Season 8 competition data`);
  return competition;
}

/**
 * Load fighters data with existing streaks from MongoDB
 */
async function loadFightersData() {
  console.log(`📂 Loading fighters data from MongoDB...`);
  
  const fighters = await Fighter.find({}).select('_id firstName lastName streaks').lean();
  
  console.log(`✅ Loaded ${fighters.length} fighters`);
  
  return fighters;
}

/**
 * Initialize fighter map with existing streaks
 */
function initializeFighterMap(fighters) {
  const fighterMap = new Map();
  
  fighters.forEach(fighter => {
    const fighterId = fighter._id.toString();
    const streaks = fighter.streaks || [];
    
    // Find the active streak
    let activeWinStreakIndex = null;
    let activeLoseStreakIndex = null;
    
    streaks.forEach((streak, index) => {
      if (streak.active && streak.competitionId.toString() === COMPETITION_ID) {
        if (streak.type === 'win') {
          activeWinStreakIndex = index;
        } else if (streak.type === 'lose') {
          activeLoseStreakIndex = index;
        }
      }
    });
    
    fighterMap.set(fighterId, {
      id: fighterId,
      name: `${fighter.firstName} ${fighter.lastName}`,
      streaks: JSON.parse(JSON.stringify(streaks)), // Deep clone
      activeWinStreakIndex,
      activeLoseStreakIndex
    });
  });
  
  return fighterMap;
}

/**
 * Process a single fight and update streaks for both fighters
 */
function processFight(fight, seasonNumber, divisionNumber, roundNumber, fighterMap) {
  const fighter1Id = fight.fighter1.toString();
  const fighter2Id = fight.fighter2.toString();
  const winnerId = fight.winner.toString();
  const fightId = fight._id.toString();
  
  const fighter1Data = fighterMap.get(fighter1Id);
  const fighter2Data = fighterMap.get(fighter2Id);
  
  if (!fighter1Data || !fighter2Data) {
    console.warn(`⚠️  Fighter not found: ${fighter1Id} or ${fighter2Id}`);
    return;
  }
  
  const fightContext = {
    season: seasonNumber,
    division: divisionNumber,
    round: roundNumber,
    _id: fightId
  };
  
  // Determine winner and loser
  const isFighter1Winner = winnerId === fighter1Id;
  const winnerData = isFighter1Winner ? fighter1Data : fighter2Data;
  const loserData = isFighter1Winner ? fighter2Data : fighter1Data;
  const opponentIdForWinner = isFighter1Winner ? fighter2Id : fighter1Id;
  const opponentIdForLoser = isFighter1Winner ? fighter1Id : fighter2Id;
  
  // Update winner's streak
  updateWinnerStreak(winnerData, opponentIdForWinner, fightContext);
  
  // Update loser's streak
  updateLoserStreak(loserData, opponentIdForLoser, fightContext);
}

/**
 * Update streak for a fighter who won
 */
function updateWinnerStreak(winnerData, opponentId, fightContext) {
  // Check if winner has an active win streak
  if (winnerData.activeWinStreakIndex !== null) {
    // Extend the active win streak
    const winStreak = winnerData.streaks[winnerData.activeWinStreakIndex];
    winStreak.count++;
    winStreak.opponents.push(opponentId);
  } else {
    // Close any active lose streak
    if (winnerData.activeLoseStreakIndex !== null) {
      const loseStreak = winnerData.streaks[winnerData.activeLoseStreakIndex];
      loseStreak.active = false;
      loseStreak.end = { ...fightContext };
      winnerData.activeLoseStreakIndex = null;
    }
    
    // Start a new win streak
    const newWinStreak = {
      competitionId: COMPETITION_ID,
      type: 'win',
      start: { ...fightContext },
      end: null,
      count: 1,
      active: true,
      opponents: [opponentId]
    };
    
    winnerData.streaks.push(newWinStreak);
    winnerData.activeWinStreakIndex = winnerData.streaks.length - 1;
  }
}

/**
 * Update streak for a fighter who lost
 */
function updateLoserStreak(loserData, opponentId, fightContext) {
  // Check if loser has an active lose streak
  if (loserData.activeLoseStreakIndex !== null) {
    // Extend the active lose streak
    const loseStreak = loserData.streaks[loserData.activeLoseStreakIndex];
    loseStreak.count++;
    loseStreak.opponents.push(opponentId);
  } else {
    // Close any active win streak
    if (loserData.activeWinStreakIndex !== null) {
      const winStreak = loserData.streaks[loserData.activeWinStreakIndex];
      winStreak.active = false;
      winStreak.end = { ...fightContext };
      loserData.activeWinStreakIndex = null;
    }
    
    // Start a new lose streak
    const newLoseStreak = {
      competitionId: COMPETITION_ID,
      type: 'lose',
      start: { ...fightContext },
      end: null,
      count: 1,
      active: true,
      opponents: [opponentId]
    };
    
    loserData.streaks.push(newLoseStreak);
    loserData.activeLoseStreakIndex = loserData.streaks.length - 1;
  }
}

/**
 * Calculate streaks for Season 8
 */
async function calculateSeason8Streaks() {
  console.log('\n' + '='.repeat(70));
  console.log('SEASON 8 STREAKS CALCULATION');
  console.log('='.repeat(70));
  
  try {
    // Connect to database
    await connectDB();
    
    // Load data
    const season8Data = await loadSeason8Data();
    const fightersData = await loadFightersData();
    
    console.log(`✅ Loaded ${fightersData.length} fighters with existing streaks`);
    console.log(`✅ Loaded Season 8 with ${season8Data.leagueData.divisions.length} divisions`);
    
    // Initialize fighter map
    const fighterMap = initializeFighterMap(fightersData);
    console.log(`✅ Initialized fighter map`);
    
    // Get fighters participating in Season 8
    const season8FighterIds = new Set();
    season8Data.leagueData.divisions.forEach(division => {
      division.rounds.forEach(round => {
        round.fights.forEach(fight => {
          if (fight.fighter1 && fight.fighter2) {
            season8FighterIds.add(fight.fighter1.toString());
            season8FighterIds.add(fight.fighter2.toString());
          }
        });
      });
    });
    
    console.log(`\n📊 Processing Season 8 fights...`);
    console.log(`   - Total fighters in Season 8: ${season8FighterIds.size}`);
    
    let totalFightsProcessed = 0;
    
    // Process each division
    season8Data.leagueData.divisions.forEach(division => {
      console.log(`   - Processing Division ${division.divisionNumber}...`);
      
      // Sort rounds chronologically
      const sortedRounds = [...division.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
      
      sortedRounds.forEach(round => {
        round.fights.forEach(fight => {
          if (fight.fighter1 && fight.fighter2 && fight.winner) {
            processFight(
              fight,
              SEASON_NUMBER,
              division.divisionNumber,
              round.roundNumber,
              fighterMap
            );
            totalFightsProcessed++;
          }
        });
      });
    });
    
    console.log(`   ✅ Processed ${totalFightsProcessed} fights`);
    
    // Prepare output data (only for Season 8 fighters)
    const updatedFighters = [];
    
    season8FighterIds.forEach(fighterId => {
      const fighterData = fighterMap.get(fighterId);
      if (fighterData) {
        updatedFighters.push({
          fighterId: fighterData.id,
          fighterName: fighterData.name,
          streaks: fighterData.streaks
        });
      }
    });
    
    // Sort by fighter name for consistency
    updatedFighters.sort((a, b) => a.fighterName.localeCompare(b.fighterName));
    
    // Save to file
    const outputPath = path.join(__dirname, '../../old-data/season8-streaks-updates.json');
    fs.writeFileSync(outputPath, JSON.stringify(updatedFighters, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('CALCULATION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Calculated streaks for ${updatedFighters.length} fighters`);
    
    // Show sample streaks
    console.log('\n📋 Sample Streaks (First 5 fighters):');
    updatedFighters.slice(0, 5).forEach(fighter => {
      const activeStreak = fighter.streaks.find(s => s.active && s.competitionId === COMPETITION_ID);
      if (activeStreak) {
        console.log(`\n   ${fighter.fighterName}:`);
        console.log(`      Active ${activeStreak.type} streak: ${activeStreak.count} fight(s)`);
        console.log(`      Started: S${activeStreak.start.season}-D${activeStreak.start.division}-R${activeStreak.start.round}`);
        console.log(`      Opponents: ${activeStreak.opponents.length}`);
      }
    });
    
    // Statistics
    let totalActiveWinStreaks = 0;
    let totalActiveLoseStreaks = 0;
    let totalClosedStreaksInSeason8 = 0;
    let longestActiveWinStreak = 0;
    let longestActiveLoseStreak = 0;
    
    updatedFighters.forEach(fighter => {
      const activeWinStreak = fighter.streaks.find(s => s.active && s.type === 'win' && s.competitionId === COMPETITION_ID);
      const activeLoseStreak = fighter.streaks.find(s => s.active && s.type === 'lose' && s.competitionId === COMPETITION_ID);
      
      if (activeWinStreak) {
        totalActiveWinStreaks++;
        longestActiveWinStreak = Math.max(longestActiveWinStreak, activeWinStreak.count);
      }
      
      if (activeLoseStreak) {
        totalActiveLoseStreaks++;
        longestActiveLoseStreak = Math.max(longestActiveLoseStreak, activeLoseStreak.count);
      }
      
      // Count streaks that ended in Season 8
      fighter.streaks.forEach(streak => {
        if (!streak.active && streak.end && streak.end.season === SEASON_NUMBER) {
          totalClosedStreaksInSeason8++;
        }
      });
    });
    
    console.log('\n📊 Streaks Statistics:');
    console.log(`   - Active win streaks: ${totalActiveWinStreaks}`);
    console.log(`   - Active lose streaks: ${totalActiveLoseStreaks}`);
    console.log(`   - Streaks closed in Season 8: ${totalClosedStreaksInSeason8}`);
    console.log(`   - Longest active win streak: ${longestActiveWinStreak} fight(s)`);
    console.log(`   - Longest active lose streak: ${longestActiveLoseStreak} fight(s)`);
    
    console.log(`\n📁 Streaks data saved to: ${outputPath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nNext step: Verify the streaks data, then import using:');
    console.log('  node server/scripts/import-season8-streaks.js');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the calculation
calculateSeason8Streaks()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

