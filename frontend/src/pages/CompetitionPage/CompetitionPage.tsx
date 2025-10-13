import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faArrowLeft, 
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { GET_COMPETITION_META } from '../../services/queries';
import RobustGoogleDriveImage from '../../components/RobustGoogleDriveImage/RobustGoogleDriveImage';
import './CompetitionPage.css';

interface CompetitionMeta {
    id: string;
    competitionName: string;
    type: string;
    logo?: string;
    description?: string;
    shortName?: string;
}

const CompetitionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { loading, error, data } = useQuery(GET_COMPETITION_META, {
        variables: { id },
        skip: !id
    });

    if (loading) {
        return (
            <div className="competition-page">
                <div className="loading">
                    <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
                    Loading competition information...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="competition-page">
                <div className="error">
                    Error: {error.message}
                </div>
            </div>
        );
    }

    if (!data?.getCompetitionMeta) {
        return (
            <div className="competition-page">
                <div className="error">
                    Competition not found
                </div>
            </div>
        );
    }

    const competition: CompetitionMeta = data.getCompetitionMeta;

    return (
        <div className="competition-page">
            <div className="competition-header">
                <button 
                    className="back-button"
                    onClick={() => navigate('/')}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back to Competitions
                </button>
            </div>

            <div className="competition-content">
                <div className="competition-banner">
                    <div className="competition-logo-section">
                        <RobustGoogleDriveImage
                            src={competition.logo}
                            alt={`${competition.competitionName} logo`}
                        />
                    </div>
                    <div className="competition-banner-info">
                        <h1 className="competition-title">
                            {competition.competitionName}
                        </h1>
                        {competition.shortName && (
                            <h2 className="competition-subtitle">
                                {competition.shortName}
                            </h2>
                        )}
                        <div className="competition-type-badge">
                            <FontAwesomeIcon icon={faTrophy} />
                            {competition.type.toUpperCase()}
                        </div>
                    </div>
                </div>

                {competition.description && (
                    <div className="competition-description-section">
                        <p className="competition-description">
                            {competition.description}
                        </p>
                    </div>
                )}

                <div className="coming-soon-section">
                    <div className="coming-soon-card">
                        <FontAwesomeIcon icon={faTrophy} className="coming-soon-icon" />
                        <h2 className="coming-soon-title">Season Information Coming Soon</h2>
                        <p className="coming-soon-text">
                            Detailed season information, fight schedules, standings, and more will be available here soon.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetitionPage;
