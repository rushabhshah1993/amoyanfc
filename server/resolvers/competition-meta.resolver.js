/* Model imports */
import { CompetitionMeta } from "../models/competition-meta.model.js";

/* Error imports */
import { NotFoundError } from "../error.js";

const competitionMetaResolver = {
    Query: {
        /***
         * Fetches a list of the meta information of all the competitions.
         * @returns {Promise<Array.<Object>>} - A list of all the competitions, if found
         */
        getAllCompetitionsMeta: async () => {
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
        getCompetitionMeta: async(_, { id }) => {
            try {
                const competition = await CompetitionMeta.findById(id);
                if(!competition) {
                    throw new NotFoundError("Competition information not found");
                }
                return competition;
            }
            catch(error) {
                console.error("Error fetching competition:", error);
                throw new Error("Error fetching competition information");
            }
        }
    },
    Mutation: {
        /**
         * Add a new competition to the system
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.input - Data required to create a new competition
         * @returns {Array.<Object>} The newly saved competition
         */
        addCompetition: async (_, { input }) => {
            try {
                const newCompetition = new CompetitionMeta(input);
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
         * @returns {Array.<Object>} The updated object of the competition
         */
        editCompetition: async (_, { id, input }) => {
            try {
                const updatedCompetition = await CompetitionMeta.findByIdAndUpdate(
                    id,
                    input,
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

export default competitionMetaResolver;
