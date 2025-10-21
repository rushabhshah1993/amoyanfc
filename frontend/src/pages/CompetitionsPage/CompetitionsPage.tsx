import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@apollo/client';
import { GET_COMPETITIONS } from '../../services/queries';
import CompetitionCard from '../../components/CompetitionCard/CompetitionCard';
import './CompetitionsPage.css';

interface Competition {
    id?: string;
    competitionName: string;
    description?: string;
    logo?: string;
    shortName?: string;
    type?: string;
}

const CompetitionsPage: React.FC = () => {
    const { loading, error, data } = useQuery(GET_COMPETITIONS);

    useEffect(() => {
        document.title = 'Amoyan FC | Competitions';
    }, []);

    if (loading) return (
        <div className="loading">
            <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
            Loading competitions...
        </div>
    );
    
    if (error) return <div className="error">Error: {error.message}</div>;

    const competitions: Competition[] = data?.getAllCompetitionsMeta || [];

    return (
        <div className="competitions-page">
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

export default CompetitionsPage;

