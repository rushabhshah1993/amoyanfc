/* Package imports */
import { mergeTypeDefs } from '@graphql-tools/merge';

/* Typedef imports */
import articleTypeDef from './article.typedef.js';
import competitionMetaTypeDef from './competition-meta.typedef.js';
import competitionTypeDef from './competition.typedef.js';
import fighterTypeDef from './fighter.typedef.js';
import globalRankTypeDef from './global-rank.typeDef.js';
import roundStandingsTypeDef from './round-standings.typedef.js';

const mergedTypeDefs = mergeTypeDefs([
    articleTypeDef,
    competitionTypeDef,
    competitionMetaTypeDef,
    fighterTypeDef,
    globalRankTypeDef,
    roundStandingsTypeDef
]);

export default mergedTypeDefs;
