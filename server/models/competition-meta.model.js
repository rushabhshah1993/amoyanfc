/* Package imports */
import mongoose from 'mongoose';
import { Schema } from 'mongoose';

/* Constants imports */
import { COMPETITION_TYPES } from '../constants';

/**
 * Schema definition for competition's meta information
 * @typedef {Object} competitionMetaSchema
 * @property {String} competitionName - The name of the competition
 * @property {String} type - The type of the competition
 * @property {String} description - The description of an individual competition
 * @property {String} logo - The logo of an associated competition
 */
export const competitionMetaSchema = new Schema({
    competitionName: { type: String, required: true },
    type: { type: String, enum: Object.values(COMPETITION_TYPES), required: true },
    description: String,
    logo: { type: String, required: true },
}, {timestamps: true});

export const CompetitionMeta = mongoose.model('CompetitionMeta', competitionMetaSchema);