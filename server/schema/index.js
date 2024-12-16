/* Package imports */
import { mergeTypeDefs } from '@graphql-tools/merge';

/* Schema imports */
import articleTypeDef from './article.typedef.js';
import competitionMetaTypeDef from './competition-meta.typedef.js';
import competitionTypeDef from './competition.typedef.js';
import fighterTypeDef from './fighter.typedef.js';

const mergedTypeDefs = mergeTypeDefs([
    articleTypeDef,
    competitionTypeDef,
    competitionMetaTypeDef,
    fighterTypeDef
]);

export default mergedTypeDefs;
