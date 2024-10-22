const express = require('express');
const mongoose = require('mongoose');
const graphqlHTTP = require('express-graphql').graphqlHTTP;
const schema = require('./schema/schema');

const { PORT } = require('./constants');

const app = express();

mongoose.connect('mongodb+srv://rushabhshah1993:Deathrace1234@cluster0.xotii.mongodb.net/amoyanfc?retryWrites=true&w=majority');
mongoose.connection.once('open', () => {
    console.log('Connected to database');
})

app.use('/graphql', graphqlHTTP({
    schema,
    graphiql: true
}));

app.listen(PORT, () => {
    console.log(`Listening for requests on port ${PORT}`);
});
