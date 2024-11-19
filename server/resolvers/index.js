/* Package imports */
import { mergeResolvers } from '@graphql-tools/merge';

/* Resolver imports */
import competitionMetaResolvers from "./competition-meta.resolver.js";
import articleResolvers from './article.resolver.js';

const mergedResolvers = mergeResolvers([competitionMetaResolvers, articleResolvers]);

export default mergedResolvers;