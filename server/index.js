/* Load environment variables FIRST */
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

/* MongoDB connection imports */
import { connectDB } from './db/connectDB.js';

/* Typedef imports */
import mergedTypeDefs from './typeDefs/index.js';

/* Resolver imports */
import mergedResolvers from './resolvers/index.js';

/* Auth imports */
import passport from './auth/passport.js';
import authRoutes from './auth/routes.js';
import { authContext } from './resolvers/auth.resolver.js';

/* Constants imports */
import { PORT } from './constants.js';


const app = express();

// Configure CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Configure session
app.use(session({
    secret: process.env.JWT_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Parse JSON bodies and cookies
app.use(express.json());
app.use(cookieParser());

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

// Auth routes
app.use('/auth', authRoutes);

// GraphQL endpoint with authentication context
app.use(
    '/graphql',
    expressMiddleware(server, {
        context: authContext
    })
);

await new Promise((resolve) => httpServer.listen({port: PORT}, resolve));
await connectDB();

console.log(`🚀 Server listening on port ${PORT}`);
