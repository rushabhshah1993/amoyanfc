/* Package imports */
import { CompetitionMeta } from "../models/competition-meta.model.js";

const competitionMetaResolvers = {
    Query: {
        /***
         * Fetches a list of all the competitions.
         * @returns {Array.<Object>} - A list of all the competitions, if found
         */
        getAllCompetitions: async () => {
            return await CompetitionMeta.find({});
        },
        /**
         * Fetches the data for a particular competition
         * 
         * @param {Object} _ - Not used in this resolver
         * @param {Object} args - The arguments for this query
         * @param {String} args.id - The unique ID for a competition
         * @returns {Object} - A competition object, if found
         */
        getCompetition: async(_, { id }) => {
            return await CompetitionMeta.findById(id);
        }
    },
    Mutation: {
        /**
         * Add a new competition to the system
         * 
         * @param {Object} _ - Not used in this mutation
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.competitionName - The name of the competition
         * @param {String} args.type - The type of the competition (league/cup)
         * @param {String} args.description - The description of the competition
         * @param {String} args.logo - The URL denoting the logo of the competition
         * @returns {Object} The newly saved competition
         */
        addCompetition: async (_, args) => {
            const newCompetition = new CompetitionMeta(...args);
            return await newCompetition.save();
        },

        /**
         * Updates an existing competition
         * @param {Object} _ - Not used in this mutation
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - The unique ID of the competition to be updated
         * @param {Object} args.input - The input object containing the fields to be updated
         * @param {String} [args.input.competitionName] - The updated name of the competition
         * @param {String} [args.input.type] - The updated type of the competition
         * @param {String} [args.input.description] - The updated description of the competition
         * @param {String} [args.input.logo] - The updated URL pointing to the logo of the competition
         * @returns {Object} The updated object of the competition
         */
        editCompetition: async (_, args) => {
            const { competitionName, type, description, logo } = args.input;
            return await CompetitionMeta.findByIdAndUpdate(
                args.id,
                { competitionName, type, description, logo },
                { new: true }
            )
        }
    }
};

export default competitionMetaResolvers;
