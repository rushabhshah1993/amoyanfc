/* Package imports */
import { GraphQLDateTime } from 'graphql-scalars';
import mongoose from 'mongoose';

/* Model imports */
import { Competition } from './../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Fighter } from '../models/fighter.model.js';

/* Error imports */
import { NotFoundError } from '../error.js';

/* Utility imports */
import { catchAsyncErrors } from '../utils.js';

/* Service imports */
import { autoTriggerGlobalRankingIfNeeded } from './global-ranking-trigger.resolver.js';

const competitionResolver = {
    Date: GraphQLDateTime,
    
    // Field resolvers for Fight type to handle fighter1, fighter2, winner
    // These automatically populate Fighter objects when queried
    Fight: {
        fighter1: async (parent) => {
            // If already populated as an object, return it
            if (parent.fighter1 && typeof parent.fighter1 === 'object' && parent.fighter1.firstName) {
                return parent.fighter1;
            }
            // If it's an ID, fetch the fighter
            if (parent.fighter1) {
                return await Fighter.findById(parent.fighter1);
            }
            return null;
        },
        fighter2: async (parent) => {
            // If already populated as an object, return it
            if (parent.fighter2 && typeof parent.fighter2 === 'object' && parent.fighter2.firstName) {
                return parent.fighter2;
            }
            // If it's an ID, fetch the fighter
            if (parent.fighter2) {
                return await Fighter.findById(parent.fighter2);
            }
            return null;
        },
        winner: async (parent) => {
            // If already populated as an object, return it
            if (parent.winner && typeof parent.winner === 'object' && parent.winner.firstName) {
                return parent.winner;
            }
            // If it's an ID, fetch the fighter
            if (parent.winner) {
                return await Fighter.findById(parent.winner);
            }
            return null;
        }
    },
    
    Query: {
        /**
         * Fetches a list of all the competitions.
         * @returns {Promise<Array.<Object>>} - A list of all the seasons of all competitions.
         */
        getAllCompetitions: catchAsyncErrors(async() => {
            const allCompetitions = await Competition.find({});
            if(!allCompetitions.length) {
                throw new NotFoundError("Competitions not found");
            }
            return allCompetitions;
        }),
        /**
         * Fetches the data for a particular competition
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - The arguments for this query
         * @param {String} args.id - The unique ID of a competition
         * @returns {Promise<Object>} - A competition object, if found
         */
        getCompetitionSeason: catchAsyncErrors(async(_, { id }) => {
            const competition = await Competition.findById(id);
            if(!competition) {
                throw new NotFoundError("Competition not found");
            }
            return competition;
        }),
        /**
         * Fetches a list of competitions belonging to a particular category (e.g. IFC, IFL, IC, CC, Brawl)
         * 
         * @param {Object} _ - Unused parent resolver 
         * @param {Object} args - Arguments for this query
         * @param {String} args.competitionMetaId - The unique ID for a particular competition category referenced with CompetitionMeta model
         * @returns {Promise<Array.<Object>>} - A list of competition seasons belonging to a specific competition category
         */
        getAllSeasonsByCompetitionCategory: catchAsyncErrors(async(_, { competitionMetaId }) => {
            const competitionType = await CompetitionMeta.findById(competitionMetaId);
            const competitionName = competitionType.competitionName;
            const competitions = await Competition.find({ competitionMetaId: competitionMetaId });
            if(!competitions.length) {
                throw new NotFoundError(`Competition with the type ${competitionName} not found`);
            }
            return competitions;    
        }),
        /**
         * Fetch a list of competitions based on the arguments provided by the query
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this query
         * @param {Object} args.filter - Filter criteria for competitions
         * @returns {Promise<Array.<Object>>} - A list of competition seasons based on the arguments provided by the query
         */
        filterCompetitions: catchAsyncErrors(async(_, { filter }) => {
            const competitions = await Competition.find(filter || {});
            if(!competitions.length) {
                throw new NotFoundError(`Competition(s) not found`);
            }
            return competitions;
        }),
        /**
         * Fetches a specific fight by its MongoDB ID
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this query
         * @param {String} args.id - The MongoDB ObjectId of the fight
         * @returns {Promise<Object>} - A fight object with complete details
         */
        getFightById: catchAsyncErrors(async(_, { id }) => {
            const result = await Competition.aggregate([
                { $unwind: '$leagueData.divisions' },
                { $unwind: '$leagueData.divisions.rounds' },
                { $unwind: '$leagueData.divisions.rounds.fights' },
                { $match: { 'leagueData.divisions.rounds.fights._id': new mongoose.Types.ObjectId(id) } },
                {
                    $project: {
                        fight: '$leagueData.divisions.rounds.fights',
                        competitionId: '$_id',
                        competitionMetaId: '$competitionMetaId',
                        seasonNumber: '$seasonMeta.seasonNumber',
                        divisionNumber: '$leagueData.divisions.divisionNumber',
                        divisionName: '$leagueData.divisions.divisionName',
                        roundNumber: '$leagueData.divisions.rounds.roundNumber'
                    }
                }
            ]);

            if (!result || result.length === 0) {
                throw new NotFoundError(`Fight with ID ${id} not found`);
            }

            const fightData = result[0];
            
            // Fetch fighter details
            const [fighter1, fighter2, winner, competitionMeta] = await Promise.all([
                Fighter.findById(fightData.fight.fighter1),
                Fighter.findById(fightData.fight.fighter2),
                fightData.fight.winner ? Fighter.findById(fightData.fight.winner) : null,
                CompetitionMeta.findById(fightData.competitionMetaId)
            ]);

            return {
                id: fightData.fight._id,
                ...fightData.fight,
                fighter1,
                fighter2,
                winner,
                competitionContext: {
                    competitionId: fightData.competitionId,
                    competitionName: competitionMeta?.competitionName,
                    competitionLogo: competitionMeta?.logo,
                    seasonNumber: fightData.seasonNumber,
                    divisionNumber: fightData.divisionNumber,
                    divisionName: fightData.divisionName,
                    roundNumber: fightData.roundNumber
                }
            };
        }),
        getCupFightById: catchAsyncErrors(async(_, { id }) => {
            const result = await Competition.aggregate([
                { $unwind: '$cupData.fights' },
                { $match: { 'cupData.fights._id': new mongoose.Types.ObjectId(id) } },
                {
                    $project: {
                        fight: '$cupData.fights',
                        competitionId: '$_id',
                        competitionMetaId: '$competitionMetaId',
                        seasonNumber: '$seasonMeta.seasonNumber',
                        currentStage: '$cupData.currentStage'
                    }
                }
            ]);

            if (!result || result.length === 0) {
                throw new NotFoundError(`Cup fight with ID ${id} not found`);
            }

            const fightData = result[0];
            
            // Fetch fighter details
            const [fighter1, fighter2, winner, competitionMeta] = await Promise.all([
                Fighter.findById(fightData.fight.fighter1),
                Fighter.findById(fightData.fight.fighter2),
                fightData.fight.winner ? Fighter.findById(fightData.fight.winner) : null,
                CompetitionMeta.findById(fightData.competitionMetaId)
            ]);

            // Extract stage info from fightIdentifier (e.g., "IC-S1-SF-F1" -> "SF")
            const fightIdentifier = fightData.fight.fightIdentifier || '';
            const stageMatch = fightIdentifier.match(/-(R\d+|QF|SF|FN)/);
            const stage = stageMatch ? stageMatch[1] : fightData.currentStage;

            return {
                id: fightData.fight._id,
                ...fightData.fight,
                fighter1,
                fighter2,
                winner,
                competitionContext: {
                    competitionId: fightData.competitionId,
                    competitionName: competitionMeta?.competitionName,
                    competitionLogo: competitionMeta?.logo,
                    seasonNumber: fightData.seasonNumber,
                    divisionNumber: null, // Cup fights don't have divisions
                    divisionName: stage, // Use stage as divisionName for display
                    roundNumber: null
                }
            };
        })
    },
    Mutation: {
        /**
         * Creates a new season for a particular competition
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @returns {Promise<Object>} The updated object of the new season of a competition
         */
        createCompetitionSeason: catchAsyncErrors(async(_, { input }) => {
            const newCompetition = new Competition(input);
            return await newCompetition.save();
        }),

        /**
         * Updates an existing competition's season
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - The unique ID of the competition season to be updated
         * @param {Object} args.input - The input object containing the fields to be updated
         * @returns {Promise<Object>} The updated object of the competition season
         */
        updateCompetitionSeason: catchAsyncErrors(async(_, { id, input }) => {
            const updatedCompetitionSeason = await Competition.findByIdAndUpdate(
                id,
                input,
                { new: true }
            );
            if(!updatedCompetitionSeason) throw new NotFoundError("Competition not found");
            
            // Auto-trigger global ranking calculation if all competitions for the season are complete
            // This is non-blocking and won't affect the response
            autoTriggerGlobalRankingIfNeeded(updatedCompetitionSeason).catch(err => {
                console.error('Error in auto-trigger global ranking:', err);
            });
            
            return updatedCompetitionSeason;
        }),

        /**
         * Deletes an existing season from a competition
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - The unique ID of the competition season
         * @returns {String} An updated message to denote the deletion has been completed successfully
         */
        deleteCompetitionSeason: catchAsyncErrors(async(_, { id }) => {
            const competition = await Competition.findById(id);
            const competitionMeta = await CompetitionMeta.findById(competition.competitionMetaId);
            const deletedCompetition = await Competition.findByIdAndDelete(id);
            if(!deletedCompetition) throw new Error("Failed to find and delete the competition season");
            return `Successfully deleted season ${competition.seasonMeta.seasonNumber} of ${competitionMeta.competitionName}`;
        })
    },
    Competition: {
        competitionMeta: catchAsyncErrors(async(parent) => {
            const competitionMetaId = parent.competitionMetaId;
            const competitionMetaInformation = await CompetitionMeta.findById(competitionMetaId);
            if(!competitionMetaInformation) throw new NotFoundError('Competition information not found');
            return competitionMetaInformation;
        })
    },
    CompetitionSeasonMeta: {
        winners: catchAsyncErrors(async(parent) => {
            if (!parent.winners || parent.winners.length === 0) return [];
            const fighters = await Fighter.find({ _id: { $in: parent.winners } });
            return fighters;
        })
    },
    SeasonMetaLeagueDivision: {
        fighters: catchAsyncErrors(async(parent) => {
            if (!parent.fighters || parent.fighters.length === 0) return [];
            const fighters = await Fighter.find({ _id: { $in: parent.fighters } });
            return fighters;
        }),
        winners: catchAsyncErrors(async(parent) => {
            if (!parent.winners || parent.winners.length === 0) return [];
            const fighters = await Fighter.find({ _id: { $in: parent.winners } });
            return fighters;
        })
    },
    SeasonMetaCupParticipants: {
        fighters: catchAsyncErrors(async(parent) => {
            if (!parent.fighters || parent.fighters.length === 0) return [];
            const fighters = await Fighter.find({ _id: { $in: parent.fighters } });
            return fighters;
        })
    },
    CompetitionLinkedLeagueSeason: {
        competition: catchAsyncErrors(async(parent) => {
            // Support both 'competition' and 'competitionId' field names for backward compatibility
            const competitionId = parent.competition || parent.competitionId;
            if (!competitionId) return null;
            const competitionMeta = await CompetitionMeta.findById(competitionId);
            if (!competitionMeta) throw new NotFoundError('Linked competition not found');
            return competitionMeta;
        }),
        season: catchAsyncErrors(async(parent) => {
            // Support both 'season' and 'seasonId' field names for backward compatibility
            const seasonId = parent.season || parent.seasonId;
            if (!seasonId) return null;
            const season = await Competition.findById(seasonId);
            if (!season) throw new NotFoundError('Linked season not found');
            // Return season ID along with seasonMeta data
            return {
                id: season._id,
                seasonNumber: season.seasonMeta.seasonNumber,
                leagueDivisions: season.seasonMeta.leagueDivisions
            };
        })
    }
};

export default competitionResolver;
