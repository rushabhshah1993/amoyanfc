import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser } from '../../store/slices/authSlice';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
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

    const handleLogout = () => {
        dispatch(logoutUser()).then(() => {
            window.location.reload();
        });
    };

    return (
        <div className="header">
            <div className="header-content">
                <h1 className="page-title">{title}</h1>
                
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
                                {user.picture && (
                                    <img 
                                        src={user.picture} 
                                        alt={user.name} 
                                        className="user-avatar"
                                    />
                                )}
                                <span className="user-name">
                                    {user.name}
                                </span>
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
