/**
 * Utility functions for calculating and sorting league standings
 * with support for head-to-head tiebreaking logic
 */

// Types
interface FighterStanding {
  fighterId: string;
  fightsCount: number;
  wins: number;
  points: number;
  rank: number;
  totalFightersCount: number;
}

interface RoundStandings {
  id?: string;
  competitionId: string;
  seasonNumber: number;
  divisionNumber: number;
  roundNumber: number;
  fightId: string;
  standings: FighterStanding[];
  createdAt?: string;
  updatedAt?: string;
}

interface Fight {
  _id?: string;
  fighter1: string;
  fighter2: string;
  winner?: string;
  fightIdentifier: string;
  fightStatus: string;
}

interface FighterData {
  _id: string;
  firstName: string;
  lastName: string;
}

interface ParsedFightId {
  competition: string;
  seasonNumber: number;
  divisionNumber: number;
  roundNumber: number;
  fightNumber: number;
}

// Constants
const POINTS_PER_WIN = 3;
const POINTS_PER_LOSS = 0;

/**
 * Parse a fight identifier string into its components
 * @param fightIdentifier - Format: "IFC-S1-D1-R1-F1"
 * @returns Parsed fight identifier components
 */
export function parseFightIdentifier(fightIdentifier: string): ParsedFightId {
  const parts = fightIdentifier.split('-');
  
  if (parts.length !== 5) {
    throw new Error(`Invalid fight identifier format: ${fightIdentifier}`);
  }

  return {
    competition: parts[0],
    seasonNumber: parseInt(parts[1].substring(1)), // Remove 'S' prefix
    divisionNumber: parseInt(parts[2].substring(1)), // Remove 'D' prefix
    roundNumber: parseInt(parts[3].substring(1)), // Remove 'R' prefix
    fightNumber: parseInt(parts[4].substring(1)), // Remove 'F' prefix
  };
}

/**
 * Calculate head-to-head points for a group of tied fighters
 * @param tiedFighters - Array of fighter IDs that are tied
 * @param allFights - All completed fights in the season/division
 * @returns Map of fighter ID to head-to-head points
 */
function calculateHeadToHeadPoints(
  tiedFighters: string[],
  allFights: Fight[]
): Map<string, number> {
  const h2hPoints = new Map<string, number>();
  
  // Initialize all tied fighters with 0 points
  tiedFighters.forEach(fighterId => {
    h2hPoints.set(fighterId, 0);
  });

  // Calculate points from fights between tied fighters only
  allFights.forEach(fight => {
    if (!fight.winner || fight.fightStatus !== 'completed') return;

    const fighter1InTied = tiedFighters.includes(fight.fighter1);
    const fighter2InTied = tiedFighters.includes(fight.fighter2);

    // Only count if both fighters are in the tied group
    if (fighter1InTied && fighter2InTied) {
      const currentPoints = h2hPoints.get(fight.winner) || 0;
      h2hPoints.set(fight.winner, currentPoints + POINTS_PER_WIN);
    }
  });

  return h2hPoints;
}

/**
 * Sort fighters with tiebreaking logic:
 * 1. By points (descending)
 * 2. By head-to-head points among tied fighters (descending)
 * 3. By first name alphabetically (ascending)
 * 
 * @param standings - Array of fighter standings
 * @param allFights - All completed fights in the season/division
 * @param fightersData - Map of fighter ID to fighter data
 * @returns Sorted standings array
 */
export function sortStandingsWithTiebreakers(
  standings: FighterStanding[],
  allFights: Fight[],
  fightersData: Map<string, FighterData>
): FighterStanding[] {
  // Group fighters by points
  const pointsGroups = new Map<number, string[]>();
  
  standings.forEach(standing => {
    const fighters = pointsGroups.get(standing.points) || [];
    fighters.push(standing.fighterId);
    pointsGroups.set(standing.points, fighters);
  });

  // Create a map of fighter rankings considering tiebreakers
  const fighterRankings = new Map<string, number>();
  let currentRank = 1;

  // Sort point groups in descending order
  const sortedPoints = Array.from(pointsGroups.keys()).sort((a, b) => b - a);

  sortedPoints.forEach(points => {
    const tiedFighters = pointsGroups.get(points) || [];

    if (tiedFighters.length === 1) {
      // No tie, assign rank directly
      fighterRankings.set(tiedFighters[0], currentRank);
      currentRank++;
    } else {
      // Multiple fighters tied - apply tiebreaking logic
      
      // Step 1: Calculate head-to-head points
      const h2hPoints = calculateHeadToHeadPoints(tiedFighters, allFights);
      
      // Step 2: Sort by h2h points (desc), then by first name (asc)
      const sortedTiedFighters = [...tiedFighters].sort((a, b) => {
        const h2hA = h2hPoints.get(a) || 0;
        const h2hB = h2hPoints.get(b) || 0;

        // First compare head-to-head points
        if (h2hA !== h2hB) {
          return h2hB - h2hA; // Descending order
        }

        // If still tied, use alphabetical order by first name
        const fighterA = fightersData.get(a);
        const fighterB = fightersData.get(b);
        
        const nameA = fighterA?.firstName?.toLowerCase() || '';
        const nameB = fighterB?.firstName?.toLowerCase() || '';
        
        return nameA.localeCompare(nameB); // Ascending order
      });

      // Assign ranks to sorted tied fighters
      sortedTiedFighters.forEach(fighterId => {
        fighterRankings.set(fighterId, currentRank);
        currentRank++;
      });
    }
  });

  // Sort standings array based on calculated rankings
  const sortedStandings = [...standings].sort((a, b) => {
    const rankA = fighterRankings.get(a.fighterId) || 999;
    const rankB = fighterRankings.get(b.fighterId) || 999;
    return rankA - rankB;
  });

  // Update rank field in each standing
  sortedStandings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return sortedStandings;
}

