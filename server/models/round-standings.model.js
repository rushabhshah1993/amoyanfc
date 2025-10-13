/* Package imports */
import mongoose from 'mongoose';
import { Schema } from 'mongoose';

/**
 * Schema definition for fightersStandingSchema - an individual object defining a user and her information at every round
 * @typedef {Object} fightersStandingSchema
 * @property {ObjectId} fighterId - The unique ID representing a fighter
 * @property {Number} fightsCount - Total number of fights fought so far in a round by the fighter
 * @property {Number} wins - Total number of fights won by the fight from the total number of fights fought
 * @property {Number} points - Total number of points amassed by the fighter at that point in a round
 * @property {Number} rank - The rank held by the fighter at that point in the round
 * @property {Number} totalFightersCount - The total number of fighters in that round
 */
const fightersStandingSchema = new Schema({
    fighterId: { type: String, required: true }, // String to accept ObjectId as string
    fightsCount: { type: Number, required: true },
    wins: { type: Number, required: true },
    points: { type: Number, required: true},
    rank: { type: Number, required: true },
    totalFightersCount: { type: Number, required: true }
}, { _id: false }) // Disable _id for subdocuments

/**
 * Schema definition for roundStandings - specific for league style competitions
 * @typedef {Object} roundStandingsSchema
 * @property {ObjectId} competitionId - Defines the unique ID defining of a particular competition 
 * @property {ObjectId} seasonId - Defines the unique ID defining a season of a particular competition 
 * @property {ObjectId} divisionId - Defines the unique ID defining a division of a particular season 
 * @property {ObjectId} roundId - Defines the unique ID defining a round of a particular division 
 * @property {ObjectId} fightId - Defines the unique ID defining a fight of a particular round 
 * @property {Array.<Object>} standings - Defines a list of fighters sorted by their position for a particular round
 */
const roundStandingsSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta', required: true },
    seasonNumber: { type: Number, required: true },
    divisionNumber: { type: Number, required: true },
    roundNumber: { type: Number, required: true },
    fightId: { type: String, required: true }, // Changed to String to store fightIdentifier
    fightIdentifier: { type: String, required: true }, // Human-readable identifier
    standings: [fightersStandingSchema],
}, {timestamps: true});

/* Indexes */
roundStandingsSchema.index({ competitionId: 1, seasonNumber: 1, roundNumber: 1 });
roundStandingsSchema.index({ fightIdentifier: 1 }, { unique: true });
roundStandingsSchema.index({ "standings.fighterId": 1 });
// TTL index commented out for now - can be enabled later for real-time/cache scenarios
// roundStandingsSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 * 24 * 2 }); // 2 days

export const RoundStandings = mongoose.model('RoundStandings', roundStandingsSchema);