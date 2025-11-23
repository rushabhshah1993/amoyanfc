/* Load environment variables FIRST */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');

// Only load .env file if it exists (for local development)
// In production (Cloud Run), env vars come from the service configuration
if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded environment variables from .env file');
} else {
    console.log('ℹ️  No .env file found, using environment variables from system');
}

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

/* Upload routes imports */
import uploadRoutes from './routes/upload.routes.js';

/* Constants imports */
import { PORT } from './constants.js';


const app = express();

// Configure CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Configure session
// In production/staging (Cloud Run), use memory store since we rely on JWT
// In local development, can use MongoStore if needed
const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

const sessionConfig = {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction, // true in production (https only)
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-origin
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Only use MongoStore in local development
// In Cloud Run, we use JWT tokens (stateless auth) instead of sessions
if (!isProduction && process.env.MONGODB_URI) {
    try {
        const sessionStore = MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            mongoOptions: {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            },
            touchAfter: 24 * 3600,
            stringify: false
        });
        
        sessionStore.on('error', (error) => {
            console.error('Session store error:', error);
        });
        
        sessionConfig.store = sessionStore;
        console.log('✅ Using MongoDB session store');
    } catch (error) {
        console.warn('⚠️  MongoDB session store failed, using memory store:', error.message);
    }
} else {
    console.log('ℹ️  Using memory session store (Cloud Run mode - JWT-based auth)');
}

app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Parse JSON bodies and cookies with increased size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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

// Upload routes
app.use('/api/upload', uploadRoutes);

// GraphQL endpoint with authentication context
app.use(
    '/graphql',
    express.json({ limit: '50mb' }),
    expressMiddleware(server, {
        context: authContext
    })
);

// Start listening FIRST (so Cloud Run knows we're alive)
await new Promise((resolve) => httpServer.listen({port: PORT}, resolve));
console.log(`🚀 Server listening on port ${PORT}`);

// Then connect to MongoDB (non-blocking for health checks)
connectDB().catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    // Don't exit - let health checks work
});
