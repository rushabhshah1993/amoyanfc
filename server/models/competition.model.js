/* Package imports */
import { Schema, Model } from "mongoose";

/* Schema imports */
import { 
    fighterSchema,
    grapplingSchema, significantStrikeSchema, 
    strikesMapSchema, submissionSchema, 
    takedownSchema 
} from "./fighter.model.js";
import { competitionMetaSchema } from "./competition-meta.model.js";

/* Constants imports */
import { COMPETITION_TYPES, DEFAULT_CONFIG } from "../constants.js";



/**
 * Object definition for the `stats` object belonging to `fightStatsSchema`
 * @typedef {Object} stats
 * @property {Number} fightTime - Defines the time taken for the fight to complete
 * @property {String} finishingMove - If the fighter is a winner, it will define the finishing move used. If the fighter is a loser, it will be undefined.
 * @property {Object} grappling - Defines the grappling statistics for the fighter in an associated fight. It follows the `grapplingSchema`.
 * @property {Object} significantStrikes - Defines the significant strikes statistics for the fighter in an associated fight. It follows the `significantStrikesSchema`.
 * @property {Object} strikeMap - Defines the map of strikes statistics for the fighter in an associated fight. It follows the `strikesMapSchema`.
 * @property {Object} submissions - Defines the submissions statistics for the fighter in an associated fight. It follows the `submissionSchema`.
 * @property {Object} takedowns - Defines the map of takedowns statistics for the fighter in an associated fight. It follows the `takedownSchema`.
 */
/**
 * Schema definition of an individual fighter's statistics after a fight has been completed
 * @typedef {Object} fightStatsSchema
 * @property {ObjectId} fighterId - Defines the unique fighterId of a fighter participating in a fight, referring to the `Fighter` model
 * @property {Object} stats - Defines the object representing the various statistics of a fighter after a fight
 */
const fightStatsSchema = new Schema({
    fighterId: { type: Schema.Types.ObjectId, ref: 'Fighter' },
    stats: {
        fightTime: Number,
        finishingMove: String,
        grappling: grapplingSchema,
        significantStrikes: significantStrikeSchema,
        strikeMap: strikesMapSchema,
        submissions: submissionSchema,
        takedowns: takedownSchema
    }
});

/**
 * Schema definition of an individual fight
 * @typedef {Object} fightSchema
 * @property {ObjectId} fighter1 - Defines the objectID for the first fighter in a fight
 * @property {ObjectId} fighter2 - Defines the objectID for the second fighter in a fight
 * @property {ObjectId} winner - Defines the objectID for the winner in a fight, it will be undefined if the fight is not fought
 * @property {String} fightIdentifier - Defines a unique string that can be used as a backup to identify a round in a cup or league-style competition
 * @property {Date} date - Defines the date on which the fight will be fought, it will be undefined if the fight is not fought
 * @property {String} userDescription - Defines the description of the fight provided by the fighter, it will be undefined if the user has not provided any
 * @property {String} genAIDescription - Defines the description of the fight provided by ChatGPT
 * @property {Boolean} isSimulated - Defines whether the user opted to simulate the fight
 * @property {Array.<Object>} fighterStats - Defines a list of two objects where every object provides the statistics of the fight for an individual fighter
 * @property {String} fightStatus - Defines the status of the fight
 */
