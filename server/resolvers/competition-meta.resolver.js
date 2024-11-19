/* Package imports */
import { CompetitionMeta } from "../models/competition-meta.model.js";

const competitionMetaResolvers = {
    Query: {
        getAllCompetitions: async () => {
            return await CompetitionMeta.find({});
        },
        getCompetition: async(_, { id }) => {
            return await CompetitionMeta.findById(id);
        }
    },
    Mutation: {
        addCompetition: async (_, args) => {
            const newCompetition = new CompetitionMeta(...args);
            return await newCompetition.save();
        },
        editCompetition: async (_, args) => {
            const { competitionName, type, description, logo } = args;
            return await CompetitionMeta.findByIdAndUpdate(
                args.id,
                { competitionName, type, description, logo },
                { new: true }
            )
        }
    }
};

export default competitionMetaResolvers;
