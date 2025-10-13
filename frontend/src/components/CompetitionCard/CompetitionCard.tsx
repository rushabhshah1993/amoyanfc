import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCalendarAlt, faUsers, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import RobustGoogleDriveImage from '../RobustGoogleDriveImage/RobustGoogleDriveImage';
import './CompetitionCard.css';

interface Competition {
    id?: string;
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
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);
    const [needsTruncation, setNeedsTruncation] = useState(false);
    const descriptionRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (descriptionRef.current && competition?.description) {
            const element = descriptionRef.current;
            const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
            const maxHeight = lineHeight * 3; // 3 lines
            setNeedsTruncation(element.scrollHeight > maxHeight);
        }
    }, [competition?.description]);

    const toggleExpanded = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleCardClick = () => {
        if (competition?.id) {
            navigate(`/competition/${competition.id}`);
        }
    };

    if (!competition) {
        return (
            <div className="competition-card error-card">
                <FontAwesomeIcon icon={faTrophy} className="error-icon" />
                <span>No competition data</span>
            </div>
        );
    }

    return (
        <div className="competition-card" onClick={handleCardClick}>
            <div className="competition-logo">
                <RobustGoogleDriveImage
                    src={competition.logo}
                    alt={`${competition.competitionName} logo`}
                />
            </div>
            <div className="competition-info">
                <h3 className="competition-name">
                    {competition.competitionName}
                </h3>
                {competition.description && (
                    <div className="description-container">
                        <p 
                            ref={descriptionRef}
                            className={`competition-description ${isExpanded ? 'expanded' : ''}`}
                        >
                            {competition.description}
                            {needsTruncation && (
                                <button 
                                    className="view-more-btn inline"
                                    onClick={toggleExpanded}
                                    type="button"
                                >
                                    {isExpanded ? (
                                        <>
                                            <span> View Less</span>
                                            <FontAwesomeIcon icon={faChevronUp} />
                                        </>
                                    ) : (
                                        <>
                                            <span>... View More</span>
                                            <FontAwesomeIcon icon={faChevronDown} />
                                        </>
                                    )}
                                </button>
                            )}
                        </p>
                    </div>
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

