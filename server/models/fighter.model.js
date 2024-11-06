import { Schema, Model } from "mongoose";

/* Statistics <--Start--> */
export const strikesMapSchema = new Schema({
    head: {
        absorb: Number,
        strike: Number
    },
    torso: {
        absorb: Number,
        strike: Number
    },
    leg: {
        absorb: Number,
        strike: Number
    }
});

export const grapplingSchema = new Schema({
    accuracy: Number,
    defence: Number
})

export const strikesPositionSchema = new Schema({
    clinching: Number,
    ground: Number,
    standing: Number
})

export const significantStrikeSchema = new Schema({
    accuracy: Number,
    attempted: Number,
    defence: Number,
    landed: Number,
    landedPerMinute: Number,
    positions: strikesPositionSchema
})

export const submissionSchema = new Schema({
    attemptsPer15Mins: Number,
    average: Number
})

export const takedownSchema = new Schema({
    accuracy: Number,
    attempted: Number,
    avgTakedownsLandedPerMin: Number,
    defence: Number,
    landed: Number
})

const fightsStatsSchema = new Schema({
    avgFightTime: Number,
    finishingMoves: [String],
    grappling: grapplingSchema,
    significantStrikes: significantStrikeSchema,
    strikeMap: strikesMapSchema,
    submissions: submissionSchema,
    takedowns: takedownSchema
});
/* Statistics <--End--> */ 

const leagueFightSchema = new Schema({
    season: Number,
    division: Number,
    round: Number
})

const streakSchema = new Schema({
    type: {
        type: String,
        enum: ['win', 'lose']
    },
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

const opponentHistorySchema = new Schema({
    opponentId: {
        type: Schema.Types.ObjectId,
        ref: 'Fighter'
    },
    totalFights: Number,
    wins: Number,
    losses: Number,
    details: [{
        competition: {
            type: Schema.Types.ObjectId,
            ref: 'Competition'
        },
        season: String,
        division: String,
        round: String,
        winner: Boolean
    }]
})

const competitionRecordSchema = new Schema({
    competition: {
        type: Schema.Types.ObjectId,
        ref: 'Competition'
    },
    totalFights: {
        type: Number,
        default: 0
    },
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    winPercentage: {
        type: Number,
        default: 0
    }
})

const fighterSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date
    },
    profileImage: String,
    skillset: [String],
    globalRank: Number,
    fightStats: fightsStatsSchema,
    streaks: [streakSchema],
    opponentsHistory: [opponentHistorySchema],
    competitionHistory: [competitionRecordSchema]
});

export const Fighter =  Model('Fighter', fighterSchema);