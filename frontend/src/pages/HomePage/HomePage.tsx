import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faSpinner, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@apollo/client';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser } from '../../store/slices/authSlice';
import { GET_COMPETITIONS } from '../../services/queries';
import CompetitionCard from '../../components/CompetitionCard/CompetitionCard';
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle';
import './HomePage.css';

interface Competition {
    id?: string;
    competitionName: string;
    description?: string;
    logo?: string;
    shortName?: string;
    type?: string;
}

const HomePage: React.FC = () => {
    const { loading, error, data } = useQuery(GET_COMPETITIONS);
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    const handleLogout = () => {
        dispatch(logoutUser()).then(() => {
            window.location.reload();
        });
    };

    if (loading) return (
        <div className="loading">
            <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
            Loading competitions...
        </div>
    );
    
    if (error) return <div className="error">Error: {error.message}</div>;

    const competitions: Competition[] = data?.getAllCompetitionsMeta || [];

    return (
        <div className="home-page">
            <div className="header">
                <div className="header-content">
                    <h1 className="page-title">Amoyan Fighting Championship</h1>
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
            
            <div className="competitions-section">
                {competitions.length === 0 ? (
                    <div className="no-competitions">
                        <FontAwesomeIcon icon={faTrophy} className="no-competitions-icon" />
                        No competitions found.
                    </div>
                ) : (
                    <div className="competition-grid">
                        {competitions.map((competition, index) => (
                            <CompetitionCard 
                                key={competition.id || `competition-${index}`} 
                                competition={competition} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
