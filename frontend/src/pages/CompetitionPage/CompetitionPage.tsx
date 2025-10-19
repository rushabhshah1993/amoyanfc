import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faChevronLeft, 
    faTrophy,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { GET_COMPETITION_META, GET_ALL_SEASONS_BY_COMPETITION } from '../../services/queries';
import RobustGoogleDriveImage from '../../components/S3Image/S3Image';
import styles from './CompetitionPage.module.css';

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

    // Update page title when competition data is loaded
    React.useEffect(() => {
        if (data?.getCompetitionMeta) {
            document.title = `Amoyan FC | ${data.getCompetitionMeta.competitionName}`;
        }
    }, [data]);

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
            <div className={styles.competitionPage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                    Loading competition information...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.competitionPage}>
                <div className={styles.error}>
                    Error: {error.message}
                </div>
            </div>
        );
    }

    if (!data?.getCompetitionMeta) {
        return (
            <div className={styles.competitionPage}>
                <div className={styles.error}>
                    Competition not found
                </div>
            </div>
        );
    }

    const competition: CompetitionMeta = data.getCompetitionMeta;

    return (
        <div className={styles.competitionPage}>
            <div className={styles.competitionContent}>
                {/* Hero Section */}
                <div className={styles.competitionHero}>
                    <div className={styles.competitionLogoSection}>
                        <RobustGoogleDriveImage
                            src={competition.logo}
                            alt={`${competition.competitionName} logo`}
                        />
                    </div>
                    
                    <div className={styles.competitionInfo}>
                        <h1 className={styles.competitionTitle}>
                            {competition.competitionName}
                        </h1>
                        {competition.shortName && (
                            <h2 className={styles.competitionSubtitle}>
                                {competition.shortName}
                            </h2>
                        )}
                        {competition.description && (
                            <p className={styles.competitionDescription}>
                                {competition.description}
                            </p>
                        )}
                        
                        <button 
                            className={styles.backButton}
                            onClick={() => navigate('/')}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} />
                            All Competitions
                        </button>
                    </div>
                </div>

                {/* League Seasons Section */}
                {competition.type === 'league' && (
                    <>
                        {seasonsLoading ? (
                            <div className={styles.seasonsLoading}>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <span>Loading seasons...</span>
                            </div>
                        ) : seasonsError || !seasonsData?.getAllSeasonsByCompetitionCategory?.length ? (
                            <div className={styles.comingSoonSection}>
                                <FontAwesomeIcon icon={faTrophy} className={styles.comingSoonIcon} />
                                <h2 className={styles.comingSoonTitle}>Season Information Coming Soon</h2>
                                <p className={styles.comingSoonText}>
                                    Detailed season information will be available here soon.
                                </p>
                            </div>
                        ) : (
                            <div className={styles.seasonsSection}>
                                <h2 className={styles.seasonsTitle}>Seasons</h2>
                                
                                <div className={styles.seasonsGrid}>
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
                                                    className={styles.seasonBox}
                                                    onClick={() => navigate(`/competition/${id}/season/${season.id}`)}
                                                >
                                                    {/* Background Images */}
                                                    <div className={`${styles.seasonBoxBackground} ${winners.length === 1 ? styles.singleWinner : ''}`}>
                                                        {winners.length > 0 ? (
                                                            winners.map((winner) => (
                                                                <div 
                                                                    key={winner.id} 
                                                                    className={styles.seasonBoxImage}
                                                                    style={{
                                                                        backgroundImage: winner.profileImage 
                                                                            ? `url(${winner.profileImage})`
                                                                            : 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)'
                                                                    }}
                                                                >
                                                                    {!winner.profileImage && (
                                                                        <div className={styles.seasonBoxPlaceholder}>
                                                                            {winner.firstName.charAt(0)}{winner.lastName.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className={styles.seasonBoxEmpty}>
                                                                <FontAwesomeIcon icon={faTrophy} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Overlay */}
                                                    <div className={styles.seasonBoxOverlay}>
                                                        <h3 className={styles.seasonBoxTitle}>
                                                            Season {season.seasonMeta.seasonNumber}
                                                        </h3>
                                                        {season.isActive && (
                                                            <span className={styles.seasonBoxBadge}>Active</span>
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
                    <div className={styles.comingSoonSection}>
                        <FontAwesomeIcon icon={faTrophy} className={styles.comingSoonIcon} />
                        <h2 className={styles.comingSoonTitle}>Season Information Coming Soon</h2>
                        <p className={styles.comingSoonText}>
                            Detailed season information will be available here soon.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompetitionPage;
