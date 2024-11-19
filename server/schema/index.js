/* Package imports */
import { mergeTypeDefs } from '@graphql-tools/merge';

/* Schema imports */
import competitionMetaSchema from './competition-meta.schema.js';
import articleSchema from './article.schema.js';

const mergedTypeDefs = mergeTypeDefs([
    competitionMetaSchema,
    articleSchema
]);

export default mergedTypeDefs;
