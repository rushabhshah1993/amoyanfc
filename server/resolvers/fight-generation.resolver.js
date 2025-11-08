/**
 * GraphQL Resolver for AI-powered Fight Generation
 * 
 * This resolver handles mutations for generating fight results using OpenAI's ChatGPT model.
 */

/* Package imports */
import { GraphQLDateTime } from 'graphql-scalars';

/* Model imports */
import { Fighter } from "../models/fighter.model.js";
import { Competition } from "../models/competition.model.js";

/* Service imports */
import { generateFightResult } from "../services/openai-fight.service.js";

/* Utility imports */
import { catchAsyncErrors } from "../utils.js";

/* Error imports */
import { NotFoundError, ValidationError } from "../error.js";

/**
 * Helper function to find a specific fight in a competition
 */
function findFight(competition, divisionNumber, roundNumber, fightIndex) {
    let fight = null;
    let division = null;
    let round = null;

    if (competition.competitionMeta.type === 'league') {
        division = competition.leagueData.divisions.find(d => d.divisionNumber === divisionNumber);
        if (!division) {
            throw new NotFoundError(`Division ${divisionNumber} not found`);
        }

        round = division.rounds.find(r => r.roundNumber === roundNumber);
        if (!round) {
            throw new NotFoundError(`Round ${roundNumber} not found in division ${divisionNumber}`);
        }

        fight = round.fights[fightIndex];
        if (!fight) {
            throw new NotFoundError(`Fight at index ${fightIndex} not found`);
        }
    } else if (competition.competitionMeta.type === 'cup') {
        // TODO: Add cup support if needed
        throw new ValidationError('Cup competitions are not yet supported for AI fight generation');
    }

    return { fight, division, round };
}

/**
 * Updates a fight with generated results
 */
function updateFightWithResults(fight, generatedResult, isSimulated, userDescription, fightDate) {
    fight.winner = generatedResult.winnerId;
    fight.genAIDescription = generatedResult.fightDescription;
    fight.isSimulated = isSimulated;
    fight.fighterStats = generatedResult.fighterStats;
    fight.fightStatus = 'completed';
    
    if (!isSimulated && userDescription) {
        fight.userDescription = userDescription;
    }
    
    if (fightDate) {
        fight.date = fightDate;
    } else if (!fight.date) {
        fight.date = new Date();
    }
}

const fightGenerationResolver = {
    Date: GraphQLDateTime,

    Mutation: {
        /**
         * Simulates a fight where AI determines the winner
         */
        simulateFight: catchAsyncErrors(async (_, { input }) => {
            const {
                competitionId,
                seasonNumber,
                divisionNumber,
                roundNumber,
                fightIndex,
                fighter1Id,
                fighter2Id,
                fightDate
            } = input;

            // Validate that OpenAI API key is configured
            if (!process.env.OPENAI_API_KEY) {
                throw new ValidationError('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
            }

            // Fetch the competition
            const competition = await Competition.findById(competitionId)
                .populate('competitionMeta');

            if (!competition) {
                throw new NotFoundError('Competition not found');
            }

            // Find the specific fight
            const { fight, division, round } = findFight(
                competition,
                divisionNumber,
                roundNumber,
                fightIndex
            );

            // Validate fight status
            if (fight.fightStatus === 'completed') {
                throw new ValidationError('This fight has already been completed');
            }

            // Validate fighters
            if (fight.fighter1.toString() !== fighter1Id || fight.fighter2.toString() !== fighter2Id) {
                throw new ValidationError('Fighter IDs do not match the scheduled fight');
            }

            // Fetch fighter data
            const [fighter1, fighter2] = await Promise.all([
                Fighter.findById(fighter1Id),
                Fighter.findById(fighter2Id)
            ]);

            if (!fighter1 || !fighter2) {
                throw new NotFoundError('One or both fighters not found');
            }

            // Generate fight result using OpenAI
            console.log(`Generating simulated fight between ${fighter1.firstName} ${fighter1.lastName} and ${fighter2.firstName} ${fighter2.lastName}...`);
            
            const generatedResult = await generateFightResult(
                fighter1,
                fighter2,
                true, // isSimulated
                null, // winnerId (AI will determine)
                null  // userDescription
            );

            // Update the fight with generated results
            updateFightWithResults(fight, generatedResult, true, null, fightDate);

            // Save the updated competition
            await competition.save();

            console.log(`Fight simulated successfully. Winner: ${generatedResult.winnerId}`);

            return {
                success: true,
                message: 'Fight simulated successfully',
                fight: fight,
                competition: competition
            };
        }),

        /**
         * Generates a fight with user-specified winner
         */
        generateFightWithWinner: catchAsyncErrors(async (_, { input }) => {
            const {
                competitionId,
                seasonNumber,
                divisionNumber,
                roundNumber,
                fightIndex,
                fighter1Id,
                fighter2Id,
                winnerId,
                userDescription,
                fightDate
            } = input;

            // Validate that OpenAI API key is configured
            if (!process.env.OPENAI_API_KEY) {
                throw new ValidationError('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
            }

            // Validate winner is one of the fighters
            if (winnerId !== fighter1Id && winnerId !== fighter2Id) {
                throw new ValidationError('Winner must be one of the two fighters');
            }

            // Fetch the competition
            const competition = await Competition.findById(competitionId)
                .populate('competitionMeta');

            if (!competition) {
                throw new NotFoundError('Competition not found');
            }

            // Find the specific fight
            const { fight, division, round } = findFight(
                competition,
                divisionNumber,
                roundNumber,
                fightIndex
            );

            // Validate fight status
            if (fight.fightStatus === 'completed') {
                throw new ValidationError('This fight has already been completed');
            }

            // Validate fighters
            if (fight.fighter1.toString() !== fighter1Id || fight.fighter2.toString() !== fighter2Id) {
                throw new ValidationError('Fighter IDs do not match the scheduled fight');
            }

            // Fetch fighter data
            const [fighter1, fighter2] = await Promise.all([
                Fighter.findById(fighter1Id),
                Fighter.findById(fighter2Id)
            ]);

            if (!fighter1 || !fighter2) {
                throw new NotFoundError('One or both fighters not found');
            }

            // Determine winner name for logging
            const winner = winnerId === fighter1Id ? fighter1 : fighter2;
            console.log(`Generating fight with ${winner.firstName} ${winner.lastName} as winner...`);

            // Generate fight result using OpenAI
            const generatedResult = await generateFightResult(
                fighter1,
                fighter2,
                false, // isSimulated
                winnerId,
                userDescription
            );

            // Update the fight with generated results
            updateFightWithResults(fight, generatedResult, false, userDescription, fightDate);

            // Save the updated competition
            await competition.save();

            console.log('Fight generated successfully with user-selected winner');

            return {
                success: true,
                message: 'Fight generated successfully',
                fight: fight,
                competition: competition
            };
        })
    }
};

export default fightGenerationResolver;

