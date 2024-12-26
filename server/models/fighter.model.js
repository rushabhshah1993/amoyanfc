import mongoose from 'mongoose';
import { Schema } from "mongoose";

/* Statistics <--Start--> */
/**
 * Schema definition for striking positions on a body for a fighter
 * @typedef {Object} strikesMapSchema
 * @property {Object} head - Number of strikes struck or defended on head
 * @property {Object} torso - Number of strikes struck or defended on torso
 * @property {Object} leg - Number of strikes struck or defended on leg
 */
export const strikesMapSchema = new Schema({
    head: {
        absorb: { type: Number, default: 0},
        strike: { type: Number, default: 0},
    },
    torso: {
        absorb: { type: Number, default: 0},
        strike: { type: Number, default: 0},
    },
    leg: {
        absorb: { type: Number, default: 0},
        strike: { type: Number, default: 0},
    }
});

/**
 * Schema definition for grappling statistics for a fighter
 * @typedef {Object} grapplingSchema
 * @property {Number} accuracy - Accuracy in percentage of grappling
 * @property {Number} defence - Number of grapplings defended
 */
export const grapplingSchema = new Schema({
    accuracy: { type: Number, default: 0},
    defence: { type: Number, default: 0},
})

/**
 * Schema definition for significant strikes landed during a certain position
 * @typedef {Object} strikesPositionSchema
 * @property {Number} clinching - Number of strikes landed during clinching
 * @property {Number} ground - Number of strikes landed on ground
 * @property {Number} standing - Number of strikes landed while standing
 */
export const strikesPositionSchema = new Schema({
    clinching: { type: Number, default: 0},
    ground: { type: Number, default: 0},
    standing: { type: Number, default: 0},
})

/**
 * Schema definition for significant strikes of a fighter
 * @typedef {Object} significantStrikesSchema
 * @property {Number} accuracy - Accuracy in percentage of significant strikes
 * @property {Number} attempted - Number of significant strikes attempted
 * @property {Number} defence - Number of significant strikes successfully defended
 * @property {Number} landed - Number of significant strikes successfully landed 
 * @property {Number} landedPerMinute -  Number of significant strikes successfully landed per minute
 * @property {Object} positions -  An object defining the significant strikes landed during a certain position (clinching, ground, standing), refers to the `strikesPositionSchema`
 */
export const significantStrikeSchema = new Schema({
    accuracy: { type: Number, default: 0},
    attempted: { type: Number, default: 0},
    defence: { type: Number, default: 0},
    landed: { type: Number, default: 0},
    landedPerMinute: { type: Number, default: 0},
    positions: strikesPositionSchema
})

/**
 * Schema definition for submissions statistics of a fighter over all the competitions
 * @typedef {Object} submissionSchema
 * @property {Number} attemptsPer15Mins -  Number of attempts per 15 mins
 * @property {Number} average - Average number of submissions
 */
export const submissionSchema = new Schema({
    attemptsPer15Mins: { type: Number, default: 0},
    average: { type: Number, default: 0}
})

/**
 * Schema definition for takedown statistics of a fighter over all the competitions
 * @typedef {Object} takedownSchema
 * @property {Number} accuracy - Accuracy in percentage of a takedown
 * @property {Number} attempted - Number of takedowns attempted
 * @property {Number} avgTakedownsLandedPerMin - An average of takedowns landed per minute
 * @property {Number} defence - Number of takedowns successfully defended
 * @property {Number} landed - Number of a takedowns successfully landed
 */
export const takedownSchema = new Schema({
    accuracy: { type: Number, default: 0},
    attempted: { type: Number, default: 0},
    avgTakedownsLandedPerMin: { type: Number, default: 0},
    defence: { type: Number, default: 0},
    landed: { type: Number, default: 0}
})

/**
 * Schema defintion for a historic fight statistics of a fighter over all the competitions
 * @typedef {Object} fightStatsSchema
 * @property {Number} avgFightTime - The average fight time taken by the fighter in minutes
 * @property {Array.<String>} finishingMoves - A list of all the finishing moves made by the fighter
 * @property {Object} grappling - An object depicting the grappling statistics of a fighter, referring to the `grapplingSchema`.
 * @property {Object} significantStrikes - An object depicting the significant strikes statistics of a fighter, referring to the `significantStrikeSchema`.
 * @property {Object} strikeMap - An object depicting the body-wise striking statistics of a fighter, referring to the `strikesMapSchema`.
 * @property {Object} submissions - An object depicting the submissions statistics of a fighter, referring to the `submissionSchema`.
 * @property {Object} takedowns - An object depicting the takedowns statistics of a fighter, referring to the `takedownSchema`.
 */
const fightsStatsSchema = new Schema({
    avgFightTime: { type: Number, default: 0},
    finishingMoves: [String],
    grappling: grapplingSchema,
    significantStrikes: significantStrikeSchema,
    strikeMap: strikesMapSchema,
    submissions: submissionSchema,
    takedowns: takedownSchema
});
/* Statistics <--End--> */ 

/**
 * Schema definition for a fighter's fight identification against an opponent
 * @typedef {Object} leagueFightSchema
 * @property {ObjectId} season - The unique identification of a season in which the fight was fought
 * @property {ObjectId} division - The unique identification of a division in which the fight was fought
 * @property {ObjectId} round - The unique identification of a round in which the fight was fought
 */
const leagueFightSchema = new Schema({
    season: { type: Number },
    division: { type: Number },
    round: { type: Number }
})

