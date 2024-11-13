/* Resolver imports */
import { competitionMetaResolvers } from "./competition-meta.resolver.js";

export const resolvers = {
    Query: {
        getCompetition: competitionMetaResolvers.Query.getCompetition,
        getAllCompetitions: competitionMetaResolvers.Query.getAllCompetitions
    },
    Mutation: {
        addCompetition: competitionMetaResolvers.Mutation.addCompetition,
        editCompetition: competitionMetaResolvers.Mutation.editCompetition
    }
}
