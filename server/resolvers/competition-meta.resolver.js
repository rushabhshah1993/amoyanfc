/* Package imports */
import { CompetitionMeta } from "../models/competition-meta.model.js";

/* Error imports */
import { NotFoundError } from "../error.js";

const competitionMetaResolvers = {
    Query: {
        /***
         * Fetches a list of all the competitions.
         * @returns {Promise<Array.<Object>>} - A list of all the competitions, if found
         */
        getAllCompetitions: async () => {
            try {
                const competitions = await CompetitionMeta.find({});
                if(!competitions.length) {
                    throw new NotFoundError("Competitions not found");
                }
                return competitions;
            }
            catch(error) {
                console.error("Unexpected error:", error);
                throw new Error("Internal server error");
            }
        },
        /**
         * Fetches the data for a particular competition
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - The arguments for this query
         * @param {String} args.id - The unique ID for a competition
         * @returns {Promise<Object>} - A competition object, if found
         */
        getCompetition: async(_, { id }) => {
            try {
                const competition = await CompetitionMeta.findById(id);
                if(!competition) {
                    throw new NotFoundError("Article not found");
                }
                return competition;
            }
            catch(error) {
                console.error("Error fetching competition:", error);
                throw new Error("Error fetching competition");
            }
        }
    },
    Mutation: {
        /**
         * Add a new competition to the system
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.competitionName - The name of the competition
         * @param {String} args.type - The type of the competition (league/cup)
         * @param {String} args.description - The description of the competition
         * @param {String} args.logo - The URL denoting the logo of the competition
         * @returns {Array.<Object>} The newly saved competition
         */
        addCompetition: async (_, args) => {
            try {
                const newCompetition = new CompetitionMeta(...args);
                return await newCompetition.save();
            }
            catch(error) {
                console.error("Error in creating the competition:", error);
                throw new Error("Error in creating the competition");
            }
        },

        /**
         * Updates an existing competition
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - The unique ID of the competition to be updated
         * @param {Object} args.input - The input object containing the fields to be updated
         * @param {String} [args.input.competitionName] - The updated name of the competition
         * @param {String} [args.input.type] - The updated type of the competition
         * @param {String} [args.input.description] - The updated description of the competition
         * @param {String} [args.input.logo] - The updated URL pointing to the logo of the competition
         * @returns {Array.<Object>} The updated object of the competition
         */
        editCompetition: async (_, args) => {
            try {
                const { competitionName, type, description, logo } = args.input;
                const updatedCompetition = await CompetitionMeta.findByIdAndUpdate(
                    args.id,
                    { competitionName, type, description, logo },
                    { new: true }
                )
                if(!updatedCompetition) {
                    throw new NotFoundError("Competition not found");
                }
                return updatedCompetition;
            }
            catch(error) {
                console.error("Error in updating the competition:", error);
                throw new Error("Error in updating the competition");
            }
        }
    }
};

export default competitionMetaResolvers;
