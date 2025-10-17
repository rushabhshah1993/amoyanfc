/**
 * Calculate Season 7 Round Standings
 * This script processes all fights in Season 7 and calculates standings after each fight
 * Using the same logic as standingsCalculator.ts with head-to-head tiebreaking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const POINTS_PER_WIN = 3;
const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 7;

/**
 * Parse a fight identifier string into its components
 * Format: S7-D1-R1-F1
 */
function parseFightIdentifier(fightIdentifier) {
  const parts = fightIdentifier.split('-');
  
  if (parts.length !== 4) {
    throw new Error(`Invalid fight identifier format: ${fightIdentifier}. Expected format: S7-D1-R1-F1`);
  }

  return {
    seasonNumber: parseInt(parts[0].substring(1)),
    divisionNumber: parseInt(parts[1].substring(1)),
    roundNumber: parseInt(parts[2].substring(1)),
    fightNumber: parseInt(parts[3].substring(1)),
  };
}

/**
 * Calculate head-to-head points for tied fighters
 */
function calculateHeadToHeadPoints(tiedFighters, allFights) {
  const h2hPoints = new Map();
  
  tiedFighters.forEach(fighterId => {
    h2hPoints.set(fighterId, 0);
  });

  allFights.forEach(fight => {
    if (!fight.winner || fight.fightStatus !== 'completed') return;

    const fighter1InTied = tiedFighters.includes(fight.fighter1);
    const fighter2InTied = tiedFighters.includes(fight.fighter2);

    if (fighter1InTied && fighter2InTied) {
      const currentPoints = h2hPoints.get(fight.winner) || 0;
      h2hPoints.set(fight.winner, currentPoints + POINTS_PER_WIN);
    }
  });

  return h2hPoints;
}

/**
 * Sort standings with tiebreaking logic
 */
function sortStandingsWithTiebreakers(standings, allFights, fightersData) {
  const pointsGroups = new Map();
  
  standings.forEach(standing => {
    const fighters = pointsGroups.get(standing.points) || [];
    fighters.push(standing.fighterId);
    pointsGroups.set(standing.points, fighters);
  });

  const fighterRankings = new Map();
  let currentRank = 1;

  const sortedPoints = Array.from(pointsGroups.keys()).sort((a, b) => b - a);

  sortedPoints.forEach(points => {
    const tiedFighters = pointsGroups.get(points) || [];

    if (tiedFighters.length === 1) {
      fighterRankings.set(tiedFighters[0], currentRank);
      currentRank++;
    } else {
      const h2hPoints = calculateHeadToHeadPoints(tiedFighters, allFights);
      
      const sortedTiedFighters = [...tiedFighters].sort((a, b) => {
        const h2hA = h2hPoints.get(a) || 0;
        const h2hB = h2hPoints.get(b) || 0;

        if (h2hA !== h2hB) {
          return h2hB - h2hA;
        }

        const fighterA = fightersData.get(a);
        const fighterB = fightersData.get(b);
        
        const nameA = fighterA?.firstName?.toLowerCase() || '';
        const nameB = fighterB?.firstName?.toLowerCase() || '';
        
        return nameA.localeCompare(nameB);
      });

      sortedTiedFighters.forEach(fighterId => {
        fighterRankings.set(fighterId, currentRank);
        currentRank++;
      });
    }
  });

  const sortedStandings = [...standings].sort((a, b) => {
    const rankA = fighterRankings.get(a.fighterId) || 999;
    const rankB = fighterRankings.get(b.fighterId) || 999;
    return rankA - rankB;
  });

  sortedStandings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return sortedStandings;
}

/**
 * Get all completed fights up to a specific fight
 */
