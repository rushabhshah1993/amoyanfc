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
import { applyFightResult } from "../services/fight-result.service.js";

/* Utility imports */
import { catchAsyncErrors } from "../utils.js";

/* Error imports */
import { NotFoundError, ValidationError } from "../error.js";

/**
 * Helper function to validate fight exists
 */
function validateFight(competition, divisionNumber, roundNumber, fightIndex) {
    let fight = null;

    if (competition.competitionMeta.type === 'league') {
        const division = competition.leagueData.divisions.find(d => d.divisionNumber === divisionNumber);
        if (!division) {
            throw new NotFoundError(`Division ${divisionNumber} not found`);
        }

        const round = division.rounds.find(r => r.roundNumber === roundNumber);
        if (!round) {
            throw new NotFoundError(`Round ${roundNumber} not found in division ${divisionNumber}`);
        }

        fight = round.fights[fightIndex];
        if (!fight) {
            throw new NotFoundError(`Fight at index ${fightIndex} not found`);
        }
    } else if (competition.competitionMeta.type === 'cup') {
        // For cup competitions, fights are stored in a flat array
        if (!competition.cupData || !competition.cupData.fights) {
            throw new NotFoundError('Cup data not found for this competition');
        }

        fight = competition.cupData.fights[fightIndex];
        if (!fight) {
            throw new NotFoundError(`Fight at index ${fightIndex} not found in cup competition`);
        }
    } else {
        throw new ValidationError(`Unsupported competition type: ${competition.competitionMeta.type}`);
    }

    return fight;
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
                .populate('competitionMetaId');

            if (!competition) {
                throw new NotFoundError('Competition not found');
            }

            // Validate fight exists
            const fight = validateFight(
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

            // Apply complete fight result (all 8 steps + transaction)
            const result = await applyFightResult(
                competitionId,
                seasonNumber,
                divisionNumber,
                roundNumber,
                fightIndex,
                fighter1Id,
                fighter2Id,
                generatedResult,
                true, // isSimulated
                null, // userDescription
                fightDate || new Date()
            );

            console.log(`Fight simulated successfully. Winner: ${result.winner}`);

            // Fetch updated competition to return
            const updatedCompetition = await Competition.findById(competitionId)
                .populate('competitionMetaId');

            return {
                success: true,
                message: 'Fight simulated successfully',
                fight: validateFight(updatedCompetition, divisionNumber, roundNumber, fightIndex),
                competition: updatedCompetition
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
                .populate('competitionMetaId');

            if (!competition) {
                throw new NotFoundError('Competition not found');
            }

            // Validate fight exists
            const fight = validateFight(
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

            // Apply complete fight result (all 8 steps + transaction)
            const result = await applyFightResult(
                competitionId,
                seasonNumber,
                divisionNumber,
                roundNumber,
                fightIndex,
                fighter1Id,
                fighter2Id,
                generatedResult,
                false, // isSimulated
                userDescription,
                fightDate || new Date()
            );

            console.log('Fight generated successfully with user-selected winner');

            // Fetch updated competition to return
            const updatedCompetition = await Competition.findById(competitionId)
                .populate('competitionMetaId');

            return {
                success: true,
                message: 'Fight generated successfully',
                fight: validateFight(updatedCompetition, divisionNumber, roundNumber, fightIndex),
                competition: updatedCompetition
            };
        })
    }
};

export default fightGenerationResolver;

