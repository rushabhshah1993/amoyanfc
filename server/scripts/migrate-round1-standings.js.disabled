/**
 * Migration script to generate round standings for IFC Season 1 - Round 1
 * This script calculates standings after each fight in Round 1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const POINTS_PER_WIN = 3;
const POINTS_PER_LOSS = 0;

// Load data files
const migratedDataPath = path.join(__dirname, '../../old-data/ifc-season1-migrated.json');
const fightersDataPath = path.join(__dirname, '../../old-data/fighters-old.json');
const fighterMappingPath = path.join(__dirname, '../../old-data/fighter-mapping.json');

const migratedData = JSON.parse(fs.readFileSync(migratedDataPath, 'utf8'));
const fightersOldData = JSON.parse(fs.readFileSync(fightersDataPath, 'utf8'));
const fighterMapping = JSON.parse(fs.readFileSync(fighterMappingPath, 'utf8'));

// Create reverse mapping (MongoDB ID -> Old ID)
const reverseMapping = {};
Object.keys(fighterMapping).forEach(oldId => {
  reverseMapping[fighterMapping[oldId]] = oldId;
});

// Create fighter data map (MongoDB ID -> Fighter Data)
const fightersDataMap = {};
Object.keys(fightersOldData).forEach(oldId => {
  if (oldId === 'CC') return; // Skip competition cup entry
  
  const mongoId = fighterMapping[oldId];
  if (mongoId) {
    fightersDataMap[mongoId] = {
      _id: mongoId,
      oldId: oldId,
      firstName: fightersOldData[oldId].firstName || '',
      lastName: fightersOldData[oldId].lastName || ''
    };
  }
});

/**
 * Calculate head-to-head points for tied fighters
 */
function calculateHeadToHeadPoints(tiedFighters, completedFights) {
  const h2hPoints = {};
  
  // Initialize all tied fighters with 0 points
  tiedFighters.forEach(fighterId => {
    h2hPoints[fighterId] = 0;
  });

  // Calculate points from fights between tied fighters only
  completedFights.forEach(fight => {
    if (!fight.winner || fight.fightStatus !== 'completed') return;

    const fighter1InTied = tiedFighters.includes(fight.fighter1);
    const fighter2InTied = tiedFighters.includes(fight.fighter2);

    // Only count if both fighters are in the tied group
    if (fighter1InTied && fighter2InTied) {
      h2hPoints[fight.winner] = (h2hPoints[fight.winner] || 0) + POINTS_PER_WIN;
    }
  });

  return h2hPoints;
}

/**
 * Sort standings with tiebreaking logic
 */
function sortStandingsWithTiebreakers(standings, completedFights) {
  // Group fighters by points
  const pointsGroups = {};
  
  standings.forEach(standing => {
    if (!pointsGroups[standing.points]) {
      pointsGroups[standing.points] = [];
    }
    pointsGroups[standing.points].push(standing.fighterId);
  });

  // Create a map of fighter rankings
  const fighterRankings = {};
  let currentRank = 1;

  // Sort point groups in descending order
  const sortedPoints = Object.keys(pointsGroups).map(Number).sort((a, b) => b - a);

  sortedPoints.forEach(points => {
    const tiedFighters = pointsGroups[points];

    if (tiedFighters.length === 1) {
      // No tie, assign rank directly
      fighterRankings[tiedFighters[0]] = currentRank;
      currentRank++;
    } else {
      // Multiple fighters tied - apply tiebreaking logic
      
      // Calculate head-to-head points
      const h2hPoints = calculateHeadToHeadPoints(tiedFighters, completedFights);
      
      // Sort by h2h points (desc), then by first name (asc)
      const sortedTiedFighters = [...tiedFighters].sort((a, b) => {
        const h2hA = h2hPoints[a] || 0;
        const h2hB = h2hPoints[b] || 0;

        // First compare head-to-head points
        if (h2hA !== h2hB) {
          return h2hB - h2hA; // Descending order
        }

        // If still tied, use alphabetical order by first name
        const fighterA = fightersDataMap[a];
        const fighterB = fightersDataMap[b];
        
        const nameA = fighterA?.firstName?.toLowerCase() || '';
        const nameB = fighterB?.firstName?.toLowerCase() || '';
        
        return nameA.localeCompare(nameB); // Ascending order
      });

      // Assign ranks to sorted tied fighters
      sortedTiedFighters.forEach(fighterId => {
        fighterRankings[fighterId] = currentRank;
        currentRank++;
      });
    }
  });

  // Sort standings array based on calculated rankings
  const sortedStandings = [...standings].sort((a, b) => {
    const rankA = fighterRankings[a.fighterId] || 999;
    const rankB = fighterRankings[b.fighterId] || 999;
    return rankA - rankB;
  });

  // Update rank field in each standing
  sortedStandings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return sortedStandings;
}

