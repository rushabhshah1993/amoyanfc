/* Package imports */
import { mergeTypeDefs } from '@graphql-tools/merge';

/* Typedef imports */
import articleTypeDef from './article.typedef.js';
import competitionMetaTypeDef from './competition-meta.typedef.js';
import competitionTypeDef from './competition.typedef.js';
import fightTypeDef from './fight.typedef.js';
import fighterTypeDef from './fighter.typedef.js';
import globalRankTypeDef from './global-rank.typeDef.js';
import roundStandingsTypeDef from './round-standings.typedef.js';
import { authTypeDef } from './auth.typedef.js';

const mergedTypeDefs = mergeTypeDefs([
    articleTypeDef,
    competitionTypeDef,
    competitionMetaTypeDef,
    fightTypeDef,
    fighterTypeDef,
    globalRankTypeDef,
    roundStandingsTypeDef,
    authTypeDef
]);

export default mergedTypeDefs;
