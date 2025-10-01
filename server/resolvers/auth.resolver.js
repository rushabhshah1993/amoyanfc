import jwt from 'jsonwebtoken';
import { verifyToken } from '../auth/passport.js';

export const authResolvers = {
    Query: {
        me: async (parent, args, context) => {
            // Check if user is authenticated
            if (!context.user) {
                throw new Error('Not authenticated');
            }
            return context.user;
        },
        
        isAuthenticated: async (parent, args, context) => {
            return Boolean(context.user);
        }
    },
    
    Mutation: {
        logout: async (parent, args, context) => {
            // Clear the cookie by setting it to expire immediately
            context.res.clearCookie('authToken');
            return { success: true, message: 'Logged out successfully' };
        }
    }
};

// Authentication context middleware for GraphQL
export const authContext = async ({ req, res }) => {
    const token = req.cookies?.authToken;
    
    if (!token) {
        return { user: null, res };
    }

    try {
        const decoded = verifyToken(token);
        if (!decoded) {
            res.clearCookie('authToken');
            return { user: null, res };
        }
        
        return { user: decoded.user, res };
    } catch (error) {
        res.clearCookie('authToken');
        return { user: null, res };
    }
};

