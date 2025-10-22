# Google OAuth Login Troubleshooting Guide

## Common Issues and Solutions

### 1. Check Your .env File

Make sure you have these variables in your `.env` file in the root directory:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
AUTHORIZED_GOOGLE_ID=your_google_user_id_here

# Frontend
FRONTEND_URL=http://localhost:3000

# Backend  
PORT=4000

# JWT
JWT_SECRET=your_jwt_secret_key_here
```

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable "Google+ API" or "Google Identity Services"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: **Web application**
6. Add these to **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://localhost:4000`
7. Add these to **Authorized redirect URIs**:
   - `http://localhost:4000/auth/google/callback`
8. Save and copy the Client ID and Client Secret to your `.env` file

### 3. Get Your Google User ID

If you don't know your `AUTHORIZED_GOOGLE_ID`, temporarily disable the check:

**In `server/auth/passport.js`, comment out lines 17-19:**

```javascript
// Temporarily disable to get your Google ID
// if (profile.id !== process.env.AUTHORIZED_GOOGLE_ID) {
//     return done(null, false, { message: 'Unauthorized Google account' });
// }
```

Then:
1. Try logging in
2. Check the server console - it should log `profile.id`
3. Copy that ID to your `.env` as `AUTHORIZED_GOOGLE_ID`
4. Uncomment the authorization check
5. Restart the server

### 4. Common Error Messages

#### "redirect_uri_mismatch"
- **Problem**: The redirect URI in your `.env` doesn't match Google Console
- **Solution**: Make sure both use exactly `http://localhost:4000/auth/google/callback`

#### "Unauthorized Google account"
- **Problem**: Your Google ID doesn't match `AUTHORIZED_GOOGLE_ID`
- **Solution**: Follow step 3 above to get your correct Google ID

#### "Error: Cannot GET /login"
- **Problem**: Frontend is trying to redirect to a non-existent route
- **Solution**: This is already fixed in the code (redirects to frontend URL)

#### Login succeeds but immediately logs out
- **Problem**: JWT_SECRET is not set or cookies aren't being stored
- **Solution**: 
  - Set `JWT_SECRET` in `.env`
  - Check browser cookies in DevTools
  - Make sure `sameSite: 'strict'` isn't blocking cookies

### 5. Testing the Flow

1. **Start both servers:**
   ```bash
   npm run dev
   ```

2. **Open DevTools** (F12) and go to:
   - Console tab - to see any errors
   - Network tab - to see the redirect chain
   - Application → Cookies - to see if `authToken` is set

3. **Click "Sign in with Google"**

4. **Expected flow in Network tab:**
   - Request to `localhost:4000/auth/google` (302 redirect)
   - Request to `accounts.google.com` (Google login page)
   - Request to `localhost:4000/auth/google/callback` (302 redirect)
   - Request to `localhost:3000?login=success` (back to your app)

5. **Check cookies:**
   - Should see `authToken` cookie with a JWT value
   - HttpOnly: true
   - SameSite: Strict

### 6. Debug Mode

Add console logs to see what's happening:

**In `server/auth/routes.js`, line 16-30:**
```javascript
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        console.log('✅ OAuth Success! User:', req.user); // ADD THIS
        
        const token = generateToken(req.user);
        console.log('✅ Token generated:', token.substring(0, 20) + '...'); // ADD THIS
        
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log('✅ Redirecting to:', process.env.FRONTEND_URL || 'http://localhost:3000'); // ADD THIS
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?login=success`);
    }
);
```

### 7. Quick Checklist

- [ ] `.env` file exists in root directory
- [ ] All required env variables are set (not "your_xxx_here")
- [ ] Google Cloud Console has correct redirect URIs
- [ ] Both frontend (3000) and backend (4000) are running
- [ ] No CORS errors in console
- [ ] JWT_SECRET is set
- [ ] AUTHORIZED_GOOGLE_ID matches your Google account ID

### 8. Still Not Working?

Check the server console for error messages. Common ones:
- "Missing credentials" → Google Client ID/Secret not set
- "Invalid credentials" → Wrong Client ID/Secret
- "Redirect URI mismatch" → Google Console vs .env mismatch
- "Unauthorized Google account" → Wrong Google ID in AUTHORIZED_GOOGLE_ID

### 9. Alternative: Disable Authorization Temporarily

For testing, you can allow ANY Google account by commenting out the check in `server/auth/passport.js`:

```javascript
// TEMPORARY - REMOVE IN PRODUCTION
// if (profile.id !== process.env.AUTHORIZED_GOOGLE_ID) {
//     return done(null, false, { message: 'Unauthorized Google account' });
// }
```

**Remember to re-enable this before deploying to production!**

---

## Need Help?

1. Check the server console for errors
2. Check the browser console for errors
3. Check the Network tab in DevTools
4. Make sure all environment variables are set
5. Restart both servers after changing `.env`




