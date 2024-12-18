/* Error imports */
import { NotFoundError } from "../error.js";
import { CompetitionMeta } from "../models/competition-meta.model.js";
import { Competition } from "../models/competition.model.js";

/* Model imports */
import { Fighter } from "../models/fighter.model.js";
import { catchAsyncErrors } from "../utils.js";

const fighterResolver = {
    Query: {
        /**
         * Fetches a list of all the fighters.
         * @returns {Promise<Array.<Object>>} - A list (array of objects) where every individual object is a fighter
         */
        getAllFighters: catchAsyncErrors(async() => {
            const allFighters = await Fighter.find({});
            if(!allFighters) throw new NotFoundError("Fighters not available");
            return allFighters;
        }),

        /**
         * Fetches a list of all active non-deleted fighters.
         * @returns {Promise<Array.<Object>>} - A list (array of objects) of all the fighters where isDeleted property is false
         */
        getActiveFighters: catchAsyncErrors(async() => {
            const activeFighters = await Fighter.find({isDeleted: false});
            if(!activeFighters) throw new NotFoundError("No active fighters found");
            return activeFighters;
        }),

        /**
         * Fetches an individual fighter's information
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to the query
         * @param {String} args.id - Unique ID identifying a fighter 
         * @returns {Promise<Object>} - An object containing fighter's details
         */
        getFigherInformation: catchAsyncErrors(async(_, { id }) => {
            const fighter = await Fighter.findById(id);
            if(!fighter) throw new NotFoundError("Fighter not found");
            return fighter;
        }),

        /**
         * Fetches a list of fighters filtered by the arguments provided by the user.
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to the query
         * @returns {Promise<Array.<Object>>} - An array of objects where individual object is a fighter.
         */
        filterFighters: catchAsyncErrors(async(_, args) => {
            const filteredFighters = await Fighter.find(args);
            if(!filteredFighters.length) throw new NotFoundError("Fighters not found");
            return filteredFighters;
        })
    },
    Mutation: {
        /**
         * Adds a new fighter to the system
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this mutation
         * @returns {Promise<Object>} The fighter object saved to the DB
         */
        addNewFighter: catchAsyncErrors(async(_, args) => {
            const newFighter = new Fighter(...args);
            return await newFighter.save();
        }),

        /**
         * Edits a fighter's information
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this mutation
         * @param {String} args.id - An ID identifying the fighter 
         * @param {Object} args.input - Input data to modify a fighter's information
         * @returns {Promise.<Object>} - The updated object of the fighter
         */
        editFighter: catchAsyncErrors(async(_, { id, input }) => {
            const updatedFighter = await Fighter.findByIdAndUpdate(
                id,
                {...input},
                {new: true}
            );
            if(!updatedFighter) throw new NotFoundError("Fighter not found");
            return updatedFighter;
        }),

        /**
         * Archives a fighter
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this mutation
         * @param {String} args.id - A unique ID identifying the fighter
         * @returns 
         */
        archiveFighter: catchAsyncErrors(async(_, { id }) => {
            const archiveFighter = await Fighter.findByIdAndUpdate(
                id,
                {isDeleted: true}
            );
            if(!archiveFighter) throw new NotFoundError("Fighter not found");
            return "Successfully archived fighter's information";
        })
    },
    Fighter: {
        competitionHistory: async(parent) => {
            // Map through the competitionHistory array and add the `competition` data
            return parent.competitionHistory.map(async (record) => {
                const competition = await CompetitionMeta.findById(record.competitionId);
                return {
                    ...record,
                    competition
                }
            })
        },
        opponentsHistory: async(parent) => {
            return parent.opponentsHistory.map(async (record) => {
                return {
                    ...record,
                    details: await Promise.all(
                        record.details.map(async(detail) => {
                            const competition = await Competition.findById(detail.competitionId);
                            return {
                                ...detail,
                                competition
                            }
                        })
                    )
                }
            })
        }
    }

    // @TODO: Add global rank property
};

export default fighterResolver;
