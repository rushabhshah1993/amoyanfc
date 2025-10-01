import express from 'express';
import passport from './passport.js';
import { generateToken } from './passport.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Google OAuth login route
router.get('/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback route
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Generate JWT token
        const token = generateToken(req.user);
        
        // Store token in httpOnly cookie for security
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Redirect to frontend with success
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?login=success`);
    }
);

// Logout route
router.post('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Check authentication status
router.get('/status', (req, res) => {
    const token = req.cookies.authToken;
    
    if (!token) {
        return res.json({ authenticated: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ 
            authenticated: true, 
            user: decoded.user 
        });
    } catch (error) {
        res.clearCookie('authToken');
        res.json({ authenticated: false });
    }
});

export default router;