/**
 * Calculate standings after specific fights
 */
function calculateStandingsAfterFights(allFighterIds, completedFights, totalFightersCount) {
  // Initialize standings map
  const standingsMap = {};
  
  allFighterIds.forEach(fighterId => {
    standingsMap[fighterId] = {
      fighterId: fighterId,
      fightsCount: 0,
      wins: 0,
      points: 0,
      rank: 1,
      totalFightersCount: totalFightersCount
    };
  });

  // Count stats from all completed fights
  completedFights.forEach(fight => {
    if (!fight.winner) return;
    
    const loserId = fight.fighter1 === fight.winner ? fight.fighter2 : fight.fighter1;
    
    if (standingsMap[fight.winner]) {
      standingsMap[fight.winner].fightsCount++;
      standingsMap[fight.winner].wins++;
      standingsMap[fight.winner].points += POINTS_PER_WIN;
    }
    
    if (standingsMap[loserId]) {
      standingsMap[loserId].fightsCount++;
      // wins and points stay the same (0 points for loss)
    }
  });

  // Convert map to array
  let standingsArray = Object.values(standingsMap);
  
  // Sort with tiebreaking logic
  standingsArray = sortStandingsWithTiebreakers(standingsArray, completedFights);

  return standingsArray;
}

/**
 * Main migration function for Round 1
 */
function migrateRound1Standings() {
  console.log('Starting Round 1 standings migration...\n');

  const competitionId = migratedData.competitionMetaId;
  const seasonNumber = 1;
  const divisionNumber = 1;
  const roundNumber = 1;

  // Get all fighters in division
  const allFighterIds = migratedData.seasonMeta.leagueDivisions[0].fighters;
  const totalFightersCount = allFighterIds.length;

  console.log(`Total fighters in division: ${totalFightersCount}`);
  console.log(`Fighter IDs: ${allFighterIds.join(', ')}\n`);

  // Get Round 1 fights
  const round1 = migratedData.leagueData.divisions[0].rounds.find(r => r.roundNumber === 1);
  const round1Fights = round1.fights;

  console.log(`Total fights in Round 1: ${round1Fights.length}\n`);

  // Array to store all standings
  const allStandings = [];

  // Calculate standings after each fight
  round1Fights.forEach((fight, index) => {
    const fightNumber = index + 1;
    const completedFights = round1Fights.slice(0, fightNumber);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing Fight ${fightNumber}: ${fight.fightIdentifier}`);
    console.log(`${fightersDataMap[fight.fighter1]?.firstName} vs ${fightersDataMap[fight.fighter2]?.firstName}`);
    console.log(`Winner: ${fightersDataMap[fight.winner]?.firstName} (${reverseMapping[fight.winner]})`);
    console.log(`${'='.repeat(60)}`);

    // Calculate standings
    const standings = calculateStandingsAfterFights(
      allFighterIds,
      completedFights,
      totalFightersCount
    );

    // Create round standings object
    const roundStanding = {
      competitionId: competitionId,
      seasonNumber: seasonNumber,
      divisionNumber: divisionNumber,
      roundNumber: roundNumber,
      fightId: fight.fightIdentifier, // Using identifier as placeholder
      fightIdentifier: fight.fightIdentifier,
      standings: standings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allStandings.push(roundStanding);

    // Display standings
    console.log('\nStandings after this fight:');
    console.log('Rank | Fighter              | Fights | Wins | Points');
    console.log('-'.repeat(60));
    standings.forEach(s => {
      const fighter = fightersDataMap[s.fighterId];
      const name = `${fighter?.firstName} ${fighter?.lastName}`.padEnd(20);
      console.log(
        `${String(s.rank).padStart(4)} | ${name} | ${String(s.fightsCount).padStart(6)} | ${String(s.wins).padStart(4)} | ${String(s.points).padStart(6)}`
      );
    });
  });

  // Save to file
  const outputDir = path.join(__dirname, '../../old-data/migrated-standings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'round1-standings.json');
  fs.writeFileSync(outputPath, JSON.stringify(allStandings, null, 2), 'utf8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Migration complete!`);
  console.log(`✅ Generated ${allStandings.length} round standings documents`);
  console.log(`✅ Output saved to: ${outputPath}`);
  console.log(`${'='.repeat(60)}\n`);

  return allStandings;
}

// Run migration
try {
  migrateRound1Standings();
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

