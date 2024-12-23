/* Package imports */
import { mergeResolvers } from '@graphql-tools/merge';

/* Resolver imports */
import articleResolver from './article.resolver.js';
import competitionResolver from './competition.resolver.js';
import competitionMetaResolver from "./competition-meta.resolver.js";
import globalRankResolver from './global-rank.resolver.js';
import fighterResolver from './fighter.resolver.js';

const mergedResolvers = mergeResolvers([
    articleResolver,
    competitionResolver,
    competitionMetaResolver,
    fighterResolver,
    globalRankResolver
]);

export default mergedResolvers;