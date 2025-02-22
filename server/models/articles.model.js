/* Package imports */
import mongoose from 'mongoose';
import { Schema } from 'mongoose';

/**
 * Schema definition for articles
 * @typedef {Object} articlesSchema
 * @property {String} title - Title of an article
 * @property {String} subtitle - Subtitle of an article
 * @property {String} blurb - Blurb of an article
 * @property {String} content - Content of an article
 * @property {String} thumbnail - URL of an article
 * @property {Array.<String>} tags - A list of tags for an article
 * @property {Date} publishedDate - The published date of an article
 */
const articlesSchema = new Schema({
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    blurb: { type: String },
    content: { type: String, required: true },
    thumbnail: { type: String },
    tags: { type: [String] },
    publishedDate: { type: Date, required: true, default: () => Date.now(), immutable: true },
    fightersTagged: { type: [String] }
}, { timestamps: true });

export const Articles = mongoose.model('Articles', articlesSchema);