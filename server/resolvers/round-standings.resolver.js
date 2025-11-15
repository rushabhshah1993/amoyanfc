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
    getRoundStandingsByRound: async (_, { competitionId, seasonNumber, divisionNumber, roundNumber }, context) => {
      try {
        console.log('\n🔍 Fetching Round Standings:');
        console.log('   - Competition ID:', competitionId);
        console.log('   - Season Number:', seasonNumber);
        console.log('   - Division Number:', divisionNumber);
        console.log('   - Round Number:', roundNumber);
        
        // Find the last fight of the round (most recently updated)
        const standings = await RoundStandings.findOne({
          competitionId,
          seasonNumber,
          divisionNumber,
          roundNumber
        })
        .sort({ updatedAt: -1 }) // Sort by timestamp to get most recent standings
        .limit(1);
        
        if (!standings) {
          console.log('   ❌ No standings found for this round');
          
          // Check if this is round 1 and no standings exist yet
          // In this case, return initial standings (all zeros)
          if (roundNumber === 1) {
            console.log('   📊 Returning initial standings (all zeros) for Round 1');
            
            // Import Competition model
            const { Competition } = await import('../models/competition.model.js');
            
            // Find competition by CompetitionMeta ID and season number
            const competition = await Competition.findOne({
              competitionMetaId: competitionId,
              'seasonMeta.seasonNumber': seasonNumber
            });
            
            if (!competition || !competition.seasonMeta?.leagueDivisions) {
              console.log('   ⚠️  Competition or league divisions not found');
              console.log('   - Searched for competitionMetaId:', competitionId);
              console.log('   - Searched for seasonNumber:', seasonNumber);
              return null;
            }
            
            // Get fighters for this division
            const divisionData = competition.seasonMeta.leagueDivisions.find(
              ld => ld.divisionNumber === divisionNumber
            );
            
            if (!divisionData || !divisionData.fighters || divisionData.fighters.length === 0) {
              console.log('   ⚠️  No fighters found for this division');
              return null;
            }
            
            // Create initial standings (all zeros)
            const initialStandings = divisionData.fighters.map(fighterId => ({
              fighterId: fighterId.toString(),
              fightsCount: 0,
              wins: 0,
              points: 0,
              rank: 1, // All tied at rank 1
              totalFightersCount: divisionData.fighters.length
            }));
            
            console.log('   ✅ Generated initial standings for', divisionData.fighters.length, 'fighters');
            
            // Return a virtual standings document
            return {
              id: 'initial',
              competitionId,
              seasonNumber,
              divisionNumber,
              roundNumber,
              fightId: 'initial',
              fightIdentifier: 'initial',
              standings: initialStandings,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }
          
          // For rounds > 1, check if previous round has standings
          if (roundNumber > 1) {
            const previousRoundStandings = await RoundStandings.findOne({
              competitionId,
              seasonNumber,
              divisionNumber,
              roundNumber: roundNumber - 1
            })
            .sort({ fightIdentifier: -1 })
            .limit(1);
            
            if (previousRoundStandings) {
              console.log('   📊 Returning previous round standings (Round', roundNumber - 1, ')');
              // Return previous round's standings
              return {
                ...previousRoundStandings.toObject(),
                roundNumber: roundNumber, // Update to current round
                fightId: 'previous-round',
                fightIdentifier: 'previous-round'
              };
            }
          }
          
          console.log('   ⚠️  No standings available');
          return null;
        }
        
        console.log('   ✅ Standings found:', standings.fightIdentifier);
        console.log('   ✅ Number of fighters:', standings.standings?.length || 0);
        
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
