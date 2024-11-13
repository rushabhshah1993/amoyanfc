/* Package imports */
import express from 'express';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

/* Schema imports */
import { typeDefs } from './schema/index.js';

/* Resolver imports */
import { resolvers } from './resolvers/index.js';

/* Constants imports */
import { PORT } from './constants.js';

const app = express();

mongoose.connect('mongodb+srv://rushabhshah1993:Deathrace1234@cluster0.xotii.mongodb.net/amoyanfc?retryWrites=true&w=majority');
mongoose.connection.once('open', () => {
    console.log('Connected to database');
})

const server = new ApolloServer({
    typeDefs,
    resolvers
});

const { url } = startStandaloneServer(server, {
    listen: {
        port: 4000
    }
});

app.listen(PORT, () => {
    console.log(`Listening for requests on ${url}`);
});
