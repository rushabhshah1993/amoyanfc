import React from 'react';
import GoogleLoginButton from '../../components/GoogleLoginButton/GoogleLoginButton';
import './LoginPage.css';

const LoginPage: React.FC = () => {
    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h1 className="login-title">
                        Amoyan Fighting Championship
                    </h1>
                    <p className="login-description">
                        Please sign in with your Google account to access Amoyan Fighting Championship.
                    </p>
                </div>
                
                <GoogleLoginButton />
                
                <p className="login-footer">
                    Only authorized Google accounts can access this system.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
