import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faChevronLeft,
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { GET_SEASON_DETAILS } from '../../services/queries';
import SeasonRanking from '../../components/SeasonRanking';
import styles from './LeagueSeasonPage.module.css';

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

    // Scroll to top when component loads
    React.useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [seasonId]);

    // Update page title when season data is loaded
    React.useEffect(() => {
        if (data?.getCompetitionSeason) {
            const season = data.getCompetitionSeason;
            document.title = `Amoyan FC | Season ${season.seasonMeta.seasonNumber}`;
        }
    }, [data]);

    if (loading) {
        return (
            <div className={styles.leagueSeasonPage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                    Loading season details...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.leagueSeasonPage}>
                <div className={styles.error}>
                    Error: {error.message}
                </div>
            </div>
        );
    }

    if (!data?.getCompetitionSeason) {
        return (
            <div className={styles.leagueSeasonPage}>
                <div className={styles.error}>
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
        <div className={styles.leagueSeasonPage}>
            <div className={styles.leagueSeasonContent}>
                <div className={styles.seasonHeaderInfo}>
                    <h1 className={styles.seasonTitle}>
                        Season {season.seasonMeta.seasonNumber}
                        {season.isActive && <span className={styles.activeIndicator}>Active</span>}
                    </h1>
                    <button 
                        className={styles.backButton}
                        onClick={() => navigate(`/competition/${competitionId}`)}
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                        Back to Competition
                    </button>
                </div>

                <div className={styles.divisionsSection}>
                    <div className={styles.divisionCardsGrid}>
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
                                    className={styles.divisionDetailCard}
                                    onClick={() => navigate(`/competition/${competitionId}/season/${seasonId}/division/${division.meta.divisionNumber}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.divisionDetailLeft}>
                                        {winner ? (
                                            <div className={styles.winnerLargeImage}>
                                                {winner.profileImage ? (
                                                    <img 
                                                        src={winner.profileImage} 
                                                        alt={`${winner.firstName} ${winner.lastName}`}
                                                    />
                                                ) : (
                                                    <div className={styles.winnerLargePlaceholder}>
                                                        {winner.firstName.charAt(0)}{winner.lastName.charAt(0)}
                                                    </div>
                                                )}
                                                <div className={styles.winnerOverlay}>
                                                    <p className={styles.winnerLabel}>
                                                        {season.isActive ? 'Leader' : 'Winner'}
                                                    </p>
                                                    <p className={styles.winnerName}>
                                                        {winner.firstName} {winner.lastName}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.noWinnerPlaceholder}>
                                                <FontAwesomeIcon icon={faTrophy} />
                                                <p>Season in Progress</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.divisionDetailRight}>
                                        <div className={styles.divisionDetailHeader}>
                                            <h2 className={styles.divisionDetailTitle}>
                                                {hasDivisions 
                                                    ? (division.data?.divisionName || `Division ${division.meta.divisionNumber}`)
                                                    : 'League Standings'
                                                }
                                            </h2>
                                            {division.data && season.isActive && (
                                                <p className={styles.divisionRoundInfo}>
                                                    Round {division.data.currentRound} of {division.data.totalRounds}
                                                </p>
                                            )}
                                        </div>

                                        <div className={styles.participantsSection}>
                                            <h3 className={styles.participantsTitle}>Other Fighters</h3>
                                            <div className={styles.participantsThumbnails}>
                                                {remainingFighters.map((fighter) => (
                                                    <div 
                                                        key={fighter.id}
                                                        className={styles.participantThumbnail}
                                                        title={`${fighter.firstName} ${fighter.lastName}`}
                                                    >
                                                        {fighter.profileImage ? (
                                                            <img 
                                                                src={fighter.profileImage} 
                                                                alt={`${fighter.firstName} ${fighter.lastName}`}
                                                            />
                                                        ) : (
                                                            <div className={styles.participantThumbnailPlaceholder}>
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

                {/* Season Rankings */}
                <div className={styles.timelineSection}>
                    <SeasonRanking season={season} competitionId={competitionId!} />
                </div>
            </div>
        </div>
    );
};

export default LeagueSeasonPage;

