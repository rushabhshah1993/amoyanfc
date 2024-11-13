import express from 'express';
import mongoose from 'mongoose';
import { graphqlHTTP } from 'express-graphql';
import schema from './schema/schema.js';

import { PORT } from './constants.js';

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
