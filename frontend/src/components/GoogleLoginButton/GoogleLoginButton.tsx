import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import './GoogleLoginButton.css';

interface GoogleLoginButtonProps {
    onLogin?: () => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onLogin }) => {
    const handleGoogleLogin = () => {
        // Redirect to Google OAuth endpoint
        window.location.href = 'http://localhost:4000/auth/google';
    };

    return (
        <div className="google-login-container">
            <button 
                onClick={handleGoogleLogin}
                className="google-login-button"
            >
                <FontAwesomeIcon icon={faGoogle} className="google-icon" />
                Sign in with Google
            </button>
        </div>
    );
};

export default GoogleLoginButton;
