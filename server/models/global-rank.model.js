import { Model, Schema } from 'mongoose';

/**
 * Schema definition for the number of titles won by a fighter in a competition
 * @typedef {Object} titlesSchema
 * @property {Number} competitionId - The unique ID of a competition, referred by `CompetitionMeta`
 * @property {Number} numberOfTitles - The number of titles won by a fighter in a particular competition
 */
const titlesSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta', required: true },
    numberOfTitles: { type: Number, required: true, default: 0 }
});

/**
 * Schema definition for a fighter's appearances in a cup-style competition
 * @typedef {Object} cupAppearancesSchema
 * @property {Number} competitionId - The unique ID of a competition, referred by `CompetitionMeta`
 * @property {Number} appearances - The number of appearances for a fighter in a particular cup competition, not related to the number of fights fought, but number of seasons
 */
const cupAppearancesSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta', required: true },
    appearances: { type: Number, default: 0 }
});

/**
 * Schema definition for a fighter's appearances in a league-style competition division-wise
 * @typedef {Object} divisionAppearances
 * @property {Number} division - The division number denoting the level of eliteness of the division, (e.g. Division 1 > Division 2)
 * @property {Number} appearances - The number of appearances for a fighter in a particular division
 */
const divisionAppearances = new Schema({
    division: { type: Number },
    appearances: { type: Number, default: 0 }
});

/**
 * Schema definition for the fighter's appearances in a league-style competition
 * @typedef {Object} leagueAppearances
 * @property {ObjectId} competitionId - The unique ID of a competition, referred by `CompetitionMeta`
 * @property {Array.<Object>} divisionAppearances - A list of division-wise appearances, referred by `divisionAppearances`
 */
const leagueAppearances = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta', required: true },
    divisionAppearances: [divisionAppearances]
});

/**
 * Schema definition for a fighter in global ranking
 * @typedef {Object} fighterSchema
 * @property {ObjectId} fighterId - A unique ID assigned to every fighter
 * @property {Number} score - A cumulative score which decides the rank of a fighter
 * @property {Number} rank - The rank of a fighter
 * @property {Array.<Object>} titles - A list of competitions and the number of titles won by the fighter in that competition, referred by `titlesSchema`
 * @property {Array.<Object>} cupAppearances - A list of cup competitions and the fighter's appearances in that competition, referred by `cupAppearancesSchema`
 * @property {Array.<Object>} leagueAppearances - A list of league competitions and the number of appearances of the fighter in that competition, referred by `leagueAppearances`
 */
const fighterSchema = new Schema({
    fighterId: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
    score: { type: Number, required: true },
    rank: { type: Number, required: true },
    titles: [titlesSchema],
    cupAppearances: [cupAppearancesSchema],
    leagueAppearances: [leagueAppearances]
});

/**
 * Schema definition for global ranks updated after every season of a competition
 * @typedef {Object} globalRankSchema
 * @property {Array.<Object>} fighters - A list of fighters sorted by rank, referred by `fighterSchema`
 */
const globalRankSchema = new Schema({
    fighters: [fighterSchema]
}, {timestamps: true});

export const GlobalRank = new Model('GlobalRank', globalRankSchema);