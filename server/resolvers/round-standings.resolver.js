/* Model imports */
import { RoundStandings } from '../models/round-standings.model.js';

/* Resolver for round standings queries */
const roundStandingsResolvers = {
  Query: {
    /**
     * Get standings for a specific fight by fight identifier
     */
    getRoundStandings: async (_, { fightIdentifier }) => {
      try {
        const standings = await RoundStandings.findOne({ fightIdentifier });
        
        if (!standings) {
          throw new Error(`Standings not found for fight: ${fightIdentifier}`);
        }
        
        return standings;
      } catch (error) {
        console.error('Error fetching round standings:', error);
        throw error;
      }
    },

    /**
     * Get standings for the last fight of a specific round
     */
    getRoundStandingsByRound: async (_, { competitionId, seasonNumber, divisionNumber, roundNumber }) => {
      try {
        // Find the last fight of the round (highest fight number)
        const standings = await RoundStandings.findOne({
          competitionId,
          seasonNumber,
          divisionNumber,
          roundNumber
        })
        .sort({ fightIdentifier: -1 }) // Sort descending to get last fight
        .limit(1);
        
        if (!standings) {
          throw new Error(`Standings not found for Round ${roundNumber}`);
        }
        
        return standings;
      } catch (error) {
        console.error('Error fetching round standings by round:', error);
        throw error;
      }
    },

    /**
     * Get final standings for a season (last fight of last round)
     */
    getFinalSeasonStandings: async (_, { competitionId, seasonNumber, divisionNumber }) => {
      try {
        const standings = await RoundStandings.findOne({
          competitionId,
          seasonNumber,
          divisionNumber
        })
        .sort({ roundNumber: -1, fightIdentifier: -1 }) // Last round, last fight
        .limit(1);
        
        if (!standings) {
          throw new Error('Final standings not found');
        }
        
        return standings;
      } catch (error) {
        console.error('Error fetching final season standings:', error);
        throw error;
      }
    },

    /**
     * Get all rounds standings for a season/division
     */
    getAllRoundsStandings: async (_, { competitionId, seasonNumber, divisionNumber }) => {
      try {
        const allStandings = await RoundStandings.find({
          competitionId,
          seasonNumber,
          divisionNumber
        })
        .sort({ roundNumber: 1, fightIdentifier: 1 });
        
        return allStandings;
      } catch (error) {
        console.error('Error fetching all rounds standings:', error);
        throw error;
      }
    }
  }
};

export default roundStandingsResolvers;
