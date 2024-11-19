/* Package imports */
import express from 'express';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

/* Schema imports */
import mergedTypeDefs from './schema/index.js';

/* Resolver imports */
import mergedResolvers from './resolvers/index.js';

/* Constants imports */
import { PORT } from './constants.js';

const app = express();

mongoose.connect('mongodb+srv://rushabhshah1993:Deathrace1234@cluster0.xotii.mongodb.net/amoyanfc?retryWrites=true&w=majority');
mongoose.connection.once('open', () => {
    console.log('Connected to database');
})

const server = new ApolloServer({
    typeDefs: mergedTypeDefs,
    resolvers: mergedResolvers,
    formatError: (err) => {
        console.error("Error occurred: ", err);
        return {
            message: err.message,
            code: err.extensions.code || "INTERNAL_SERVER_ERROR",
            details: err.extensions.exception ? err.extensions.exception.stacktrace : null
        }
    }
});

const { url } = await startStandaloneServer(server);

app.listen(PORT, () => {
    console.log(`🚀 Server ready at ${url}`);
});
