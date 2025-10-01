import React, { useEffect, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { checkAuthentication, fetchUserData } from '../../store/slices/authSlice';
import LoginPage from '../../pages/LoginPage/LoginPage';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const dispatch = useAppDispatch();
    const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);
    
    console.log('ProtectedRoute render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);

    useEffect(() => {
        const initializeAuth = async () => {
            // Check if we're returning from OAuth callback
            const urlParams = new URLSearchParams(window.location.search);
            const loginSuccess = urlParams.get('login');
            
            if (loginSuccess === 'success') {
                // Clear the URL parameter
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log('OAuth callback detected, checking authentication...');
            }
            
            const isAuth = await dispatch(checkAuthentication()).unwrap();
            if (isAuth && !user) {
                // Try to fetch user data, but don't let it affect authentication status
                try {
                    await dispatch(fetchUserData()).unwrap();
                } catch (error) {
                    console.warn('Failed to fetch user data, but user is still authenticated:', error);
                    // Don't change authentication state if user data fetch fails
                }
            }
        };
        
        initializeAuth();
    }, [dispatch, user]);

    if (isLoading) {
        return (
            <div className="loading-container">
                <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
                <span className="loading-text">Loading...</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
