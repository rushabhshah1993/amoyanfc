import { Schema, Model } from "mongoose";

const competitionSchema = new Schema({
    name: String,
    description: String,
    logo: String
});

module.exports = Model('Competition', competitionSchema);
