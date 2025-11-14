# Google Authentication Fix - Environment Variable Configuration

## Problem
Google authentication was failing when running `yarn dev` (production mode) or on other machines because the frontend had **hardcoded `localhost:4000` URLs** that didn't work outside of localhost environments.

## What Was Fixed

### Files Updated
1. **frontend/src/components/GoogleLoginButton/GoogleLoginButton.tsx**
   - Changed hardcoded `http://localhost:4000/auth/google` to use `REACT_APP_BACKEND_URL` environment variable

2. **frontend/src/store/slices/authSlice.ts**
   - Updated authentication check and user data fetch to use `REACT_APP_API_URL` instead of hardcoded URLs

3. **frontend/src/pages/CreateArticlePage/CreateArticlePage.tsx**
   - Fixed media upload endpoints to use `REACT_APP_BACKEND_URL`

4. **frontend/src/pages/VersusPage/VersusPage.tsx**
   - Fixed GraphQL endpoint to use `REACT_APP_API_URL`

5. **server/nodemon.json** (NEW FILE)
   - Created nodemon configuration to properly load `.env` file
   - This fixes the issue where environment variables weren't being loaded when starting the server via `yarn dev`

6. **.env** (root directory)
   - Added missing `REACT_APP_BACKEND_URL` variable

## Required Environment Variables

### For Development (`.env` file in root directory)

```env
# Database Configuration
MONGODB_URI=mongodb+srv://your-connection-string

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend Configuration
REACT_APP_API_URL=http://localhost:4000/graphql
REACT_APP_BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
AUTHORIZED_GOOGLE_ID=your_authorized_google_user_id_here
JWT_SECRET=your_jwt_secret_key_here

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=amoyanfc-assets
CLOUDFRONT_DOMAIN=https://your-cloudfront-domain.cloudfront.net

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

### For Production (`.env` file for production deployment)

```env
# Database Configuration
MONGODB_URI=mongodb+srv://your-production-connection-string

# Server Configuration
PORT=4000
NODE_ENV=production

# Frontend Configuration
REACT_APP_API_URL=https://your-domain.com/graphql
REACT_APP_BACKEND_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
AUTHORIZED_GOOGLE_ID=your_authorized_google_user_id_here
JWT_SECRET=your_jwt_secret_key_here

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=amoyanfc-assets
CLOUDFRONT_DOMAIN=https://your-cloudfront-domain.cloudfront.net

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## Critical Environment Variables for Google Auth

These are the **MUST HAVE** variables for Google authentication to work:

1. **REACT_APP_BACKEND_URL** - The base URL of your backend server
   - Development: `http://localhost:4000`
   - Production: `https://your-domain.com`

2. **REACT_APP_API_URL** - The GraphQL endpoint
   - Development: `http://localhost:4000/graphql`
   - Production: `https://your-domain.com/graphql`

3. **GOOGLE_CLIENT_ID** - Get from Google Cloud Console
4. **GOOGLE_CLIENT_SECRET** - Get from Google Cloud Console
5. **GOOGLE_REDIRECT_URI** - Must match what's configured in Google Cloud Console
   - Development: `http://localhost:4000/auth/google/callback`
   - Production: `https://your-domain.com/auth/google/callback`

6. **FRONTEND_URL** - Where to redirect after successful login
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`

7. **AUTHORIZED_GOOGLE_ID** - Your Google account ID (see below how to get it)
8. **JWT_SECRET** - A secure random string for JWT token signing

## Getting Your Google User ID

If you don't know your `AUTHORIZED_GOOGLE_ID`:

1. Temporarily disable the authorization check in `server/auth/passport.js` (lines 14-16):
   ```javascript
   // TEMPORARY - Comment this out to get your Google ID
   // if (profile.id !== process.env.AUTHORIZED_GOOGLE_ID) {
   //     return done(null, false, { message: 'Unauthorized Google account' });
   // }
   ```

2. Add a console log to see the profile:
   ```javascript
   console.log('Google Profile ID:', profile.id); // ADD THIS LINE
   ```

3. Try logging in with Google
4. Check your server console for the logged Google ID
5. Copy that ID to your `.env` file as `AUTHORIZED_GOOGLE_ID`
6. Uncomment the authorization check
7. Restart the server

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Enable "Google+ API" or "Google Identity Services"
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**

### For Development:
- **Authorized JavaScript origins:**
  - `http://localhost:3000`
  - `http://localhost:4000`
