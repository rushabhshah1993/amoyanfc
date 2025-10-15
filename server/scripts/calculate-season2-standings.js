/**
 * Calculate Season 2 Round Standings
 * This script processes all fights in Season 2 and calculates standings after each fight
 * Using the same logic as standingsCalculator.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const POINTS_PER_WIN = 3;
const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 2;

/**
 * Parse a fight identifier string into its components
 */
function parseFightIdentifier(fightIdentifier) {
  const parts = fightIdentifier.split('-');
  
  if (parts.length !== 5) {
    throw new Error(`Invalid fight identifier format: ${fightIdentifier}`);
  }

  return {
    competition: parts[0],
    seasonNumber: parseInt(parts[1].substring(1)),
    divisionNumber: parseInt(parts[2].substring(1)),
    roundNumber: parseInt(parts[3].substring(1)),
    fightNumber: parseInt(parts[4].substring(1)),
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
    } catch (error) {
      console.error(`Error parsing fight identifier: ${fight.fightIdentifier}`, error);
      return false;
    }
  });
}

/**
 * Initialize standings for all fighters
 */
function initializeStandings(fighterIds) {
  return fighterIds.map(fighterId => ({
    fighterId,
    fightsCount: 0,
    wins: 0,
    points: 0,
    rank: 1,
    totalFightersCount: fighterIds.length,
  }));
}

/**
 * Calculate standings after a specific fight
 */
