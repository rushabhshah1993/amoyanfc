/* Package imports */
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

/* MongoDB connection imports */
import { connectDB } from './db/connectDB.js';

/* Schema imports */
import mergedTypeDefs from './schema/index.js';

/* Resolver imports */
import mergedResolvers from './resolvers/index.js';

/* Constants imports */
import { PORT } from './constants.js';

dotenv.config();
const app = express();

const httpServer = http.createServer(app);

const server = new ApolloServer({
    typeDefs: mergedTypeDefs,
    resolvers: mergedResolvers,
    plugins: [ApolloServerPluginDrainHttpServer({httpServer})],
    formatError: (err) => {
        console.error("Error occurred: ", err);
        return {
            message: err.message,
            code: err.extensions.code || "INTERNAL_SERVER_ERROR",
            details: err.extensions.exception ? err.extensions.exception.stacktrace : null
        }
    }
});

await server.start();

app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server)
);

await new Promise((resolve) => httpServer.listen({port: PORT}, resolve));
await connectDB();

console.log(`🚀 Server listening on port ${PORT}`);
