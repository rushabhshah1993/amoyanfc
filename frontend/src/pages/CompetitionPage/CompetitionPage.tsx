import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faArrowLeft, 
    faTrophy,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { GET_COMPETITION_META, GET_ALL_SEASONS_BY_COMPETITION } from '../../services/queries';
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

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface LeagueDivisionMeta {
    divisionNumber: number;
    fighters: { id: string }[];
    winners?: Fighter[];
}

interface Division {
    divisionNumber: number;
    divisionName?: string;
    currentRound?: number;
    totalRounds?: number;
}

interface SeasonMeta {
    seasonNumber: number;
    startDate?: string;
    endDate?: string;
    winners?: Fighter[];
    leagueDivisions?: LeagueDivisionMeta[];
}

interface LeagueData {
    divisions?: Division[];
}

interface Season {
    id: string;
    isActive: boolean;
    seasonMeta: SeasonMeta;
    leagueData?: LeagueData;
}

const CompetitionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
    
    const { loading, error, data } = useQuery(GET_COMPETITION_META, {
        variables: { id },
        skip: !id
    });

    const { 
        loading: seasonsLoading, 
        error: seasonsError, 
        data: seasonsData 
    } = useQuery(GET_ALL_SEASONS_BY_COMPETITION, {
        variables: { competitionMetaId: id },
        skip: !id || !data?.getCompetitionMeta || data?.getCompetitionMeta?.type !== 'league'
    });

    // Helper function to get all winners for a season
    const getSeasonWinners = (season: Season): Fighter[] => {
        const winners: Fighter[] = [];
        
        // If season has divisions, collect winners from each division
        if (season.seasonMeta.leagueDivisions && season.seasonMeta.leagueDivisions.length > 0) {
            season.seasonMeta.leagueDivisions.forEach(division => {
                if (division.winners && division.winners.length > 0) {
                    winners.push(...division.winners);
                }
            });
        } else if (season.seasonMeta.winners && season.seasonMeta.winners.length > 0) {
            // Otherwise use season-level winners (for leagues without divisions or cups)
            winners.push(...season.seasonMeta.winners);
        }
        
        return winners;
    };

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

                {/* League Seasons Section */}
                {competition.type === 'league' && (
                    <>
                        {seasonsLoading ? (
                            <div className="seasons-loading">
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <span>Loading seasons...</span>
                            </div>
                        ) : seasonsError || !seasonsData?.getAllSeasonsByCompetitionCategory?.length ? (
                            <div className="coming-soon-section">
                                <div className="coming-soon-card">
                                    <FontAwesomeIcon icon={faTrophy} className="coming-soon-icon" />
                                    <h2 className="coming-soon-title">Season Information Coming Soon</h2>
                                    <p className="coming-soon-text">
                                        Detailed season information, fight schedules, standings, and more will be available here soon.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="seasons-section">
                                <h2 className="seasons-title">Seasons</h2>
                                
                                <div className="seasons-list">
                                    {seasonsData.getAllSeasonsByCompetitionCategory
                                        .slice()
                                        .sort((a: Season, b: Season) => 
                                            b.seasonMeta.seasonNumber - a.seasonMeta.seasonNumber
                                        )
                                        .map((season: Season) => {
                                            const winners = getSeasonWinners(season);
                                            const isExpanded = selectedSeason?.id === season.id;

                                            return (
                                                <div key={season.id} className="season-item">
                                                    <div 
                                                        className="season-card"
                                                        onClick={() => setSelectedSeason(isExpanded ? null : season)}
                                                    >
                                                        <div className="season-card-left">
                                                            <h3 className="season-number">
                                                                Season {season.seasonMeta.seasonNumber}
                                                            </h3>
                                                            {season.isActive && (
                                                                <span className="active-badge">Active</span>
                                                            )}
                                                        </div>

                                                        <div className="season-card-right">
                                                            {winners.length > 0 && (
                                                                <div className="winners-thumbnails">
                                                                    {winners.map((winner, index) => (
                                                                        <div 
                                                                            key={winner.id} 
                                                                            className="winner-thumbnail"
                                                                            style={{ zIndex: winners.length - index }}
                                                                        >
                                                                            {winner.profileImage ? (
                                                                                <img 
                                                                                    src={winner.profileImage} 
                                                                                    alt={`${winner.firstName} ${winner.lastName}`}
                                                                                />
                                                                            ) : (
                                                                                <div className="winner-thumbnail-placeholder">
                                                                                    {winner.firstName.charAt(0)}{winner.lastName.charAt(0)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <FontAwesomeIcon 
                                                                icon={faArrowRight} 
                                                                className="season-arrow"
                                                            />
                                                        </div>
                                                    </div>

                                                    {isExpanded && season.seasonMeta.leagueDivisions && 
                                                     season.seasonMeta.leagueDivisions.length > 0 && (
                                                        <div className="season-content">
                                                            <div className="divisions-grid">
                                                                {season.seasonMeta.leagueDivisions.map((divisionMeta) => {
                                                                    const divisionData = season.leagueData?.divisions?.find(
                                                                        d => d.divisionNumber === divisionMeta.divisionNumber
                                                                    );
                                                                    
                                                                    // Get winner or leader
                                                                    const displayFighter = season.isActive 
                                                                        ? null // TODO: Calculate current leader from standings
                                                                        : divisionMeta.winners?.[0];

                                                                    return (
                                                                        <div 
                                                                            key={divisionMeta.divisionNumber}
                                                                            className="division-card"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/competition/${id}/season/${season.id}/division/${divisionMeta.divisionNumber}`);
                                                                            }}
                                                                        >
                                                                            <div className="division-header">
                                                                                <h3 className="division-title">
                                                                                    Division {divisionMeta.divisionNumber}
                                                                                </h3>
                                                                                {divisionData?.divisionName && 
                                                                                 divisionData.divisionName !== `Division ${divisionMeta.divisionNumber}` && (
                                                                                    <p className="division-name">{divisionData.divisionName}</p>
                                                                                )}
                                                                            </div>

                                                                            {displayFighter && (
                                                                                <div className="division-winner">
                                                                                    <div className="fighter-avatar">
                                                                                        {displayFighter.profileImage ? (
                                                                                            <img 
                                                                                                src={displayFighter.profileImage} 
                                                                                                alt={`${displayFighter.firstName} ${displayFighter.lastName}`}
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="fighter-avatar-placeholder">
                                                                                                {displayFighter.firstName.charAt(0)}{displayFighter.lastName.charAt(0)}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="fighter-info">
                                                                                        <p className="fighter-label">
                                                                                            {season.isActive ? 'Current Leader' : 'Winner'}
                                                                                        </p>
                                                                                        <p className="fighter-name">
                                                                                            {displayFighter.firstName} {displayFighter.lastName}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {season.isActive && divisionData?.currentRound && (
                                                                                <div className="division-progress">
                                                                                    <p className="current-round">
                                                                                        Round {divisionData.currentRound} of {divisionData.totalRounds}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            <div className="division-footer">
                                                                                <p className="fighters-count">
                                                                                    {divisionMeta.fighters.length} Fighters
                                                                                </p>
                                                                                <span className="view-details">View Details →</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Cup Competitions Coming Soon */}
                {competition.type === 'cup' && (
                    <div className="coming-soon-section">
                        <div className="coming-soon-card">
                            <FontAwesomeIcon icon={faTrophy} className="coming-soon-icon" />
                            <h2 className="coming-soon-title">Season Information Coming Soon</h2>
                            <p className="coming-soon-text">
                                Detailed season information, fight schedules, standings, and more will be available here soon.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompetitionPage;
