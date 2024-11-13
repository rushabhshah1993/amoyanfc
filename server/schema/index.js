/* Package imports */
import { mergeTypeDefs } from '@graphql-tools/merge';

/* Schema imports */
import { competitionMetaSchema } from './competition-meta.schema.js';

export const typeDefs = mergeTypeDefs([
    competitionMetaSchema
])