function getCompletedFightsUpToPoint(allFights, upToFightIdentifier) {
  const targetFight = parseFightIdentifier(upToFightIdentifier);
  
  return allFights.filter(fight => {
    if (fight.fightStatus !== 'completed' || !fight.winner) return false;
    
    try {
      const fightId = parseFightIdentifier(fight.fightIdentifier);
      
      if (fightId.seasonNumber !== targetFight.seasonNumber ||
          fightId.divisionNumber !== targetFight.divisionNumber) {
        return false;
      }
      
      if (fightId.roundNumber < targetFight.roundNumber) {
        return true;
      }
      
      if (fightId.roundNumber === targetFight.roundNumber &&
          fightId.fightNumber <= targetFight.fightNumber) {
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Error parsing fight identifier:', fight.fightIdentifier, e);
      return false;
    }
  });
}

/**
 * Calculate standings for a division after a specific fight
 */
function calculateStandingsForDivision(fighters, allFights, upToFightIdentifier, fightersData) {
  const completedFights = getCompletedFightsUpToPoint(allFights, upToFightIdentifier);
  
  const fighterStats = new Map();
  fighters.forEach(fighterId => {
    fighterStats.set(fighterId, {
      fighterId,
      fighterName: fightersData.get(fighterId)?.firstName || 'Unknown',
      fightsCount: 0,
      wins: 0,
      points: 0
    });
  });

  completedFights.forEach(fight => {
    const fighter1Stats = fighterStats.get(fight.fighter1);
    const fighter2Stats = fighterStats.get(fight.fighter2);

    if (fighter1Stats) {
      fighter1Stats.fightsCount++;
      if (fight.winner === fight.fighter1) {
        fighter1Stats.wins++;
        fighter1Stats.points += POINTS_PER_WIN;
      }
    }

    if (fighter2Stats) {
      fighter2Stats.fightsCount++;
      if (fight.winner === fight.fighter2) {
        fighter2Stats.wins++;
        fighter2Stats.points += POINTS_PER_WIN;
      }
    }
  });

  let standings = Array.from(fighterStats.values());

  standings = sortStandingsWithTiebreakers(standings, completedFights, fightersData);

  const totalFightersCount = fighters.length;
  standings.forEach(standing => {
    standing.totalFightersCount = totalFightersCount;
  });

  return standings;
}

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
        fightersMap.set(objectId, fighter);
      }
    }
  });
  
  console.log(`✅ Loaded data for ${fightersMap.size} fighters`);
  return fightersMap;
}

/**
 * Main calculation function
 */
function calculateAllStandings() {
  console.log('\n' + '='.repeat(70));
  console.log('SEASON 7 STANDINGS CALCULATION');
  console.log('='.repeat(70));

  try {
    const season7Data = loadSeason7Data();
    const fightersData = loadFightersData();
    
    console.log(`\n✅ Loaded Season 7 with ${season7Data.leagueData.divisions.length} divisions`);
    
    const allStandings = [];
    
    season7Data.leagueData.divisions.forEach(division => {
      console.log(`\n📊 Processing Division ${division.divisionNumber}...`);
      
      const divisionFighters = season7Data.seasonMeta.leagueDivisions
        .find(d => d.divisionNumber === division.divisionNumber)?.fighters || [];
      
      const allDivisionFights = [];
      division.rounds.forEach(round => {
        round.fights.forEach(fight => {
          allDivisionFights.push(fight);
        });
      });
      
      console.log(`   - Fighters: ${divisionFighters.length}`);
      console.log(`   - Rounds: ${division.rounds.length}`);
      console.log(`   - Total Fights: ${allDivisionFights.length}`);
      
      let fightCount = 0;
      
      division.rounds.forEach(round => {
        console.log(`   - Round ${round.roundNumber}: ${round.fights.length} fights`);
        
        round.fights.forEach(fight => {
          fightCount++;
          
          const standings = calculateStandingsForDivision(
            divisionFighters,
            allDivisionFights,
            fight.fightIdentifier,
            fightersData
          );
          
          const standingSnapshot = {
            competitionId: COMPETITION_ID,
            seasonNumber: SEASON_NUMBER,
            divisionNumber: division.divisionNumber,
            roundNumber: round.roundNumber,
            fightId: fight.fightIdentifier,
            fightIdentifier: fight.fightIdentifier,
            standings
          };
          
          allStandings.push(standingSnapshot);
        });
      });
      
      console.log(`   ✅ Calculated ${fightCount} standing snapshots for Division ${division.divisionNumber}`);
    });
    
    console.log(`\n✅ Total standing snapshots calculated: ${allStandings.length}`);
    
    const outputPath = path.join(__dirname, '../../old-data/migrated-standings/season7-all-rounds-standings.json');
    fs.writeFileSync(outputPath, JSON.stringify(allStandings, null, 2), 'utf8');
    
    console.log(`\n📁 Standings saved to: ${outputPath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('CALCULATION SUMMARY');
    console.log('='.repeat(70));
    
    season7Data.leagueData.divisions.forEach(division => {
      const divisionStandings = allStandings.filter(s => s.divisionNumber === division.divisionNumber);
      console.log(`\nDivision ${division.divisionNumber}:`);
      console.log(`  - Total snapshots: ${divisionStandings.length}`);
      console.log(`  - Rounds: ${division.rounds.length}`);
      
      const lastStanding = divisionStandings[divisionStandings.length - 1];
      if (lastStanding) {
        console.log(`  - Final standings (after last fight):`);
        lastStanding.standings.slice(0, 3).forEach((s, idx) => {
          const trophy = idx === 0 ? ' 🏆' : '';
          console.log(`    ${idx + 1}. ${s.fighterName} - ${s.points} pts (${s.wins}W-${s.fightsCount - s.wins}L)${trophy}`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nNext step: Verify the standings data using:');
    console.log('  node server/scripts/verify-season7-standings.js');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the calculation
calculateAllStandings();

