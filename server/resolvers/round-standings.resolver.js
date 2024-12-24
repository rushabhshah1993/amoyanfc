/* Utility imports */
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';
import { RoundStandings } from './../models/round-standings.model.js';

const roundStandingsResolver = {
    Query: {
        /**
         * Fetch a particular standings by its unique ID
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this query
         * @param {String} args.id - Unique ID for a round standings entry
         * @returns {Promise<Object>} - An object with the standings information
         */
        getRoundStandingsById: async(_, { id }) => {
            const standingsById = await RoundStandings.findById(id);
            if(!standingsById) throw new Error("Standings not found");
            return standingsById;
        },

        /**
         * Fetch a particular standings by the arguments provided (season, division, round, fightID)
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this query
         * @returns {Promise<Object>} - An object with the standings information
         */
        getRoundStandingsByArgs: async(_, args) => {
            const standingsByArgs = await RoundStandings.find(args);
            if(!standingsByArgs) throw new Error("Standings not found");
            return standingsByArgs;
        }
    },
    Mutation: {
        /**
         * Add new round standings
         * @param {Object} _ - Unused parent resolver
         * @param {Object} input - Arguments provided to this mutation
         * @returns {Promise<Object>} - An object with the standings information
         */
        addNewRoundStandings: async(_, input) => {
            const newStandings = new RoundStandings(...input);
            return await newStandings.save();
        },

         /**
         * Add new round standings
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this mutation
         * @param {String} args.id - Unique ID representing a round's standings
         * @param {Object} args.input - Updated data to modify this information
         * @returns {Promise<Object>} - An object with the standings information
         */
        updateRoundStandings: async(_, { id, input }) => {
            const updatedStandings = RoundStandings.findByIdAndUpdate(
                id,
                {...input},
                {new: true}
            );
            if(!updatedStandings) throw new Error("Standings not found");
            return updatedStandings;
        },

        /**
         * Deletes an object of round's standings
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args- Arguments provided to this mutation
         * @param {String} args.id - Unique ID representing a round's standings
         * @returns {String} - Message denoting if the given data is deleted successfully
         */
        deleteRoundStandings: async(_, { id }) => {
            const deletedStandings = await RoundStandings.findByIdAndDelete(id);
            return "Successfully deleted standings";
        }
    },
    RoundStandings: {
        competitionMeta: async(parent) => {
            const competitionMetaInformation = await CompetitionMeta.findById(parent.competitionId);
            return competitionMetaInformation;
        },
        competition: async(parent) => {
            const competitionInformation = await Competition.findById(parent.competitionId);
            return competitionInformation;
        },
        fight: async(parent) => {
            if(!parent.seasonNumber && !parent.divisionNumber && !parent.roundNumber && !parent.fightId) {
                throw new Error("Essential information missing for fetching fight information");
            }
            const fightInfo = await Competition.aggregate([
                { $unwind: '$leagueData.divisions' },
                { $unwind: '$leagueData.divisions.rounds' },
                { $unwind: '$leagueData.divisions.rounds.fights' },
                { $match: {'$leagueData.divisions.rounds.fights._id': parent.fightId }},
                { $project: { 'leagueData.divisions.rounds.fights': 1 } }
            ])

            return fightInfo;
        }
    }
};

export default roundStandingsResolver;
