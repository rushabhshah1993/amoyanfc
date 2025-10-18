/**
 * Calculate Season 10 Competition History
 * This script calculates competition statistics for all Season 10 fighters
 * Gets final positions from the actual final standings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 10;
const POINTS_PER_WIN = 3;

/**
 * Load Season 10 migrated data
 */
function loadSeason10Data() {
  const migratedPath = path.join(__dirname, '../../old-data/ifc-season10-migrated.json');
  
  console.log(`📂 Loading Season 10 migrated data from: ${migratedPath}`);
  
  if (!fs.existsSync(migratedPath)) {
    throw new Error(`Migrated data file not found: ${migratedPath}`);
  }
  
  const migratedData = JSON.parse(fs.readFileSync(migratedPath, 'utf8'));
  
  return migratedData;
}

/**
 * Load Season 10 standings data
 */
function loadStandingsData() {
  const standingsPath = path.join(__dirname, '../../old-data/migrated-standings/season10-all-rounds-standings.json');
  
  console.log(`📂 Loading Season 10 standings from: ${standingsPath}`);
  
  if (!fs.existsSync(standingsPath)) {
    throw new Error(`Standings file not found: ${standingsPath}`);
  }
  
  const standingsData = JSON.parse(fs.readFileSync(standingsPath, 'utf8'));
  
  return standingsData;
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
 * Get final positions from standings data
 */
function getFinalPositionsFromStandings(standingsData) {
  console.log('\n📊 Extracting final positions from standings data...');
  
  const finalPositions = new Map();
  
  // Division 1: Round 9, Fight 5
  const div1Final = standingsData.find(s => 
    s.divisionNumber === 1 && 
    s.roundNumber === 9 && 
    s.fightIdentifier === 'IFC-S10-D1-R9-F5'
  );
  
  if (div1Final) {
    console.log('   - Division 1 final standings found');
    div1Final.standings.forEach(standing => {
      finalPositions.set(standing.fighterId, {
        division: 1,
        position: standing.rank
      });
    });
  }
  
  // Division 2: Round 11, Fight 6
  const div2Final = standingsData.find(s => 
    s.divisionNumber === 2 && 
    s.roundNumber === 11 && 
    s.fightIdentifier === 'IFC-S10-D2-R11-F6'
  );
  
  if (div2Final) {
    console.log('   - Division 2 final standings found');
    div2Final.standings.forEach(standing => {
      finalPositions.set(standing.fighterId, {
        division: 2,
        position: standing.rank
      });
    });
  }
  
  // Division 3: Round 15, Fight 8
  const div3Final = standingsData.find(s => 
    s.divisionNumber === 3 && 
    s.roundNumber === 15 && 
    s.fightIdentifier === 'IFC-S10-D3-R15-F8'
  );
  
  if (div3Final) {
    console.log('   - Division 3 final standings found');
    div3Final.standings.forEach(standing => {
      finalPositions.set(standing.fighterId, {
        division: 3,
        position: standing.rank
      });
    });
  }
  
  console.log(`✅ Extracted final positions for ${finalPositions.size} fighters`);
  
  return finalPositions;
}

/**
 * Calculate Season 10 statistics for all fighters
 */
function calculateSeason10Statistics(seasonData, standingsData, fightersData) {
  console.log('\n📊 Calculating Season 10 competition history...');
  
  // Get final positions from standings
  const finalPositions = getFinalPositionsFromStandings(standingsData);
  
  // Map to store season statistics for each fighter
  const fighterStats = new Map();
  
  // Initialize all Season 10 fighters
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
  
  console.log(`   - Total fighters in Season 10: ${fighterStats.size}`);
  
  // Process all fights
  let totalFightsProcessed = 0;
  
  seasonData.leagueData.divisions.forEach(division => {
    console.log(`   - Processing Division ${division.divisionNumber}...`);
    
    let divisionFights = 0;
    
    division.rounds.forEach(round => {
      round.fights.forEach(fight => {
        if (fight.fightStatus !== 'completed' || !fight.winner) {
          return;
        }
        
        totalFightsProcessed++;
        divisionFights++;
        
        const fighter1Id = fight.fighter1.toString();
        const fighter2Id = fight.fighter2.toString();
        const winnerId = fight.winner.toString();
        
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
    
    console.log(`     ✓ Processed ${divisionFights} fights`);
  });
  
  console.log(`   ✅ Processed ${totalFightsProcessed} total fights`);
  
  // Add final positions from standings data
  console.log('\n📊 Adding final positions from standings...');
  fighterStats.forEach((stats, fighterId) => {
    const finalPos = finalPositions.get(fighterId);
    if (finalPos) {
      stats.finalPosition = finalPos.position;
    } else {
      console.warn(`   ⚠️  No final position found for ${stats.fighterName}`);
    }
  });
  
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
  console.log('SEASON 10 COMPETITION HISTORY CALCULATION');
  console.log('='.repeat(70));

  try {
    const season10Data = loadSeason10Data();
    const standingsData = loadStandingsData();
    const fightersData = loadFightersData();
    
    console.log(`\n✅ Loaded Season 10 with ${season10Data.leagueData.divisions.length} divisions`);
    console.log(`✅ Loaded ${standingsData.length} standings snapshots`);
    
    const season10Stats = calculateSeason10Statistics(season10Data, standingsData, fightersData);
    
    console.log('\n' + '='.repeat(70));
    console.log('CALCULATION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Calculated competition history for ${season10Stats.length} fighters`);
    
    // Show sample data
    console.log('\n📋 Sample Competition History (First 5 fighters):');
    season10Stats.slice(0, 5).forEach(fighter => {
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
      const divFighters = season10Stats.filter(f => f.divisionNumber === divNum);
      const avgWins = divFighters.reduce((sum, f) => sum + f.wins, 0) / divFighters.length;
      const avgWinPct = divFighters.reduce((sum, f) => sum + f.winPercentage, 0) / divFighters.length;
      
      console.log(`   Division ${divNum}:`);
      console.log(`      Fighters: ${divFighters.length}`);
      console.log(`      Avg Wins: ${avgWins.toFixed(1)}`);
      console.log(`      Avg Win %: ${avgWinPct.toFixed(1)}%`);
    });
    
    // Find division winners
    console.log('\n🏆 Division Winners (Position 1):');
    [1, 2, 3].forEach(divNum => {
      const winner = season10Stats.find(f => f.divisionNumber === divNum && f.finalPosition === 1);
      if (winner) {
        console.log(`   Division ${divNum}: ${winner.fighterName} (${winner.wins}W-${winner.losses}L, ${winner.points} pts)`);
      }
    });
    
    // Save to file
    const outputPath = path.join(__dirname, '../../old-data/season10-competition-history.json');
    fs.writeFileSync(outputPath, JSON.stringify(season10Stats, null, 2), 'utf8');
    
    console.log(`\n📁 Competition history saved to: ${outputPath}`);
    
    // File statistics
    const stats = fs.statSync(outputPath);
    console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 10 competition history has been calculated!');
    console.log('\nNext steps:');
    console.log('1. Review the competition history data');
    console.log('2. Verify final positions match standings');
    console.log('3. Import to MongoDB using import-season10-competition-history.js');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the calculation
calculateCompetitionHistory();

