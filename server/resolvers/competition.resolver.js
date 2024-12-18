/* Model imports */
import { Competition } from './../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';

/* Error imports */
import { NotFoundError } from '../error.js';

/* Utility imports */
import { catchAsyncErrors } from '../utils.js';

const competitionResolvers = {
    Query: {
        /**
         * Fetches a list of all the competitions.
         * @returns {Promise<Array.<Object>>} - A list of all the seasons of all competitions.
         */
        getAllCompetitions: catchAsyncErrors(async() => {
            const allCompetitions = await Competition.find({});
            if(!allCompetitions.length) {
                throw new NotFoundError("Competitions not found");
            }
            return allCompetitions;
        }),
        /**
         * Fetches the data for a particular competition
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - The arguments for this query
         * @param {String} args.id - The unique ID of a competition
         * @returns {Promise<Object>} - A competition object, if found
         */
        getCompetitionSeason: catchAsyncErrors(async(_, { id }) => {
            const competition = await Competition.findById(id);
            if(!competition) {
                throw new NotFoundError("Competition not found");
            }
            return competition;
        }),
        /**
         * Fetches a list of competitions belonging to a particular category (e.g. IFC, IFL, IC, CC, Brawl)
         * 
         * @param {Object} _ - Unused parent resolver 
         * @param {Object} args - Arguments for this query
         * @param {String} args.competitionMetaId - The unique ID for a particular competition category referenced with CompetitionMeta model
         * @returns {Promise<Array.<Object>>} - A list of competition seasons belonging to a specific competition category
         */
        getAllSeasonsByCompetitionCategory: catchAsyncErrors(async(_, { competitionMetaId }) => {
            const competitionType = await CompetitionMeta.findById(id);
            const competitionName = competitionType.competitionName;
            const competitions = await Competition.find({"competitionMeta.id": competitionMetaId});
            if(!competitions.length) {
                throw new NotFoundError(`Competition with the type ${competitionName} not found`);
            }
            return competitions;    
        }),
        /**
         * Fetch a list of competitions based on the arguments provided by the query
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments provided to this query
         * @returns {Promise<Array.<Object>>} - A list of competition seasons based on the arguments provided by the query
         */
        filterCompetitions: catchAsyncErrors(async(_, args) => {
            const competitions = await Competition.find(filter);
            if(!competitions.length) {
                throw new NotFoundError(`Competition not found`);
            }
            return competitions;
        })
    },
    Mutation: {
        /**
         * Creates a new season for a particular competition
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @returns {Promise<Object>} The updated object of the new season of a competition
         */
        createCompetitionSeason: catchAsyncErrors(async(_, args) => {
            const newCompetition = new Competition(...args);
            return await newCompetition.save();
        }),

        /**
         * Updates an existing competition's season
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - The unique ID of the competition season to be updated
         * @param {Object} args.input - The input object containing the fields to be updated
         * @returns {Promise<Object>} The updated object of the competition season
         */
        updateCompetitionSeason: catchAsyncErrors(async(_, args) => {
            const updatedCompetitionSeason = await Competition.findByIdAndUpdate(
                args.id,
                {...args.input},
                { new: true }
            );
            if(!updatedCompetitionSeason) throw new NotFoundError("Competition not found");
            return updatedCompetitionSeason;
        }),

        /**
         * Deletes an existing season from a competition
         * 
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments passed to this mutation
         * @param {String} args.id - The unique ID of the competition season
         * @returns {String} An updated message to denote the deletion has been completed successfully
         */
        deleteCompetitionSeason: catchAsyncErrors(async(_, { id }) => {
            const competition = await Competition.findById(id);
            const competitionMeta = await CompetitionMeta.findById(competition.competitionMeta.id);
            const deletedCompetition = await Competition.findByIdAndDelete(id);
            if(!deletedCompetition) throw new Error("Failed to find and delete the competition season");
            return `Successfully deleted season ${competition.seasonMeta.seasonNumber} of ${competitionMeta.competitionName}`;
        })
    },
    CompetitionMeta: {
        competitionMeta: catchAsyncErrors(async(parent) => {
            const competitionMetaId = parent.competitionMetaId;
            const competitionMetaInformation = await Competition.findById(competitionMetaId);
            if(!competitionMetaInformation) throw new NotFoundError('Competition information not found');
            return competitionMetaInformation;
        })
    }
};

export default competitionResolvers;
