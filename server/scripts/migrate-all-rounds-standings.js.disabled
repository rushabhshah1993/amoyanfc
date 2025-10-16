/**
 * Migration script to generate round standings for IFC Season 1 - All 9 Rounds
 * This script calculates standings after each fight across all rounds
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
 * Main migration function for all rounds
 */
function migrateAllRoundsStandings() {
  console.log('Starting IFC Season 1 - All Rounds Standings Migration...\n');
  console.log('='.repeat(70));

  const competitionId = migratedData.competitionMetaId;
  const seasonNumber = 1;
  const divisionNumber = 1;

  // Get all fighters in division
  const allFighterIds = migratedData.seasonMeta.leagueDivisions[0].fighters;
  const totalFightersCount = allFighterIds.length;

  console.log(`Competition ID: ${competitionId}`);
  console.log(`Season: ${seasonNumber}`);
  console.log(`Division: ${divisionNumber}`);
  console.log(`Total fighters: ${totalFightersCount}`);
  console.log('='.repeat(70));

  // Get all rounds
  const allRounds = migratedData.leagueData.divisions[0].rounds;
  console.log(`\nTotal rounds to process: ${allRounds.length}\n`);

  // Array to store all standings
  const allStandings = [];
  
  // Track all completed fights across rounds (for cumulative standings)
  const allCompletedFights = [];

  // Process each round
  allRounds.forEach(round => {
    const roundNumber = round.roundNumber;
    const roundFights = round.fights;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`ROUND ${roundNumber} - Processing ${roundFights.length} fights`);
    console.log(`${'='.repeat(70)}`);

    // Process each fight in the round
    roundFights.forEach((fight, fightIndex) => {
      const fightNumber = fightIndex + 1;
      
      // Add this fight to all completed fights
      allCompletedFights.push(fight);
      
      console.log(`\n  Fight ${fightNumber}: ${fight.fightIdentifier}`);
      console.log(`  ${fightersDataMap[fight.fighter1]?.firstName} vs ${fightersDataMap[fight.fighter2]?.firstName}`);
      console.log(`  Winner: ${fightersDataMap[fight.winner]?.firstName} (${reverseMapping[fight.winner]})`);

      // Calculate cumulative standings up to this fight
      const standings = calculateStandingsAfterFights(
        allFighterIds,
        allCompletedFights,
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

      // Show top 3 after this fight
      console.log(`  Top 3: ${standings.slice(0, 3).map(s => 
        `${fightersDataMap[s.fighterId]?.firstName}(${s.points}pts)`
      ).join(', ')}`);
    });

    // Show full standings after each round completes
    console.log(`\n  Standings after Round ${roundNumber} completes:`);
    console.log(`  ${'─'.repeat(68)}`);
    console.log(`  Rank | Fighter              | Fights | Wins | Points`);
    console.log(`  ${'─'.repeat(68)}`);
    
    // Get the last standings of this round
    const lastStanding = allStandings[allStandings.length - 1];
    lastStanding.standings.slice(0, 10).forEach(s => {
      const fighter = fightersDataMap[s.fighterId];
      const name = `${fighter?.firstName} ${fighter?.lastName}`.padEnd(20);
      console.log(
        `  ${String(s.rank).padStart(4)} | ${name} | ${String(s.fightsCount).padStart(6)} | ${String(s.wins).padStart(4)} | ${String(s.points).padStart(6)}`
      );
    });
  });

  // Save to file
  const outputDir = path.join(__dirname, '../../old-data/migrated-standings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'all-rounds-standings.json');
  fs.writeFileSync(outputPath, JSON.stringify(allStandings, null, 2), 'utf8');

  // Generate summary statistics
  const totalFights = allCompletedFights.length;
  const standingsPerRound = allRounds.map(r => r.fights.length);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ MIGRATION COMPLETE!`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Total rounds processed: ${allRounds.length}`);
  console.log(`Total fights processed: ${totalFights}`);
  console.log(`Total standings documents generated: ${allStandings.length}`);
  console.log(`Standings per round: ${standingsPerRound.join(', ')}`);
  console.log(`\nOutput saved to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  
  // Show final standings
  const finalStandings = allStandings[allStandings.length - 1].standings;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FINAL SEASON STANDINGS`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Rank | Fighter              | Fights | Wins | Points`);
  console.log(`${'─'.repeat(70)}`);
  finalStandings.forEach(s => {
    const fighter = fightersDataMap[s.fighterId];
    const name = `${fighter?.firstName} ${fighter?.lastName}`.padEnd(20);
    const isWinner = s.rank === 1 ? ' 🏆' : '';
    console.log(
      `${String(s.rank).padStart(4)} | ${name} | ${String(s.fightsCount).padStart(6)} | ${String(s.wins).padStart(4)} | ${String(s.points).padStart(6)}${isWinner}`
    );
  });
  
  console.log(`${'='.repeat(70)}\n`);

  return allStandings;
}

// Run migration
try {
  const startTime = Date.now();
  migrateAllRoundsStandings();
  const endTime = Date.now();
  console.log(`⏱️  Migration completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds\n`);
} catch (error) {
  console.error('❌ Migration failed:', error);
  console.error(error.stack);
  process.exit(1);
}

