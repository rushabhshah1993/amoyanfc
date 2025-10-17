/**
 * Calculate Season 7 Competition History
 * This script processes all Season 7 fights and calculates competition history updates
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 7;
const POINTS_PER_WIN = 3;

/**
 * Load Season 7 competition data
 */
function loadSeason7Data() {
  const migratedPath = path.join(__dirname, '../../old-data/ifc-season7-migrated.json');
  const seasonPath = path.join(__dirname, '../../old-data/ifc-season7-season.json');
  
  console.log(`📂 Loading Season 7 migrated data from: ${migratedPath}`);
  console.log(`📂 Loading Season 7 season data from: ${seasonPath}`);
  
  if (!fs.existsSync(migratedPath)) {
    throw new Error(`Migrated data file not found: ${migratedPath}`);
  }
  if (!fs.existsSync(seasonPath)) {
    throw new Error(`Season data file not found: ${seasonPath}`);
  }
  
  const migratedData = JSON.parse(fs.readFileSync(migratedPath, 'utf8'));
  const seasonData = JSON.parse(fs.readFileSync(seasonPath, 'utf8'));
  
  // Merge the data
  return {
    ...migratedData,
    finalPositions: seasonData.finalPositions
  };
}

/**
 * Load fighters data
 */
function loadFightersData() {
  const dataPath = path.join(__dirname, '../../old-data/fighters-old.json');
  console.log(`📂 Loading fighters data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Fighters data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const fightersObj = JSON.parse(rawData);
  
  // Load fighter mapping
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
function calculateWinPercentage(wins, totalFights) {
  if (totalFights === 0) return 0;
  return (wins / totalFights) * 100;
}

/**
 * Calculate Season 7 statistics for all fighters
 */
function calculateSeason7Statistics(seasonData, fightersData) {
  console.log('\n📊 Calculating Season 7 competition history...');
  
  // Map to store season statistics for each fighter
  const fighterStats = new Map();
  
  // Initialize all Season 7 fighters
  seasonData.seasonMeta.leagueDivisions.forEach(division => {
    division.fighters.forEach(fighterId => {
      fighterStats.set(fighterId, {
        fighterId,
        fighterName: fightersData.get(fighterId) ? 
          `${fightersData.get(fighterId).firstName} ${fightersData.get(fighterId).lastName}` : 
          'Unknown',
        fighterCode: fightersData.get(fighterId)?.code || 'Unknown',
        divisionNumber: division.divisionNumber,
        fights: 0,
        wins: 0,
        losses: 0,
        points: 0,
        winPercentage: 0,
        finalPosition: null
      });
    });
  });
  
  console.log(`   - Total fighters in Season 7: ${fighterStats.size}`);
  
  // Process all fights
  let totalFightsProcessed = 0;
  
  seasonData.leagueData.divisions.forEach(division => {
    console.log(`   - Processing Division ${division.divisionNumber}...`);
    
    division.rounds.forEach(round => {
      round.fights.forEach(fight => {
        if (fight.fightStatus !== 'completed' || !fight.winner) {
          return;
        }
        
        totalFightsProcessed++;
        
        const fighter1Id = fight.fighter1;
        const fighter2Id = fight.fighter2;
        const winnerId = fight.winner;
        
        // Update fighter1 stats
        const f1Stats = fighterStats.get(fighter1Id);
        if (f1Stats) {
          f1Stats.fights++;
          if (winnerId === fighter1Id) {
            f1Stats.wins++;
            f1Stats.points += POINTS_PER_WIN;
          } else {
            f1Stats.losses++;
          }
          f1Stats.winPercentage = calculateWinPercentage(f1Stats.wins, f1Stats.fights);
        }
        
        // Update fighter2 stats
        const f2Stats = fighterStats.get(fighter2Id);
        if (f2Stats) {
          f2Stats.fights++;
          if (winnerId === fighter2Id) {
            f2Stats.wins++;
            f2Stats.points += POINTS_PER_WIN;
          } else {
            f2Stats.losses++;
          }
          f2Stats.winPercentage = calculateWinPercentage(f2Stats.wins, f2Stats.fights);
        }
      });
    });
  });
  
  console.log(`   ✅ Processed ${totalFightsProcessed} fights`);
  
  // Add final positions from season data
  if (seasonData.finalPositions) {
    seasonData.finalPositions.forEach(divisionPositions => {
      divisionPositions.positions.forEach(position => {
        // Need to map fighter code to ObjectId
        const fighterMapping = JSON.parse(fs.readFileSync(
          path.join(__dirname, '../../old-data/fighter-mapping.json'), 
          'utf8'
        ));
        const fighterId = fighterMapping[position.fighterId];
        
        const stats = fighterStats.get(fighterId);
        if (stats) {
          stats.finalPosition = position.rank;
        }
      });
    });
  }
  
  // Convert to array
  const statsArray = Array.from(fighterStats.values());
  
  // Sort by fighter code for consistency
  statsArray.sort((a, b) => a.fighterCode.localeCompare(b.fighterCode));
  
  return statsArray;
}

/**
 * Main calculation function
 */
function calculateCompetitionHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('SEASON 7 COMPETITION HISTORY CALCULATION');
  console.log('='.repeat(70));

  try {
    const season7Data = loadSeason7Data();
    const fightersData = loadFightersData();
    
    console.log(`\n✅ Loaded Season 7 with ${season7Data.leagueData.divisions.length} divisions`);
    
    const season7Stats = calculateSeason7Statistics(season7Data, fightersData);
    
    console.log('\n' + '='.repeat(70));
    console.log('CALCULATION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Calculated competition history for ${season7Stats.length} fighters`);
    
    // Show sample data
    console.log('\n📋 Sample Competition History (First 5 fighters):');
    season7Stats.slice(0, 5).forEach(fighter => {
      console.log(`\n   ${fighter.fighterName} (${fighter.fighterCode}) - Division ${fighter.divisionNumber}`);
      console.log(`      Fights: ${fighter.fights}`);
      console.log(`      Record: ${fighter.wins}W-${fighter.losses}L`);
      console.log(`      Points: ${fighter.points}`);
      console.log(`      Win %: ${fighter.winPercentage.toFixed(2)}%`);
      console.log(`      Final Position: ${fighter.finalPosition || 'N/A'}`);
    });
    
    // Statistics by division
    console.log('\n📊 Statistics by Division:');
    [1, 2, 3].forEach(divNum => {
      const divFighters = season7Stats.filter(f => f.divisionNumber === divNum);
      const avgWins = divFighters.reduce((sum, f) => sum + f.wins, 0) / divFighters.length;
      const avgWinPct = divFighters.reduce((sum, f) => sum + f.winPercentage, 0) / divFighters.length;
      
      console.log(`   Division ${divNum}:`);
      console.log(`      Fighters: ${divFighters.length}`);
      console.log(`      Avg Wins: ${avgWins.toFixed(1)}`);
      console.log(`      Avg Win %: ${avgWinPct.toFixed(1)}%`);
    });
    
    // Find division winners
    console.log('\n🏆 Division Winners:');
    [1, 2, 3].forEach(divNum => {
      const winner = season7Stats.find(f => f.divisionNumber === divNum && f.finalPosition === 1);
      if (winner) {
        console.log(`   Division ${divNum}: ${winner.fighterName} (${winner.wins}W-${winner.losses}L, ${winner.points} pts)`);
      }
    });
    
    // Save to file
    const outputPath = path.join(__dirname, '../../old-data/season7-competition-history.json');
    fs.writeFileSync(outputPath, JSON.stringify(season7Stats, null, 2), 'utf8');
    
    console.log(`\n📁 Competition history saved to: ${outputPath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nNext step: Verify the competition history data using:');
    console.log('  node server/scripts/verify-season7-competition-history.js');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the calculation
calculateCompetitionHistory();

