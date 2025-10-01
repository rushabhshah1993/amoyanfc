import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { gql, FetchPolicy } from '@apollo/client';
import client from '../../services/apolloClient';

// Types
export interface User {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// GraphQL queries
const GET_ME = gql`
    query GetMe {
        me {
            googleId
            email
            name
            picture
        }
    }
`;

const IS_AUTHENTICATED = gql`
    query IsAuthenticated {
        isAuthenticated
    }
`;

const LOGOUT = gql`
    mutation Logout {
        logout {
            success
            message
        }
    }
`;

// Async thunks
export const checkAuthentication = createAsyncThunk<boolean>(
    'auth/checkAuthentication',
    async () => {
        try {
            console.log('Checking authentication...');
            
            // Try Apollo Client first
            try {
                const { data, error } = await client.query({
                    query: IS_AUTHENTICATED,
                    fetchPolicy: 'no-cache',
                    errorPolicy: 'all'
                });
                
                if (error) {
                    console.error('GraphQL error:', error);
                    throw new Error('GraphQL error');
                }
                
                console.log('Authentication check result:', data.isAuthenticated);
                return data.isAuthenticated;
            } catch (apolloError) {
                console.warn('Apollo Client failed, trying direct fetch:', apolloError);
                
                // Fallback to direct fetch
                const response = await fetch('http://localhost:4000/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: 'query { isAuthenticated }'
                    })
                });
                
                const result = await response.json();
                console.log('Direct fetch result:', result);
                
                if (result.errors) {
                    console.error('GraphQL errors:', result.errors);
                    return false;
                }
                
                return result.data.isAuthenticated;
            }
        } catch (error) {
            console.error('Authentication check error:', error);
            return false;
        }
    }
);

export const fetchUserData = createAsyncThunk<User | null>(
    'auth/fetchUserData',
    async () => {
        try {
            console.log('Fetching user data...');
            
            // Try direct fetch first to avoid Apollo Client issues
            const response = await fetch('http://localhost:4000/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    query: 'query { me { googleId email name picture } }'
                })
            });
            
            const result = await response.json();
            console.log('Direct fetch user data result:', result);
            
            if (result.errors) {
                console.error('GraphQL errors in user data fetch:', result.errors);
                return null; // Return null instead of throwing
            }
            
            console.log('User data fetched successfully:', result.data.me);
            return result.data.me;
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            return null; // Return null instead of throwing
        }
    }
);

export const logoutUser = createAsyncThunk<AuthResponse>(
    'auth/logoutUser',
    async () => {
        try {
            const { data } = await client.mutate({
                mutation: LOGOUT
            });
            return data.logout;
        } catch (error) {
            throw error;
        }
    }
);

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setUser: (state, action: PayloadAction<User | null>) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            // Check Authentication
            .addCase(checkAuthentication.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(checkAuthentication.fulfilled, (state, action) => {
                console.log('Redux: checkAuthentication.fulfilled with payload:', action.payload);
                state.isAuthenticated = action.payload;
                state.isLoading = false;
                console.log('Redux: Updated state - isAuthenticated:', state.isAuthenticated, 'isLoading:', state.isLoading);
            })
            .addCase(checkAuthentication.rejected, (state, action) => {
                state.isAuthenticated = false;
                state.isLoading = false;
                state.error = action.error.message || 'Authentication check failed';
            })
            // Fetch User Data
            .addCase(fetchUserData.pending, (state) => {
                console.log('Redux: fetchUserData.pending');
                state.isLoading = true;
            })
            .addCase(fetchUserData.fulfilled, (state, action) => {
                console.log('Redux: fetchUserData.fulfilled with payload:', action.payload);
                if (action.payload) {
                    state.user = action.payload;
                }
                // Don't change authentication state based on user data fetch
                state.isLoading = false;
                console.log('Redux: Updated state after fetchUserData - isAuthenticated:', state.isAuthenticated, 'user:', state.user);
            })
            .addCase(fetchUserData.rejected, (state, action) => {
                console.log('Redux: fetchUserData.rejected with error:', action.error.message);
                // Don't reset authentication state if user data fetch fails
                // state.user = null;
                // state.isAuthenticated = false;
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch user data';
                console.log('Redux: fetchUserData failed but keeping authentication state');
            })
            // Logout
            .addCase(logoutUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.isAuthenticated = false;
                state.isLoading = false;
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Logout failed';
            });
    }
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