/**
 * Schema definition for a fighter's schema - the number of consecutive fights won or lost by a fighter
 * @typedef {Object} streakSchema
 * @property {ObjectId} competitionId - The unique ID for the competition
 * @property {String} type - Defines if it is a winning or a losing streak
 * @property {Object} start - Provides the start of a streak, referring to the `leagueFightSchema`
 * @property {Object} end - Provides the end of a streak, referring to the `leagueFightSchema`
 * @property {Number} count - Number of consecutive fights won/lost in a streak
 * @property {Boolean} active - Defines whether the streak is still active
 * @property {Array.<Object>} opponent - Provides a list of fighters the fighter won/lost to in a given streak
 */
const streakSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta' },
    type: { type: String, enum: ['win', 'lose'] },
    start: leagueFightSchema,
    end: leagueFightSchema,
    count: Number,
    active: Boolean,
    opponents: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Fighter'
        }
    ]
})

/**
 * Schema definition for a competition details - specific to a fighter's history with a specific opponent
 * @typedef {Object} competitionDetailsSchema
 * @property {ObjectId} competitionId - A unique competition ID for a competition
 * @property {Number} season - A unique competition ID for a season in a competition
 * @property {Number} division - A unique competition ID for a division in a season
 * @property {Number} round - A unique competition ID for a round in a division
 * @property {Boolean} isWinner - Whether the fighter won against an opponent in this fight
 */
const competitionDetailsSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta' },
    season: { type: Number },
    divisionId: { type: Number },
    roundId: { type: Number },
    fightId: { type: Schema.Types.ObjectId, ref: 'Fight' },
    isWinner: Boolean
})

/**
 * Schema definition for the fighter's history of fights against an opponent
 * @typedef {Object} opponentHistorySchema
 * @property {ObjectID} opponentId - The unique ID of an opponent fighter
 * @property {Number} totalFights - The total number of fights fought by a fighter against an opponent
 * @property {Number} totalWins - The total number of fights won by a fighter against an opponent
 * @property {Number} totalLosses - The total number of fights lost by a fighter against an opponent
 * @property {Number} winPercentage - The win percentage of a fighter against an opponent
 * @property {Array.<Object>} details - A list of all fights between the fighter and the opponent, referring to the `competitionDetailsSchema`
 */
const opponentHistorySchema = new Schema({
    opponentId: { type: Schema.Types.ObjectId, ref: 'Fighter' },
    totalFights: Number,
    totalWins: Number,
    totalLosses: Number,
    winPercentage: Number,
    details: [competitionDetailsSchema]
})

/**
 * Schema definition for a competition record
 * @typedef {Object} competitionRecordSchema
 * @property {ObjectId} competitionId - Refers to the ID of a competition
 * @property {Number} totalFights - Refers to the total number of fights fought in a competition
 * @property {Number} totalWins - Refers to the total number of fights won in a competition
 * @property {Number} totalLosses - Refers to the total number of fights lost in a competition
 * @property {Number} winPercentage - Refers to the win percentage of the competition
 */
const competitionRecordSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta' },
    totalFights: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    winPercentage: { type: Number, default: 0 }
});

/**
 * Schema definition for fighter's location
 * @typedef {Object} locationSchema
 * @property {String} city - City in which the fighter is currently residing
 * @property {String} country - Country in which the fighter is currently residing
 */
const locationSchema = new Schema({
    city: String,
    country: String
});

/**
 * Schema definition for a competition record
 * @typedef {Object} debutInformationSchema
 * @property {ObjectId} competitionId - Refers to the ID of a competition
 * @property {Number} season - Season of the above competition in which the fighter made debut
 * @property {Number} fightId - First fight of the fighter
 * @property {Number} dateOfDebut - Date on which the fighter made debut
 */
const debutInformationSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta' },
    season: { type: Number },
    fightId: { type: Schema.Types.ObjectId, ref: 'Fight' },
    dateOfDebut: { type: Date} 
})

/**
 * Schema definition for fighter schema - a complete information on a fighter
 * @typedef {Object} fighterSchema
 * @property {String} firstName - The first name of a fighter
 * @property {String} lastName - The last name of a fighter
 * @property {String} dateOfBirth - The date of a birth of a fighter
 * @property {String} profileImage - The URL link pointing to a fighter's profile image
 * @property {Array.<String>} skillset - A list of martial arts skills the fighter possesses
 * @property {ObjectId} globalRank - The global rank of a fighter referring to a `GlobalRank` model
 * @property {Object} fightStats - Provides an object showing the various fight statistics of a fighter referring the `fightsStatsSchema`
 * @property {Array.<Object>} streaks - Provides a list of objects showing a fighter's streak across an individual competition, referring the `streakSchema`
 * @property {Array.<Object>} opponentsHistory - Provides a list of objects showing a fighter's performance against every opponent, referring the `opponentHistorySchema`
 * @property {Array.<Object>} competitionHistory - Provides a list of objects showcasing fighter's performance in every competition, referring to the `competitionRecordSchema`
 */
export const fighterSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true},
    dateOfBirth: { type: Date },
    profileImage: String,
    skillset: [String],
    globalRank: { type: Schema.Types.Object, ref: 'GlobalRank', index: true },
    fightStats: fightsStatsSchema,
    streaks: [streakSchema],
    opponentsHistory: [opponentHistorySchema],
    competitionHistory: [competitionRecordSchema],
    isArchived: Boolean,
    location: locationSchema,
    debutInformation: debutInformationSchema,
    images: [String]
});

/* Indexes */
fighterSchema.index({ firstName: 1, lastName: 1 });
fighterSchema.index({ globalRank: 1 });

export const Fighter =  mongoose.model('Fighter', fighterSchema);