/**
 * Get all completed fights up to a specific fight in a round
 * @param allFights - All fights in the season/division
 * @param upToFightIdentifier - Fight identifier to stop at (inclusive)
 * @returns Array of completed fights up to the specified fight
 */
export function getCompletedFightsUpToPoint(
  allFights: Fight[],
  upToFightIdentifier: string
): Fight[] {
  const targetFight = parseFightIdentifier(upToFightIdentifier);
  
  return allFights.filter(fight => {
    if (fight.fightStatus !== 'completed' || !fight.winner) return false;
    
    try {
      const fightId = parseFightIdentifier(fight.fightIdentifier);
      
      // Only include fights from same season and division
      if (fightId.seasonNumber !== targetFight.seasonNumber ||
          fightId.divisionNumber !== targetFight.divisionNumber) {
        return false;
      }
      
      // Include fights from earlier rounds
      if (fightId.roundNumber < targetFight.roundNumber) {
        return true;
      }
      
      // Include fights from same round up to and including target fight
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
 * Initialize standings for all fighters in a division with zero stats
 * @param fighterIds - Array of fighter IDs in the division
 * @returns Array of initialized fighter standings
 */
export function initializeStandings(fighterIds: string[]): FighterStanding[] {
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
 * Calculate standings after a fight has been completed
 * This is the main function to be called when a winner is selected
 * 
 * @param winnerId - Fighter ID of the winner
 * @param loserId - Fighter ID of the loser
 * @param fightId - Fight identifier (e.g., "IFC-S1-D1-R1-F1")
 * @param competitionId - MongoDB ObjectId of the competition
 * @param allFightsInDivision - All fights in the season/division
 * @param divisionFighters - Array of all fighter IDs in this division
 * @param fightersData - Map of fighter ID to fighter data (for names)
 * @param previousStandings - Optional: previous standings to build upon
 * @returns Complete round standings object ready for database
 */
export async function calculateRoundStandings(
  winnerId: string,
  loserId: string,
  fightId: string,
  competitionId: string,
  allFightsInDivision: Fight[],
  divisionFighters: string[],
  fightersData: Map<string, FighterData>,
  previousStandings?: FighterStanding[]
): Promise<RoundStandings> {
  
  const parsedFightId = parseFightIdentifier(fightId);
  
  // Initialize or copy previous standings
  let standingsMap = new Map<string, FighterStanding>();
  
  if (previousStandings && previousStandings.length > 0) {
    // Build from previous standings
    previousStandings.forEach(standing => {
      standingsMap.set(standing.fighterId, { ...standing });
    });
  } else {
    // Initialize fresh standings
    const initialStandings = initializeStandings(divisionFighters);
    initialStandings.forEach(standing => {
      standingsMap.set(standing.fighterId, standing);
    });
  }

  // Get all completed fights up to this point
  const completedFights = getCompletedFightsUpToPoint(allFightsInDivision, fightId);
  
  // Recalculate stats for all fighters based on completed fights
  // Reset counts first
  standingsMap.forEach(standing => {
    standing.fightsCount = 0;
    standing.wins = 0;
    standing.points = 0;
  });
  
  // Count stats from all completed fights
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
      // wins and points stay the same (0 points for loss)
    }
  });

  // Convert map to array
  let standingsArray = Array.from(standingsMap.values());
  
  // Sort with tiebreaking logic
  standingsArray = sortStandingsWithTiebreakers(
    standingsArray,
    completedFights,
    fightersData
  );

  // Get the MongoDB ObjectId of the fight (if available)
  const currentFight = allFightsInDivision.find(f => f.fightIdentifier === fightId);
  const fightMongoId = currentFight?._id || '';

  // Build and return the complete round standings object
  const roundStandings: RoundStandings = {
    competitionId,
    seasonNumber: parsedFightId.seasonNumber,
    divisionNumber: parsedFightId.divisionNumber,
    roundNumber: parsedFightId.roundNumber,
    fightId: fightMongoId,
    standings: standingsArray,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return roundStandings;
}

/**
 * Utility function to extract fighter IDs from a list of fights
 * Useful for getting all fighters in a division
 * @param fights - Array of fights
 * @returns Array of unique fighter IDs
 */
export function extractFighterIdsFromFights(fights: Fight[]): string[] {
  const fighterIds = new Set<string>();
  
  fights.forEach(fight => {
    fighterIds.add(fight.fighter1);
    fighterIds.add(fight.fighter2);
  });
  
  return Array.from(fighterIds);
}

export default {
  parseFightIdentifier,
  sortStandingsWithTiebreakers,
  getCompletedFightsUpToPoint,
  initializeStandings,
  calculateRoundStandings,
  extractFighterIdsFromFights,
};