const fightSchema = new Schema({
    fighter1: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
    fighter2: { type: Schema.Types.ObjectId, ref: 'Fighter', required: true },
    winner: { type: Schema.Types.ObjectId, ref: 'Fighter' },
    fightIdentifier: String,
    date: Date,
    userDescription: String, 
    genAIDescription: String, 
    isSimulated: { type: Boolean, default: false },
    fighterStats: [fightStatsSchema],
    fightStatus: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

/**
 * Schema definition for the individual round data for a division of an associated season
 * @typedef {Object} roundsSchema
 * @property {Number} roundNumber - Defines the unique round number of a division of an associated season
 * @property {Array.<Object>} fights - Defines a list of fights happening in an individual round with every object following the `fightSchema`.
 */
const roundsSchema = new Schema({
    roundNumber: Number,
    fights: [fightSchema] // Embedding the fight schema for each round
})

/**
 * Schema definition for the division data for an associated season
 * @typedef {Object} leagueDivisionSchema
 * @property {Number} divisionNumber - Defines the unique number for a division of an associated season
 * @property {String} divisionName - Defines the name provided by the user for this division (defaults to `Division ${divisionNumber}`)
 * @property {Number} totalRounds - Defines the total number of rounds to be fought in this division
 * @property {Number} currentRound - Defines the current round for the division of this season
 * @property {Array.<Object>} roundsSchema - Defines a list of rounds' data for a division that follow the `roundsSchema`.
 */
const leagueDivisionSchema = new Schema({
    divisionNumber: Number,
    divisionName: String,
    totalRounds: Number,
    currentRound: Number,
    rounds: [roundsSchema]
});

/**
 * Object definition for leagueDivisions object in a seasonMetaSchema
 * @typedef {Object} leagueDivisions
 * @property {Number} divisionNumber - Defines the unique division number for an associated season
 * @property {Array.<Object>} fighters - Defines a list (array) of participating fighters for an associated season's division's fighters following the `fighterSchema`
 */
/**
 * Object definition for cupParticipants object in a seasonMetaSchema
 * @typedef {Object} cupParticipants
 * @property {Array.<Object>} fighters - Defines a list (array) of participating fighters for an associated season's cup competition following the `fighterSchema`
 */
/**
 * Schema definition for a meta information for an associated season
 * @typedef {Object} seasonMeta
 * @property {Number} seasonNumber - Defines a unique identity for an associated season of a competition
 * @property {Date} startDate - Defines the date when the season started
 * @property {Date} endDate - Defines the date when the season ended
 * @property {Object} leagueDivisions - Defines an object representing an array of objects for the associated season's league data's meta information like the list of fighters per division. If the given competition is not a league-style competition, it will be an empty array or undefined.
 * @property {Object} cupParticipants Defines an object representing the associated season's cup data's meta information like the list of participating fighters which follows the `fighterSchema`. If it's not a cup-style competition, it will be an empty array or undefined.
 */
const seasonMetaSchema = new Schema({
    seasonNumber: Number,
    startDate: Date,
    endDate: Date,
    leagueDivisions: [{ // Specific for league-competitions
        divisionNumber: Number,
        fighters: [fighterSchema]
    }],
    cupParticipants: { // Specific for cup-competitions
        fighters: [fighterSchema]
    }
});

/**
 * Object definition for the activeLeagueFights object
 * @typedef {Object} activeLeagueFights
 * @property {Number} division - The division number which represents the individual division from an active season
 * @property {Number} round - The round number which represents the individual round of a division from an active season
 */
/**
 * Schema definition for a detailed season data for a league-style competition for an associated season
 * @typedef {Object} leagueData
 * @property {Array.<Object>} divisions - An array of divisions objects for individual division data for a season. Each division follows the 'leagueDivisionSchema`.
 * @property {Array.<Object>} activeLeagueFights - An array of objects defining which division and round are active for a given active season
 */
const leagueDataSchema = new Schema({
    divisions: { type: [leagueDivisionSchema], default: [] },
    activeLeagueFights: [{ 
        division: Number,
        round: Number
    }]
})


/**
 * Schema definition for a detailed data associated for a cup-style competition for an associated season
 * @typedef {Object} cupData
 * @property {Array.<Object>} fights - An array of fight objects in the cup competition. Each fight follows the `fightSchema`.
 * @property {String} currentStage - Defines the current stage of the cup competition (e.g., "Preliminary", "Semifinals", "Finals").
 */
const cupDataSchema = new Schema({
    fights: { type: [fightSchema], default: [] }, 
    currentStage: String,
});

/**
 * Object definition for the fightsPerDivision object in the leagueConfiguration schema
 * @typedef {Object} fightersPerDivision
 * @property {Number} divisionNumber - The division number in the league.
 * @property {Number} numberOfFighters - The number of fighters in that division.
 */
/**
 * Schema definition for a league-style competition's configuration for an associated season
 * @typedef {Objct} leagueConfiguration
 * @property {Number} numberOfDivisions - Defines the number of divisions in a league for an associated season
 * @property {Array.<Object>} fightersPerDivision - Defines  an array of a list of divisions and the number of fighters participating in that division
 * @property {Number} pointsPerWin - Defines the points awarded for a win in the league.
 */
const leagueConfigurationSchema = new Schema({
    numberOfDivisions: { type: Number, default: 0 },
    fightersPerDivision: [
        {
            divisionNumber: { type: Number, required: true },
            numberOfFighters: { type: Number, required: true },
        }
    ],
    pointsPerWin: { type: Number, default: DEFAULT_CONFIG.POINTS_PER_WIN}
});

/**
 * Schema definition for a cup-style competition's configuration for an associated season
 * @typedef {Object} cupConfiguration
 * @property {Number} knockoutRounds - Define the number of rounds in a cup-style competition [For example, 3 rounds for 8 fighters that would include the preliminary round, semi-finals, and finals]
 * @property {Number} numberOfFighters - Define the number of fighters participating in an associated cup-style competition for a particular season
 * @property {Array.<String>} stages - Defines the user-defined names for the various stages of a competition created as per the number of rounds, e.g., ['Preliminary', 'Semi-finals', 'Finals']
 */
const cupConfigurationSchema = new Schema({
    knockoutRounds: { type: Number, required: true },
    numberOfFighters: { type: Number, required: true },
    stages: { type: [String], default: []}
})

/**
 * Schema definition for an associated configuration for a season in the competition object
 * @typedef {Object} seasonConfiguration
 * @property {Object} leagueConfiguration - Configuration specific to a league-style competition, undefined if the competition type is not a league competition
 * @property {Object} cupConfiguration - Configuration specific to a cup-style competition, undefined if the competition type is not a cup competition
 */
const seasonConfigurationSchema = new Schema({
    leagueConfiguration: leagueConfigurationSchema,
    cupConfiguration: cupConfigurationSchema
});

/**
 * Schema definition for a league season closely tagged to a cup competition
 * @typedef {Object} linkedLeagueSeasonSchema
 * @property {ObjectId} competitionId - The unique competition ID which is closely associated to the cup competition
 * @property {ObjectId} seasonId - The unique season ID of a competition which is closely associated to the cup competition
 */
const linkedLeagueSeasonSchema = new Schema({
    competition: { type: competitionSchema, ref: 'CompetitionMeta' },
    season: { type: seasonMetaSchema, ref: 'Season' }
})

/**
 * Schema definition for competition
 * @typedef {Object} Competition
 * @property {String} competitionMeta - Provides information about a competition referring to the CompetitionMeta model
 * @property {Boolean} isActive - Indicates whether the competition is currently live/active
 * @property {Object} seasonMeta - Provides associated meta information like season number, number of participants, start and end for a season.
 * @property {Objcet} leagueData - Provides associated information specific to a league-style competition
 * @property {Object} cupData - Provides assocaited information specific to a cup-style competition
 * @property {Object} config - Provides the associated underlying configuration information for a particular competition
 * @property {Object} linkedLeagueSeason - Specific for cup compeitions, it provides the associated league competition it is linked to, referred by `linkedLeagueSeasonSchema`
 * @property {Date} updatedAt - Provides the date the competition was updated
 */
const competitionSchema = new Schema({
    competitionMeta: { type: competitionMetaSchema, ref: 'CompetitionMeta' },
    isActive: { type: Boolean, required: true, default: false },
    seasonMeta: seasonMetaSchema,
    leagueData: leagueDataSchema,
    cupData: cupDataSchema,
    config: seasonConfigurationSchema,
    linkedLeagueSeason: linkedLeagueSeasonSchema,
    createdAt: Date,
    updatedAt: Date,
});

/**
 * @typedef {Array.<Competition>} Competitions
 * Array of competition objects. Each competition follows the structure defined by the `Competition` typedef.
 */


/* Pre-save middlewares */
seasonConfigurationSchema.pre('save', function(next) {
    if(this.type === 'League' && this.cupConfiguration) {
        return next(new Error('Cup configuration should not be set for league competitions.'));
    }
    if(this.type === 'Cup' && this.leagueConfiguration) {
        return next(new Error('League configuration should not be set for cup competitions.'));
    }
});

competitionSchema.pre('save', function(next) {
    if(this.type === 'League' && this.cupData) {
        return next(new Error('Cup data information should not be provided for league competitions.'));
    }
    if(this.type === 'Cup' && this.leagueData) {
        return next(new Error('League data information should not be provided for cup competitions.'));
    }
});

leagueDataSchema.pre('save', async function(next) {
    try {
        if(this.competitionId) {
            const competition = await Model('Competition')
            .findOne({ 'competitionMeta.uniqueCompetitionId': this.competitionId })
            .select('isActive');
            // If the competition is not active, clear the activeLeagueFights array
            if (competition && !competition.isActive) {
                this.activeLeagueFights = [];
            }
        }

        next();
    } catch(error) {
        next(error);
    }
});

/* Indexes */
competitionSchema.index({ competitionId: 1 });
competitionSchema.index({ isActive: 1 });
fightSchema.index({ competitionId: 1, fighter1: 1, fighter2: 1 });
fightSchema.index({ date: -1 });
fightSchema.index({ fighter1: 1, fighter2: 1, competitionId: 1 }, { unique: true });

export const Competition = Model('Competition', competitionSchema);
export const Division = Model('Division', leagueDivisionSchema);
export const Season = Model('Season', leagueDataSchema);
export const Round = Model('Round', roundsSchema);
export const Fight = Model('Fight', fightSchema);
