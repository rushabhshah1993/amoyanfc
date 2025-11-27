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
    passport.authenticate('google', { 
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`,
        session: true
    }),
    (req, res) => {
        try {
            if (!req.user) {
                console.error('No user in request after authentication');
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_user`);
            }

        // Generate JWT token
        const token = generateToken(req.user);
        
            // Store token in httpOnly cookie for subsequent requests
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

            console.log('✅ User authenticated successfully:', req.user.email);

            // For cross-domain, also pass token in URL so frontend can store it
            // Frontend will then send it in subsequent requests via cookie
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}?login=success&token=${token}`);
        } catch (error) {
            console.error('❌ Error in OAuth callback:', error);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=callback_failed`);
        }
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
