/* Package imports */
import { mergeResolvers } from '@graphql-tools/merge';

/* Resolver imports */
import { authResolvers } from './auth.resolver.js';
import articleResolver from './article.resolver.js';
import competitionResolver from './competition.resolver.js';
import competitionMetaResolver from "./competition-meta.resolver.js";
import globalRankResolver from './global-rank.resolver.js';
import fighterResolver from './fighter.resolver.js';
import roundStandingsResolver from './round-standings.resolver.js';

const mergedResolvers = mergeResolvers([
    authResolvers,
    articleResolver,
    competitionResolver,
    competitionMetaResolver,
    fighterResolver,
    globalRankResolver,
    roundStandingsResolver
]);

export default mergedResolvers;