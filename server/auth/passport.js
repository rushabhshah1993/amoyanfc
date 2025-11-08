import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Temporarily disable authorization check to get Google User ID
        if (profile.id !== process.env.AUTHORIZED_GOOGLE_ID) {
            return done(null, false, { message: 'Unauthorized Google account' });
        }

        // Create user object
        const user = {
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0].value
        };
        return done(null, user);
    } catch (error) {
        console.error('Error in Google OAuth callback:', error);
        return done(error, null);
    }
}));

// Configure JWT Strategy
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
    try {
        // Check if token is still valid (within 24 hours)
        const now = Date.now();
        const tokenIssuedAt = payload.iat * 1000; // Convert to milliseconds
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (now - tokenIssuedAt > twentyFourHours) {
            return done(null, false, { message: 'Token expired' });
        }

        // Return user info from token
        return done(null, payload.user);
    } catch (error) {
        return done(error, false);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Generate JWT token
export const generateToken = (user) => {
    return jwt.sign(
        { 
            user: {
                googleId: user.googleId,
                email: user.email,
                name: user.name,
                picture: user.picture
            }
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Verify JWT token
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

export default passport;

