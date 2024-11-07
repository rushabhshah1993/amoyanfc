import { Schema, Model } from "mongoose";
import { 
    grapplingSchema, significantStrikeSchema, 
    strikesMapSchema, submissionSchema, 
    takedownSchema 
} from "./fighter.model";

/* Fighter Stats Schema for Each Fight */
const fightStatsSchema = new Schema({
    fighterId: {
        type: Schema.Types.ObjectId,
        ref: 'Fighter'
    },
    stats: {
        avgFightTime: Number,
        finishingMoves: [String],
        grappling: grapplingSchema,
        significantStrikes: significantStrikeSchema,
        strikeMap: strikesMapSchema,
        submissions: submissionSchema,
        takedowns: takedownSchema
    }
});

/* Individual Fight Schema with Description and Stats */
const fightSchema = new Schema({
    fighter1: {
        type: Schema.Types.ObjectId,
        ref: 'Fighter'
    },
    fighter2: {
        type: Schema.Types.ObjectId,
        ref: 'Fighter'
    },
    winner: {
        type: Schema.Types.ObjectId,
        ref: 'Fighter'
    }, // Optional, after fight is completed
    date: Date,
    userDescription: String, // User provided description of the fight
    genAIDescription: String, // AI-generated description of the fight
    fighterStats: [fightStatsSchema]
})

/* Division Schema for League Competitions */
const leagueDivisionSchema = new Schema({
    division: Number,
    rounds: [
        {
            round: Number,
            fights: [fightSchema] // Embedding the fight schema for each round
        }
    ]
})

/* Main Competition Schema */
const competitionSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['league', 'cup'],
        required: true
    },
    season: {
        type: Number,
        required: true,
    },
    description: String,
    logo: String,
    divisions: [leagueDivisionSchema], // Only for league-type competitions
    fights: [fightSchema], // For cup-type competitions,
    currentStage: { // For cup-type competitions
        type: String,
        enum: ['Not Started', 'Preliminary', 'Semifinals', 'Finals', 'Completed'],
        default: 'Not Started'
    },
    isLive: { type: Boolean, default: false }, //Whether the competition is live
    activeLeagueFights: [{
        division: Number,
        round: Number
    }],
    updatedAt: Date
});

export const Competition = Model('Competition', competitionSchema);
