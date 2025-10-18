import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser } from '../../store/slices/authSlice';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import S3Image from '../S3Image/S3Image';
import './Header.css';

interface HeaderProps {
    title: string;
    showNavigation?: boolean;
    currentPage?: string;
    onNavigate?: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    title, 
    showNavigation = false, 
    currentPage = 'home',
    onNavigate 
}) => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [imageError, setImageError] = React.useState(false);

    const handleLogout = () => {
        dispatch(logoutUser()).then(() => {
            window.location.reload();
        });
    };

    const getInitials = (name: string): string => {
        if (!name) return '?';
        const names = name.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    return (
        <div className="header">
            <div className="header-content">
                <div className="header-logo-section">
                    <S3Image 
                        src="https://amoyanfc-assets.s3.us-east-1.amazonaws.com/competitions/amoyan-fighting-championship.png"
                        alt="Amoyan Fighting Championship"
                        className="header-logo"
                        height={50}
                        lazy={false}
                    />
                    <div className="header-title-section">
                        <h1 className="page-title">{title}</h1>
                        <p className="page-subtitle">Home of the Champions!</p>
                    </div>
                </div>
                
                {showNavigation && (
                    <nav className="navigation">
                        <button 
                            className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
                            onClick={() => onNavigate?.('home')}
                        >
                            Home
                        </button>
                        <button 
                            className={`nav-button ${currentPage === 'fighters' ? 'active' : ''}`}
                            onClick={() => onNavigate?.('fighters')}
                        >
                            Fighters
                        </button>
                    </nav>
                )}
                
                <div className="header-controls">
                    <ThemeToggle />
                    <div className="user-section">
                        {user && (
                            <div className="user-info">
                                {user.picture && !imageError ? (
                                    <img 
                                        src={user.picture} 
                                        alt={user.name} 
                                        className="user-avatar"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="user-avatar-initials">
                                        {getInitials(user.name)}
                                    </div>
                                )}
                                <div className="user-details">
                                    <span className="user-name">
                                        {user.name}
                                    </span>
                                    <span className="user-email">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        )}
                        <button 
                            onClick={handleLogout}
                            className="logout-button"
                        >
                            <FontAwesomeIcon icon={faSignOutAlt} />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
