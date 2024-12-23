/* Model imports */
import { GlobalRank } from "../models/global-rank.model.js";

/* Error imports */
import { NotFoundError } from "../error.js";
import { Fighter } from "../models/fighter.model.js";

const globalRankResolver = {
    Query: {
        /**
         * Fetches a list of all the global ranks available in the system, specific only for IFL
         * @returns {Promise<Array.<Object>>} - An array of objects where every object is a list of global rank at a certain point in time.
         */
        getAllGlobalRanks: async() => {
            const allGlobalRanks = await GlobalRank.find({});
            if(!allGlobalRanks) throw new NotFoundError("Not able to retrieve global ranks");
            return allGlobalRanks;
        },

        /**
         * Fetch the latest list of global ranking of fighters
         * @returns {Promise<Object>} - A list of the latest ranking of fighters
         */
        getCurrentGlobalRank: async() => {
            const currentGlobalRank = await GlobalRank.find({isCurrent: true});
            if(!currentGlobalRank) throw new NotFoundError("Not able to retrieve current global rank list");
            return currentGlobalRank;
        },

        /**
         * Fetch a filtered list of global ranks
         * @param {Object} _ - Unused parent resolver 
         * @param {Object} args  - Arguments passed to this query
         * @returns {Promise<Array.<Object>} - An array of objects where every object represents a list of global ranking at a certian point in time
         */
        filterGlobalRanks: async(_, args) => {
            const filteredList = await GlobalRank.find(args);
            if(!filteredList.length) throw new NotFoundError("Not able to retrieve global ranks");
            return filteredList;
        }
    },
    Mutation: {
        /**
         * Add the latest rankings of fighters to the system
         * @param {Object} _ - Unused parent resolver
         * @param {Object} input - Ranking data passed to this mutation
         * @returns {Promise<Object>} The updated object of the latest rankings added to the system
         */
        addNewGlobalRankList: async(_, input) => {
            const newList = new GlobalRank(...input);
            return await newList.save();
        },

        /**
         * Update an existing entry of the global rankings in the system
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - The unique ID representing a string
         * @param {Object} args.input - Data to be updated for a given entry
         * @returns {Promise<Object>} - Object containing the updated data
         */
        updateGlobalRankList: async(_, {id, input}) => {
            const updatedList = await GlobalRank.findByIdAndUpdate(
                id,
                {...input},
                { new: true }
            );
            if(!updatedList) throw new NotFoundError("List not found");
            return updatedList;
        },

        /**
         * Deletes an existing entry 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - Unique ID of the list that needs to be deleted
         * @returns {String} An updated message confirming if the deletion happened successfully
         */
        deleteGlobalRankList: async(_, { id }) => {
            const deletedList = await GlobalRank.findByIdAndDelete(id);
            if(!deletedList) throw new NotFoundError("List not found");
            return "Succssfully deleted the list";
        }
    },
    Fighter: {
        fighters: async(parent) => {
            const enrichedFighters = parent.fighters.map(async(fighter) => {
                const fighterDetails = await Fighter.findById(fighter.fighterId);
                return {
                    ...fighter,
                    fighterDetails
                }
            });
            return enrichedFighters;
        }
    }
}

export default globalRankResolver;
