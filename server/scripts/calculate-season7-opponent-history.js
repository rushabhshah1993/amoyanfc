/**
 * Calculate Season 7 Opponent History
 * This script processes all fights in Season 7 and calculates opponent history for each fighter
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 7;

/**
 * Load Season 7 competition data
 */
function loadSeason7Data() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season7-migrated.json');
  console.log(`📂 Loading Season 7 data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(rawData);
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
  console.log('\n📊 Processing Season 7 fights for opponent history...');
  
  // Map to store opponent history for each fighter
  // Structure: Map<fighterId, Map<opponentId, historyData>>
  const fighterOpponentHistory = new Map();
  
  // Initialize map for all fighters
  const allFighterIds = new Set();
  seasonData.seasonMeta.leagueDivisions.forEach(division => {
    division.fighters.forEach(fighterId => {
      allFighterIds.add(fighterId);
      if (!fighterOpponentHistory.has(fighterId)) {
        fighterOpponentHistory.set(fighterId, new Map());
      }
    });
  });
  
  console.log(`   - Total fighters in Season 7: ${allFighterIds.size}`);
  
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
        
        const fighter1Id = fight.fighter1;
        const fighter2Id = fight.fighter2;
        const winnerId = fight.winner;
        
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
function calculateOpponentHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('SEASON 7 OPPONENT HISTORY CALCULATION');
  console.log('='.repeat(70));

  try {
    const season7Data = loadSeason7Data();
    const fightersData = loadFightersData();
    
    console.log(`\n✅ Loaded Season 7 with ${season7Data.leagueData.divisions.length} divisions`);
    
    const opponentHistoryData = processSeasonFights(season7Data, fightersData);
    
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
      
      console.log('\n🔄 Notable Rematches in Season 7:');
      rematchData.slice(0, 5).forEach(match => {
        console.log(`   - ${match.fighter1} vs ${match.fighter2}: ${match.totalFights} fights (${match.record})`);
      });
    }
    
    // Save to file
    const outputPath = path.join(__dirname, '../../old-data/season7-opponent-history.json');
    fs.writeFileSync(outputPath, JSON.stringify(opponentHistoryData, null, 2), 'utf8');
    
    console.log(`\n📁 Opponent history saved to: ${outputPath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nNext step: Verify the opponent history data using:');
    console.log('  node server/scripts/verify-season7-opponent-history.js');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the calculation
calculateOpponentHistory();

