const express = require('express');
const mongoose = require('mongoose');

const { PORT } = require('./constants');

const app = express();

mongoose.connect('mongodb+srv://rushabhshah1993:Deathrace1234@cluster0.xotii.mongodb.net/amoyanfc?retryWrites=true&w=majority');
mongoose.connection.once('open', () => {
    console.log('Connected to database');
})

app.listen(PORT, () => {
    console.log(`Listening for requests on port ${PORT}`);
});