- **Authorized redirect URIs:**
  - `http://localhost:4000/auth/google/callback`

### For Production:
- **Authorized JavaScript origins:**
  - `https://your-domain.com`
- **Authorized redirect URIs:**
  - `https://your-domain.com/auth/google/callback`

## Testing on Other Machines

When running on a different machine:

1. **Copy your `.env` file** to the new machine (in the project root)
2. Make sure all environment variables are set correctly
3. If using a different hostname/IP, update:
   - `REACT_APP_BACKEND_URL`
   - `REACT_APP_API_URL`
   - `FRONTEND_URL`
   - `GOOGLE_REDIRECT_URI`
4. Update Google Cloud Console to include the new redirect URI

## Important Notes

1. **After changing `.env` file, you MUST restart both servers:**
   ```bash
   # Stop the servers (Ctrl+C)
   # Then restart
   yarn dev
   ```

2. **The frontend needs to be rebuilt** if you change `REACT_APP_*` variables in production:
   ```bash
   cd frontend
   npm run build
   ```

3. **Environment variables starting with `REACT_APP_`** are embedded into the frontend build at build time, not runtime.

4. **For production builds**, make sure to build with the correct environment variables set.

## Troubleshooting

### "This site can't be reached" - localhost:4000 not responding

**Cause:** Backend server is not running or failed to start

**Solution:**
1. Check if the server is running: `lsof -ti:4000`
2. Make sure `server/nodemon.json` exists (it should have been created with the fix)
3. Verify `.env` file has all required variables
4. Check server console for startup errors
5. Make sure you have `REACT_APP_BACKEND_URL` in your `.env` file

### "Blank page" after clicking "Sign in with Google"

**Possible causes:**
1. `GOOGLE_REDIRECT_URI` in `.env` doesn't match Google Cloud Console
2. `REACT_APP_BACKEND_URL` is not set or incorrect
3. Google Cloud Console doesn't have the redirect URI configured
4. CORS issues (check browser console for errors)

**Solution:**
1. Check browser Network tab to see where the redirect is going
2. Verify all environment variables are set correctly
3. Check Google Cloud Console redirect URIs
4. Restart both servers after changing `.env`

### "OAuth2Strategy requires a clientID option" error

**Cause:** Environment variables are not being loaded by the server

**Solution:**
1. Make sure `server/nodemon.json` exists with the correct configuration
2. Delete `node_modules` in server directory and reinstall: `cd server && rm -rf node_modules && npm install`
3. Verify your `.env` file has `GOOGLE_CLIENT_ID` set to a real value (not a placeholder)

### "Unauthorized Google account" error

**Cause:** Your Google account ID doesn't match `AUTHORIZED_GOOGLE_ID`

**Solution:** Follow the "Getting Your Google User ID" section above

### Authentication works locally but not on other machines

**Cause:** Hardcoded URLs (now fixed) or missing/incorrect environment variables

**Solution:**
1. Ensure `.env` file exists on the new machine
2. Update URLs to match the new machine's hostname/IP
3. Update Google Cloud Console with new redirect URIs

## Summary

The fix ensures that all backend URLs are now configurable via environment variables instead of being hardcoded. This allows the app to work correctly in any environment (development, staging, production) or on any machine, as long as the `.env` file is properly configured.

**Key Takeaway:** Always set `REACT_APP_BACKEND_URL` and `REACT_APP_API_URL` in your `.env` file to match your actual backend server URL.

