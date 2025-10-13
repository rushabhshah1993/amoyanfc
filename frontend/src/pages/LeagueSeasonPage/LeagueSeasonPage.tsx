import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faArrowLeft,
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { GET_SEASON_DETAILS } from '../../services/queries';
import './LeagueSeasonPage.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface LeagueDivisionMeta {
    divisionNumber: number;
    fighters: Fighter[];
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

const LeagueSeasonPage: React.FC = () => {
    const { competitionId, seasonId } = useParams<{ competitionId: string; seasonId: string }>();
    const navigate = useNavigate();

    const { loading, error, data } = useQuery(GET_SEASON_DETAILS, {
        variables: { id: seasonId },
        skip: !seasonId
    });

    if (loading) {
        return (
            <div className="league-season-page">
                <div className="loading">
                    <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
                    Loading season details...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="league-season-page">
                <div className="error">
                    Error: {error.message}
                </div>
            </div>
        );
    }

    if (!data?.getCompetitionSeason) {
        return (
            <div className="league-season-page">
                <div className="error">
                    Season not found
                </div>
            </div>
        );
    }

    const season: Season = data.getCompetitionSeason;
    
    // Determine if we have divisions
    const hasDivisions = season.seasonMeta.leagueDivisions && 
                         season.seasonMeta.leagueDivisions.length > 0;

    // Get division data
    const divisions = hasDivisions 
        ? season.seasonMeta.leagueDivisions!.map(divMeta => {
            const divData = season.leagueData?.divisions?.find(
                d => d.divisionNumber === divMeta.divisionNumber
            );
            return {
                meta: divMeta,
                data: divData
            };
        })
        : [{
            meta: {
                divisionNumber: 0,
                fighters: season.seasonMeta.leagueDivisions?.[0]?.fighters || [],
                winners: season.seasonMeta.winners
            },
            data: undefined
        }];

    return (
        <div className="league-season-page">
            <div className="league-season-header">
                <button 
                    className="back-button"
                    onClick={() => navigate(`/competition/${competitionId}`)}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back to Competition
                </button>
            </div>

            <div className="league-season-content">
                <div className="season-header-info">
                    <h1 className="season-title">
                        Season {season.seasonMeta.seasonNumber}
                        {season.isActive && <span className="active-indicator">Active</span>}
                    </h1>
                </div>

                <div className="divisions-section">
                    <div className="division-cards-grid">
                        {divisions.map((division) => {
                            const winner = season.isActive 
                                ? null // TODO: Calculate current leader
                                : division.meta.winners?.[0];
                            
                            // Get remaining participants (exclude winner)
                            const remainingFighters = division.meta.fighters.filter(
                                f => !division.meta.winners?.some(w => w.id === f.id)
                            );

                            return (
                                <div 
                                    key={division.meta.divisionNumber}
                                    className="division-detail-card"
                                >
                                    <div className="division-detail-left">
                                        {winner ? (
                                            <div className="winner-large-image">
                                                {winner.profileImage ? (
                                                    <img 
                                                        src={winner.profileImage} 
                                                        alt={`${winner.firstName} ${winner.lastName}`}
                                                    />
                                                ) : (
                                                    <div className="winner-large-placeholder">
                                                        {winner.firstName.charAt(0)}{winner.lastName.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="winner-overlay">
                                                    <p className="winner-label">
                                                        {season.isActive ? 'Leader' : 'Winner'}
                                                    </p>
                                                    <p className="winner-name">
                                                        {winner.firstName} {winner.lastName}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="no-winner-placeholder">
                                                <FontAwesomeIcon icon={faTrophy} />
                                                <p>Season in Progress</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="division-detail-right">
                                        <div className="division-detail-header">
                                            <h2 className="division-detail-title">
                                                {hasDivisions 
                                                    ? (division.data?.divisionName || `Division ${division.meta.divisionNumber}`)
                                                    : 'League Standings'
                                                }
                                            </h2>
                                            {division.data && season.isActive && (
                                                <p className="division-round-info">
                                                    Round {division.data.currentRound} of {division.data.totalRounds}
                                                </p>
                                            )}
                                        </div>

                                        <div className="participants-section">
                                            <h3 className="participants-title">Other Fighters</h3>
                                            <div className="participants-thumbnails">
                                                {remainingFighters.map((fighter) => (
                                                    <div 
                                                        key={fighter.id}
                                                        className="participant-thumbnail"
                                                        title={`${fighter.firstName} ${fighter.lastName}`}
                                                    >
                                                        {fighter.profileImage ? (
                                                            <img 
                                                                src={fighter.profileImage} 
                                                                alt={`${fighter.firstName} ${fighter.lastName}`}
                                                            />
                                                        ) : (
                                                            <div className="participant-thumbnail-placeholder">
                                                                {fighter.firstName.charAt(0)}{fighter.lastName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Empty section for future timeline and other data */}
                <div className="timeline-section">
                    <div className="coming-soon-placeholder">
                        <p>Timeline and additional details coming soon...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeagueSeasonPage;

