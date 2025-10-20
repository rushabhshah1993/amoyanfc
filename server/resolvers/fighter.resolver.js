/* Package imports */
import { GraphQLDateTime } from 'graphql-scalars';

/* Error imports */
import { NotFoundError } from "../error.js";
import { CompetitionMeta } from "../models/competition-meta.model.js";
import { Competition } from "../models/competition.model.js";

/* Model imports */
import { Fighter } from "../models/fighter.model.js";
import { GlobalRank } from "../models/global-rank.model.js";

/* Utility imports */
import { catchAsyncErrors } from "../utils.js";

const fighterResolver = {
    Date: GraphQLDateTime,
    
    Query: {
        /**
         * Fetches a list of all the fighters.
         * @returns {Promise<Array.<Object>>} - A list (array of objects) where every individual object is a fighter
         */
        getAllFighters: catchAsyncErrors(async() => {
            const allFighters = await Fighter.find({});
            if(!allFighters) throw new NotFoundError("Fighters not available");
            return allFighters;
        }),

        /**
         * Fetches a list of all active non-deleted fighters.
         * @returns {Promise<Array.<Object>>} - A list (array of objects) of all the fighters where isDeleted property is false
         */
        getActiveFighters: catchAsyncErrors(async() => {
            const activeFighters = await Fighter.find({isArchived: false});
            if(!activeFighters) throw new NotFoundError("No active fighters found");
            return activeFighters;
        }),

        /**
         * Fetches an individual fighter's information
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to the query
         * @param {String} args.id - Unique ID identifying a fighter 
         * @returns {Promise<Object>} - An object containing fighter's details
         */
        getFighterInformation: catchAsyncErrors(async(_, { id }) => {
            const fighter = await Fighter.findById(id);
            if(!fighter) throw new NotFoundError("Fighter not found");
            return fighter;
        }),

        /**
         * Fetches a list of fighters filtered by the arguments provided by the user.
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to the query
         * @returns {Promise<Array.<Object>>} - An array of objects where individual object is a fighter.
         */
        filterFighters: catchAsyncErrors(async(_, args) => {
            const filteredFighters = await Fighter.find(args);
            if(!filteredFighters.length) throw new NotFoundError("Fighters not found");
            return filteredFighters;
        }),

        /**
         * Fetches all fighters with computed basic stats (optimized for sorting/listing)
         * Returns pre-computed aggregated stats without expensive enrichment
         * @returns {Promise<Array.<Object>>} - Array of fighters with basic stats
         */
        getAllFightersWithBasicStats: catchAsyncErrors(async() => {
            const allFighters = await Fighter.find({}).lean();
            if(!allFighters) throw new NotFoundError("Fighters not available");
            
            // Compute stats for each fighter from raw data
            return allFighters.map(fighter => {
                // Calculate total fights, wins, losses across all competitions
                const totalFights = fighter.competitionHistory?.reduce((sum, comp) => sum + (comp.totalFights || 0), 0) || 0;
                const totalWins = fighter.competitionHistory?.reduce((sum, comp) => sum + (comp.totalWins || 0), 0) || 0;
                const totalLosses = fighter.competitionHistory?.reduce((sum, comp) => sum + (comp.totalLosses || 0), 0) || 0;
                const winPercentage = totalFights > 0 ? (totalWins / totalFights) * 100 : 0;
                
                // Calculate total seasons across all competitions
                const totalSeasons = fighter.competitionHistory?.reduce((sum, comp) => sum + (comp.numberOfSeasonAppearances || 0), 0) || 0;
                
                // Count total unique opponents
                const totalOpponents = fighter.opponentsHistory?.length || 0;
                
                // Calculate total titles
                const totalTitles = fighter.competitionHistory?.reduce((sum, comp) => 
                    sum + (comp.titles?.totalTitles || 0), 0) || 0;
                
                // Find highest win streak
                const winStreaks = fighter.streaks?.filter(s => s.type === 'win') || [];
                const highestWinStreak = winStreaks.length > 0 ? Math.max(...winStreaks.map(s => s.count || 0)) : 0;
                
                // Find highest lose streak
                const loseStreaks = fighter.streaks?.filter(s => s.type === 'lose') || [];
                const highestLoseStreak = loseStreaks.length > 0 ? Math.max(...loseStreaks.map(s => s.count || 0)) : 0;
                
                return {
                    id: fighter._id.toString(),
                    firstName: fighter.firstName,
                    lastName: fighter.lastName,
                    dateOfBirth: fighter.dateOfBirth,
                    profileImage: fighter.profileImage,
                    location: fighter.location,
                    physicalAttributes: fighter.physicalAttributes,
                    totalFights,
                    totalWins,
                    totalLosses,
                    winPercentage,
                    totalSeasons,
                    totalOpponents,
                    totalTitles,
                    highestWinStreak,
                    highestLoseStreak,
                    competitionHistory: fighter.competitionHistory || []
                };
            });
        })
    },
    Mutation: {
        /**
         * Adds a new fighter to the system
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this mutation
         * @returns {Promise<Object>} The fighter object saved to the DB
         */
        addNewFighter: catchAsyncErrors(async(_, { input }) => {
            const newFighter = new Fighter(input);
            return await newFighter.save();
        }),

        /**
         * Edits a fighter's information
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this mutation
         * @param {String} args.id - An ID identifying the fighter 
         * @param {Object} args.input - Input data to modify a fighter's information
         * @returns {Promise.<Object>} - The updated object of the fighter
         */
        editFighter: catchAsyncErrors(async(_, { id, input }) => {
            const updatedFighter = await Fighter.findByIdAndUpdate(
                id,
                {...input},
                {new: true}
            );
            if(!updatedFighter) throw new NotFoundError("Fighter not found");
            return updatedFighter;
        }),

        /**
         * Archives a fighter
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this mutation
         * @param {String} args.id - A unique ID identifying the fighter
         * @returns 
         */
        archiveFighter: catchAsyncErrors(async(_, { id }) => {
            const archiveFighter = await Fighter.findByIdAndUpdate(
                id,
                {isArchived: true}
            );
            if(!archiveFighter) throw new NotFoundError("Fighter not found");
            return "Successfully archived fighter's information";
        })
    },
    Fighter: {
        competitionHistory: async(parent) => {
            if (!parent.competitionHistory || parent.competitionHistory.length === 0) {
                return [];
            }

            const enrichedHistory = await Promise.all(
                parent.competitionHistory.map(async (record) => {
                    const competitionMetaInfo = await CompetitionMeta.findById(record.competitionId);
                    
                    console.log('CompetitionMeta for ID', record.competitionId, ':', competitionMetaInfo);
                    console.log('Has id field?', competitionMetaInfo?.id);
                    console.log('Has _id field?', competitionMetaInfo?._id);

                    let enrichedTitlesInfo = null;
                    if(record.titles && record.titles.details && record.titles.details.length > 0) {
                        enrichedTitlesInfo = {
                            totalTitles: record.titles.totalTitles || 0,
                            details: await Promise.all(
                                record.titles.details.map(async title => {
                                    const competition = await Competition.findById(title.competitionSeasonId);
            
                                    return {
                                        competitionSeasonId: title.competitionSeasonId,
                                        seasonNumber: title.seasonNumber,
                                        divisionNumber: title.divisionNumber,
                                        competition
                                    }
                                })
                            )
                        }
                    }
                    return {
                        record,
                        competitionMetaInfo,
                        enrichedTitlesInfo
                    }
                })   
            );
            
            // Filter out entries where competitionMeta is null and explicitly construct return objects
            const validHistory = enrichedHistory
                .filter(item => {
                    if (!item.competitionMetaInfo) {
                        console.log('Filtering out entry - no competitionMetaInfo');
                        return false;
                    }
                    // Check if the competitionMeta has required fields
                    if (!item.competitionMetaInfo.id && !item.competitionMetaInfo._id) {
                        console.log('Filtering out entry - no id field:', item.competitionMetaInfo);
                        return false;
                    }
                    return true;
                })
                .map(item => {
                    // Ensure id field exists (mongoose virtual getter)
                    const meta = item.competitionMetaInfo;
                    const metaWithId = {
                        ...meta.toObject?.() || meta,
                        id: meta.id || meta._id?.toString() || meta._id
                    };
                    
                    // Handle titles - use enriched if available, otherwise use record.titles with plain conversion
                    let titlesData = { totalTitles: 0, details: [] };
                    if (item.enrichedTitlesInfo) {
                        titlesData = item.enrichedTitlesInfo;
                    } else if (item.record.titles) {
                        const recordTitles = item.record.titles.toObject?.() || item.record.titles;
                        titlesData = {
                            totalTitles: recordTitles.totalTitles || 0,
                            details: (recordTitles.details || []).map(d => ({
                                competitionSeasonId: d.competitionSeasonId,
                                seasonNumber: d.seasonNumber,
                                divisionNumber: d.divisionNumber,
                                competition: null
                            }))
                        };
                    }
                    
                    console.log('Titles data for competition', item.record.competitionId, ':', titlesData);
                    
                    // Handle seasonDetails - convert to plain object if needed
                    let seasonDetailsData = [];
                    if (item.record.seasonDetails && item.record.seasonDetails.length > 0) {
                        seasonDetailsData = item.record.seasonDetails.map(sd => {
                            const plainSd = sd.toObject?.() || sd;
                            return {
                                seasonNumber: plainSd.seasonNumber,
                                divisionNumber: plainSd.divisionNumber,
                                fights: plainSd.fights || 0,
                                wins: plainSd.wins || 0,
                                losses: plainSd.losses || 0,
                                points: plainSd.points || 0,
                                winPercentage: plainSd.winPercentage || 0,
                                finalPosition: plainSd.finalPosition,
                                finalCupPosition: plainSd.finalCupPosition
                            };
                        });
                    }
                    
                    return {
                        competitionId: item.record.competitionId,
                        numberOfSeasonAppearances: item.record.numberOfSeasonAppearances || 0,
                        totalFights: item.record.totalFights || 0,
                        totalWins: item.record.totalWins || 0,
                        totalLosses: item.record.totalLosses || 0,
                        winPercentage: item.record.winPercentage || 0,
                        competitionMeta: metaWithId,
                        titles: titlesData,
                        seasonDetails: seasonDetailsData
                    };
                });

            console.log('Returning', validHistory.length, 'valid competition history entries');
            return validHistory;
        },
        opponentsHistory: async(parent) => {
            // Return empty array if no opponents history exists
            if (!parent.opponentsHistory || parent.opponentsHistory.length === 0) {
                return [];
            }

            // Filter out any entries with null/undefined opponentId
            const validOpponents = parent.opponentsHistory.filter(opponent => 
                opponent && opponent.opponentId
            );

            // Iterate over opponentsHistory to add detailed competition and fight data
            const enrichedOpponentsHistory = await Promise.all(
                validOpponents.map(async (opponent) => {
                    // Filter out invalid detail entries (null competitionId or fightId)
                    const validDetails = (opponent.details || []).filter(detail => 
                        detail && detail.competitionId && detail.fightId
                    );

                    // Map over details array for each opponent
                    const enrichedDetails = await Promise.all(
                        validDetails.map(async(detail) => {
                            // Fetch competition details by ID from the Competition model
                            const competition = await Competition.findById(detail.competitionId);

                            // Aggregate data to fetch specific fight details
                            const fight = await Competition.aggregate([
                                { $unwind: '$leagueData.divisions' },
                                { $unwind: '$leagueData.divisions.rounds' },
                                { $unwind: '$leagueData.divisions.rounds.fights' },
                                { $match: { 'leagueData.divisions.rounds.fights._id': detail.fightId } },
                                { $project: { 'leagueData.divisions.rounds.fights': 1 } },
                            ]);

                            // Return enriched detail with competition and fight data
                            return {
                                competitionId: detail.competitionId,
                                season: detail.season,
                                division: detail.divisionId,
                                round: detail.roundId,
                                fightId: detail.fightId,
                                isWinner: detail.isWinner,
                                competition,
                                fight: fight[0]?.leagueData?.divisions?.rounds?.fights
                            }
                        })
                    );

                    // Return the opponent with enriched details
                    return {
                        opponentId: opponent.opponentId,
                        totalFights: opponent.totalFights || 0,
                        totalWins: opponent.totalWins || 0,
                        totalLosses: opponent.totalLosses || 0,
                        winPercentage: opponent.winPercentage || 0,
                        details: enrichedDetails,
                    };
                })
            );
            return enrichedOpponentsHistory;
        },
        streaks: async(parent) => {
            if (!parent.streaks || parent.streaks.length === 0) {
                return [];
            }

            const enrichedStreaks = await Promise.all(
                parent.streaks.map(async (streak) => {
                    const competitionMeta = await CompetitionMeta.findById(streak.competitionId);
                    
                    // Populate opponents
                    const opponents = await Promise.all(
                        (streak.opponents || []).map(async (opponentId) => {
                            if (!opponentId) return null;
                            const opponent = await Fighter.findById(opponentId);
                            return opponent ? {
                                id: opponent.id || opponent._id?.toString(),
                                firstName: opponent.firstName,
                                lastName: opponent.lastName,
                                profileImage: opponent.profileImage
                            } : null;
                        })
                    );

                    return {
                        competitionId: streak.competitionId,
                        type: streak.type,
                        start: streak.start,
                        end: streak.end,
                        count: streak.count,
                        active: streak.active,
                        opponents: opponents.filter(opponent => opponent !== null),
                        competitionMeta: competitionMeta ? {
                            id: competitionMeta.id || competitionMeta._id?.toString(),
                            competitionName: competitionMeta.competitionName,
                            logo: competitionMeta.logo
                        } : null
                    };
                })
            );

            // Filter out streaks with null competitionMeta
            return enrichedStreaks.filter(streak => streak.competitionMeta !== null);
        },
        debutInformation: async(parent) => {
            if (!parent.debutInformation || !parent.debutInformation.competitionId) {
                return null;
            }

            const competitionMeta = await CompetitionMeta.findById(parent.debutInformation.competitionId);
            
            return {
                competitionId: parent.debutInformation.competitionId,
                season: parent.debutInformation.season,
                fightId: parent.debutInformation.fightId,
                dateOfDebut: parent.debutInformation.dateOfDebut || null,
                competitionMeta: competitionMeta ? {
                    id: competitionMeta.id || competitionMeta._id?.toString(),
                    competitionName: competitionMeta.competitionName,
                    logo: competitionMeta.logo
                } : null
            };
        },
        globalRank: async(parent) => {
            const currentGlobalRankList = await GlobalRank.find({isCurrent: true});
            const fighterRank = currentGlobalRankList?.fighters.find(fighter => fighter.fighterId !== parent.id);
            return fighterRank;
        }
    }
};

export default fighterResolver;