function calculateStandingsForFight(
  fightIdentifier,
  allFightsInDivision,
  divisionFighters,
  fightersData
) {
  const parsedFightId = parseFightIdentifier(fightIdentifier);
  
  const standingsMap = new Map();
  const initialStandings = initializeStandings(divisionFighters);
  initialStandings.forEach(standing => {
    standingsMap.set(standing.fighterId, standing);
  });

  const completedFights = getCompletedFightsUpToPoint(allFightsInDivision, fightIdentifier);
  
  standingsMap.forEach(standing => {
    standing.fightsCount = 0;
    standing.wins = 0;
    standing.points = 0;
  });
  
  completedFights.forEach(fight => {
    if (!fight.winner) return;
    
    const winnerStanding = standingsMap.get(fight.winner);
    const loserId = fight.fighter1 === fight.winner ? fight.fighter2 : fight.fighter1;
    const loserStanding = standingsMap.get(loserId);
    
    if (winnerStanding) {
      winnerStanding.fightsCount++;
      winnerStanding.wins++;
      winnerStanding.points += POINTS_PER_WIN;
    }
    
    if (loserStanding) {
      loserStanding.fightsCount++;
    }
  });

  let standingsArray = Array.from(standingsMap.values());
  
  standingsArray = sortStandingsWithTiebreakers(
    standingsArray,
    completedFights,
    fightersData
  );

  return {
    competitionId: COMPETITION_ID,
    seasonNumber: parsedFightId.seasonNumber,
    divisionNumber: parsedFightId.divisionNumber,
    roundNumber: parsedFightId.roundNumber,
    fightId: fightIdentifier,
    fightIdentifier: fightIdentifier,
    standings: standingsArray,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load Season 2 data
 */
function loadSeason2Data() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season2-migrated.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(rawData);
}

/**
 * Load fighter mapping
 */
function loadFighterMapping() {
  const mappingPath = path.join(__dirname, '../../old-data/fighter-mapping.json');
  const rawData = fs.readFileSync(mappingPath, 'utf8');
  return JSON.parse(rawData);
}

/**
 * Create a simple fighters data map (we'll use fighter IDs as names for sorting)
 */
function createFightersDataMap(fighterIds, fighterMapping) {
  const fightersData = new Map();
  
  // Reverse the mapping to go from ObjectId to legacy ID
  const reversedMapping = {};
  Object.entries(fighterMapping).forEach(([legacyId, objectId]) => {
    reversedMapping[objectId] = legacyId;
  });
  
  fighterIds.forEach(fighterId => {
    const legacyId = reversedMapping[fighterId] || fighterId;
    // Use legacy ID as firstName for alphabetical sorting
    fightersData.set(fighterId, {
      _id: fighterId,
      firstName: legacyId,
      lastName: '',
    });
  });
  
  return fightersData;
}

/**
 * Main function to calculate all standings
 */
function calculateSeason2Standings() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 2 - ROUND STANDINGS CALCULATION');
  console.log('='.repeat(70));

  // Load data
  console.log('\n📂 Loading Season 2 data...');
  const season2Data = loadSeason2Data();
  const fighterMapping = loadFighterMapping();
  
  // Extract division data
  const division = season2Data.leagueData.divisions[0];
  const divisionFighters = season2Data.seasonMeta.leagueDivisions[0].fighters;
  
  console.log(`✅ Loaded Season 2 data`);
  console.log(`   - Fighters: ${divisionFighters.length}`);
  console.log(`   - Rounds: ${division.rounds.length}`);
  
  // Create fighters data map
  const fightersData = createFightersDataMap(divisionFighters, fighterMapping);
  
  // Collect all fights in order
  const allFights = [];
  division.rounds.forEach(round => {
    round.fights.forEach(fight => {
      allFights.push(fight);
    });
  });
  
  console.log(`   - Total Fights: ${allFights.length}`);
  
  // Calculate standings for each fight
  console.log('\n📊 Calculating standings after each fight...');
  const allStandings = [];
  let processedCount = 0;
  
  division.rounds.forEach(round => {
    round.fights.forEach(fight => {
      const standings = calculateStandingsForFight(
        fight.fightIdentifier,
        allFights,
        divisionFighters,
        fightersData
      );
      
      allStandings.push(standings);
      processedCount++;
      
      // Show progress
      const progress = Math.floor((processedCount / allFights.length) * 100);
      process.stdout.write(`\r   Progress: ${progress}% (${processedCount}/${allFights.length})`);
    });
  });
  
  console.log('\n');
  
  // Save to file
  const outputPath = path.join(__dirname, '../../old-data/migrated-standings/season2-all-rounds-standings.json');
  fs.writeFileSync(outputPath, JSON.stringify(allStandings, null, 2));
  
  console.log('\n' + '='.repeat(70));
  console.log('✨ CALCULATION COMPLETE! ✨');
  console.log('='.repeat(70));
  console.log(`\n✅ Generated ${allStandings.length} standings entries`);
  console.log(`📁 Output file: ${outputPath}`);
  
  // Show sample - first fight
  console.log('\n' + '='.repeat(70));
  console.log('SAMPLE: FIRST FIGHT (IFC-S2-D1-R1-F1)');
  console.log('='.repeat(70));
  const firstStanding = allStandings[0];
  console.log(`\nFight: ${firstStanding.fightIdentifier}`);
  console.log(`Round: ${firstStanding.roundNumber}`);
  console.log(`\nTop 3 Standings:`);
  firstStanding.standings.slice(0, 3).forEach(s => {
    console.log(`  ${s.rank}. ${s.fighterId} - ${s.points} points (${s.wins} wins, ${s.fightsCount} fights)`);
  });
  
  // Show sample - last fight
  console.log('\n' + '='.repeat(70));
  console.log('SAMPLE: LAST FIGHT (IFC-S2-D1-R9-F5)');
  console.log('='.repeat(70));
  const lastStanding = allStandings[allStandings.length - 1];
  console.log(`\nFight: ${lastStanding.fightIdentifier}`);
  console.log(`Round: ${lastStanding.roundNumber}`);
  console.log(`\nFinal Rankings:`);
  console.log('Rank | Fighter ID                       | Fights | Wins | Points');
  console.log('─'.repeat(70));
  lastStanding.standings.forEach(s => {
    const trophy = s.rank === 1 ? ' 🏆' : '';
    console.log(
      `${String(s.rank).padStart(4)} | ${s.fighterId.padEnd(32)} | ${String(s.fightsCount).padStart(6)} | ${String(s.wins).padStart(4)} | ${String(s.points).padStart(6)}${trophy}`
    );
  });
  
  console.log('\n✨ Ready for MongoDB import! ✨\n');
}

// Run the calculation
try {
  calculateSeason2Standings();
} catch (error) {
  console.error('\n❌ Error calculating standings:', error);
  console.error(error.stack);
  process.exit(1);
}

