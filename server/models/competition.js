const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const competitionSchema = new Schema({
    name: String,
    description: String,
    logo: String
});

module.exports = mongoose.model('Competition', competitionSchema);
