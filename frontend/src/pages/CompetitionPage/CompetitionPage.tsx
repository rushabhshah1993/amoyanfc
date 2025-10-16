import React from 'react';
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
import RobustGoogleDriveImage from '../../components/S3Image/S3Image';
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
                            className="competition-logo-image"
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
                        {competition.description && (
                            <div className="competition-description-section">
                                <p className="competition-description">
                                    {competition.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                

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
                                
                                <div className="seasons-grid">
                                    {seasonsData.getAllSeasonsByCompetitionCategory
                                        .slice()
                                        .sort((a: Season, b: Season) => 
                                            b.seasonMeta.seasonNumber - a.seasonMeta.seasonNumber
                                        )
                                        .map((season: Season) => {
                                            const winners = getSeasonWinners(season);

                                            return (
                                                <div 
                                                    key={season.id} 
                                                    className="season-box"
                                                    onClick={() => navigate(`/competition/${id}/season/${season.id}`)}
                                                >
                                                    {/* Background Images */}
                                                    <div className="season-box-background">
                                                        {winners.length > 0 ? (
                                                            winners.map((winner) => (
                                                                <div 
                                                                    key={winner.id} 
                                                                    className="season-box-image"
                                                                    style={{
                                                                        backgroundImage: winner.profileImage 
                                                                            ? `url(${winner.profileImage})`
                                                                            : 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)'
                                                                    }}
                                                                >
                                                                    {!winner.profileImage && (
                                                                        <div className="season-box-placeholder">
                                                                            {winner.firstName.charAt(0)}{winner.lastName.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="season-box-empty">
                                                                <FontAwesomeIcon icon={faTrophy} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Overlay */}
                                                    <div className="season-box-overlay">
                                                        <h3 className="season-box-title">
                                                            Season {season.seasonMeta.seasonNumber}
                                                        </h3>
                                                        {season.isActive && (
                                                            <span className="season-box-badge">Active</span>
                                                        )}
                                                    </div>
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
