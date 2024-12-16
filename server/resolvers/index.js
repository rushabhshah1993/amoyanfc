/* Package imports */
import { mergeResolvers } from '@graphql-tools/merge';

/* Resolver imports */
import articleResolvers from './article.resolver.js';
import competitionResolvers from './competition.resolver.js';
import competitionMetaResolvers from "./competition-meta.resolver.js";

const mergedResolvers = mergeResolvers([
    articleResolvers,
    competitionResolvers,
    competitionMetaResolvers
]);

export default mergedResolvers;