/* Package imports */
import { mergeTypeDefs } from '@graphql-tools/merge';

/* Schema imports */
import competitionMetaSchema from './competition-meta.typedef.js';
import articleSchema from './article.typedef.js';

const mergedTypeDefs = mergeTypeDefs([
    competitionMetaSchema,
    articleSchema
]);

export default mergedTypeDefs;
