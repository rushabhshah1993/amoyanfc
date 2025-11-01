import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faUserPlus, faTrophy, faChevronDown } from '@fortawesome/free-solid-svg-icons';
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
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const [imageError, setImageError] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        dispatch(logoutUser()).then(() => {
            window.location.reload();
        });
    };

    const handleCreateFighter = () => {
        navigate('/fighters/create');
        setDropdownOpen(false);
    };

    const handleCreateSeason = () => {
        navigate('/competitions/create-season');
        setDropdownOpen(false);
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const getInitials = (name: string): string => {
        if (!name) return '?';
        const names = name.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                            className={`nav-button ${currentPage === 'competitions' ? 'active' : ''}`}
                            onClick={() => onNavigate?.('competitions')}
                        >
                            Competitions
                        </button>
                        <button 
                            className={`nav-button ${currentPage === 'fighters' ? 'active' : ''}`}
                            onClick={() => onNavigate?.('fighters')}
                        >
                            Fighters
                        </button>
                        <button 
                            className={`nav-button ${currentPage === 'articles' ? 'active' : ''}`}
                            onClick={() => onNavigate?.('articles')}
                        >
                            Articles
                        </button>
                    </nav>
                )}
                
                <div className="header-controls">
                    <ThemeToggle />
                    <div className="user-section" ref={dropdownRef}>
                        {user && (
                            <div className="user-dropdown">
                                <div className="user-info" onClick={toggleDropdown}>
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
                                    <FontAwesomeIcon 
                                        icon={faChevronDown} 
                                        className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`}
                                    />
                                </div>
                                {dropdownOpen && (
                                    <div className="dropdown-menu">
                                        <button 
                                            onClick={handleCreateFighter}
                                            className="dropdown-item"
                                        >
                                            <FontAwesomeIcon icon={faUserPlus} />
                                            <span>Create Fighter</span>
                                        </button>
                                        <button 
                                            onClick={handleCreateSeason}
                                            className="dropdown-item"
                                        >
                                            <FontAwesomeIcon icon={faTrophy} />
                                            <span>Create Season</span>
                                        </button>
                                        <div className="dropdown-divider" />
                                        <button 
                                            onClick={handleLogout}
                                            className="dropdown-item logout-item"
                                        >
                                            <FontAwesomeIcon icon={faSignOutAlt} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
