import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCalendarAlt, faUsers } from '@fortawesome/free-solid-svg-icons';
import RobustGoogleDriveImage from '../RobustGoogleDriveImage/RobustGoogleDriveImage';
import './CompetitionCard.css';

interface Competition {
    _id?: string;
    competitionName: string;
    description?: string;
    logo?: string;
    startDate?: string;
    participants?: number;
}

interface CompetitionCardProps {
    competition: Competition | null;
}

const CompetitionCard: React.FC<CompetitionCardProps> = ({ competition }) => {
    if (!competition) {
        return (
            <div className="competition-card error-card">
                <FontAwesomeIcon icon={faTrophy} className="error-icon" />
                <span>No competition data</span>
            </div>
        );
    }

    return (
        <div className="competition-card">
            <div className="competition-logo">
                <RobustGoogleDriveImage
                    src={competition.logo}
                    alt={`${competition.competitionName} logo`}
                />
            </div>
            <div className="competition-info">
                <h3 className="competition-name">
                    <FontAwesomeIcon icon={faTrophy} className="competition-icon" />
                    {competition.competitionName}
                </h3>
                {competition.description && (
                    <p className="competition-description">
                        {competition.description}
                    </p>
                )}
                <div className="competition-meta">
                    {competition.startDate && (
                        <div className="meta-item">
                            <FontAwesomeIcon icon={faCalendarAlt} />
                            <span>{new Date(competition.startDate).toLocaleDateString()}</span>
                        </div>
                    )}
                    {competition.participants && (
                        <div className="meta-item">
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{competition.participants} participants</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompetitionCard;

