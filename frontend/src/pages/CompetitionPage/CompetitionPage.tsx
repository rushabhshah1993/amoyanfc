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
import { GET_COMPETITION_META, GET_ALL_SEASONS_BY_COMPETITION, GET_ROUND_STANDINGS_BY_ROUND, GET_ALL_FIGHTERS } from '../../services/queries';
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
    rounds?: any[]; // Allow flexible typing for carry-forward logic
}

interface CupParticipants {
    fighters: Fighter[];
}

interface SeasonMeta {
    seasonNumber: number;
    startDate?: string;
    endDate?: string;
    winners?: Fighter[];
    leagueDivisions?: LeagueDivisionMeta[];
    cupParticipants?: CupParticipants;
}

interface LeagueData {
    divisions?: Division[];
}

interface CupFight {
    fighter1: string;
    fighter2: string;
    winner: string;
    fightIdentifier: string;
    date?: string;
}

interface CupData {
    fights: CupFight[];
    currentStage?: string;
}

interface Season {
    id: string;
    isActive: boolean;
    seasonMeta: SeasonMeta;
    leagueData?: LeagueData;
    cupData?: CupData;
}

// Component to fetch and display division leader for a single division
const useDivisionLeader = (
    competitionId: string,
    seasonNumber: number,
    divisionMeta: LeagueDivisionMeta,
    divisionData: Division | undefined,
    skip: boolean
) => {
    // Determine which round to fetch standings from
    // If current round has no completed fights, fetch from previous round
    const getRoundToFetch = (): number => {
        const currentRound = divisionData?.currentRound && divisionData.currentRound > 0 
            ? divisionData.currentRound 
            : 1;
        
        // If we have rounds data, check if current round has completed fights
        if (divisionData?.rounds && currentRound > 1) {
            const round = divisionData.rounds.find((r: any) => r.roundNumber === currentRound);
            
            if (round && round.fights && round.fights.length > 0) {
                const hasCompletedFights = round.fights.some((fight: any) => fight.winner);
                
                if (!hasCompletedFights) {
                    // No completed fights, fetch from previous round
                    return currentRound - 1;
                }
            }
        }
        
        return currentRound;
    };
    
    const roundToFetch = getRoundToFetch();
    
    const { data: standingsData } = useQuery(GET_ROUND_STANDINGS_BY_ROUND, {
        variables: {
            competitionId,
            seasonNumber,
            divisionNumber: divisionMeta.divisionNumber,
            roundNumber: roundToFetch
        },
        skip: skip,
        fetchPolicy: 'network-only' // Always fetch fresh data
    });

    const leader = React.useMemo(() => {
        if (!standingsData?.getRoundStandingsByRound?.standings) {
            return null;
        }
        
        const leaderStanding = standingsData.getRoundStandingsByRound.standings.find(
            (s: any) => s.rank === 1
        );
        
        if (!leaderStanding) {
            return null;
        }
        
        // Note: divisionMeta.fighters only has id, so we return the id
        return leaderStanding.fighterId;
    }, [standingsData]);

    return leader;
};

// Component for a single division's leader fetch
interface DivisionLeaderFetchProps {
    competitionId: string;
    seasonNumber: number;
    divisionMeta: LeagueDivisionMeta;
    divisionData: Division | undefined;
    skip: boolean;
    onLeaderFound: (leaderId: string | null, divisionNumber: number) => void;
}

const DivisionLeaderFetch: React.FC<DivisionLeaderFetchProps> = ({
    competitionId,
    seasonNumber,
    divisionMeta,
    divisionData,
    skip,
    onLeaderFound
}) => {
    const leaderId = useDivisionLeader(competitionId, seasonNumber, divisionMeta, divisionData, skip);
    
    React.useEffect(() => {
        onLeaderFound(leaderId, divisionMeta.divisionNumber);
    }, [leaderId, divisionMeta.divisionNumber, onLeaderFound]);
    
    return null;
};

// Component for a season box that fetches all division leaders
interface SeasonBoxProps {
    season: Season;
    competitionId: string;
    allFighters: Fighter[];
}

const SeasonBox: React.FC<SeasonBoxProps> = ({ season, competitionId, allFighters }) => {
    const navigate = useNavigate();
    const [divisionLeaders, setDivisionLeaders] = React.useState<{ [divisionNumber: number]: string | null }>({});

    const handleLeaderFound = React.useCallback((leaderId: string | null, divisionNumber: number) => {
        setDivisionLeaders(prev => ({
            ...prev,
            [divisionNumber]: leaderId
        }));
    }, []);

    // Get winners or leaders
    const getDisplayFighters = (): Fighter[] => {
        if (!season.isActive) {
            // For completed seasons, show winners
            const winners: Fighter[] = [];
            if (season.seasonMeta.leagueDivisions && season.seasonMeta.leagueDivisions.length > 0) {
                season.seasonMeta.leagueDivisions.forEach(division => {
                    if (division.winners && division.winners.length > 0) {
                        winners.push(...division.winners);
                    }
                });
            } else if (season.seasonMeta.winners && season.seasonMeta.winners.length > 0) {
                winners.push(...season.seasonMeta.winners);
            }
            return winners;
        } else {
            // For active seasons, only show leaders if we have valid standings data
            // Check if we have division leaders from standings
            const leaderIds = Object.values(divisionLeaders);
            const hasValidLeaders = leaderIds.some(id => id !== null && id !== undefined);
            
            if (!hasValidLeaders) {
                // No standings data yet (season hasn't started or no fights completed)
                // Return empty array to show trophy placeholder
                return [];
            }
            
            // Show division leaders from standings
            const leaders: Fighter[] = [];
            leaderIds.forEach(leaderId => {
                if (leaderId) {
                    const fighter = allFighters.find(f => f.id === leaderId);
                    if (fighter) {
                        leaders.push(fighter);
                    }
                }
            });
            return leaders;
        }
    };

    const displayFighters = getDisplayFighters();

    return (
        <>
            {/* Fetch division leaders for active seasons */}
            {season.isActive && season.seasonMeta.leagueDivisions && season.seasonMeta.leagueDivisions.map(divisionMeta => {
                const divisionData = season.leagueData?.divisions?.find(
                    d => d.divisionNumber === divisionMeta.divisionNumber
                );
                return (
                    <DivisionLeaderFetch
                        key={divisionMeta.divisionNumber}
                        competitionId={competitionId}
                        seasonNumber={season.seasonMeta.seasonNumber}
                        divisionMeta={divisionMeta}
                        divisionData={divisionData}
                        skip={!season.isActive}
                        onLeaderFound={handleLeaderFound}
                    />
                );
            })}

            {/* Season Box Display */}
            <div 
                className={styles.seasonBox}
                onClick={() => navigate(`/competition/${competitionId}/season/${season.id}`)}
            >
                {/* Background Images */}
                <div className={`${styles.seasonBoxBackground} ${displayFighters.length === 1 ? styles.singleWinner : ''}`}>
                    {displayFighters.length > 0 ? (
                        displayFighters.map((fighter) => (
                            <div 
                                key={fighter.id} 
                                className={styles.seasonBoxImage}
                                style={{
                                    backgroundImage: fighter.profileImage 
                                        ? `url(${fighter.profileImage})`
                                        : 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)'
                                }}
                            >
                                {!fighter.profileImage && (
                                    <div className={styles.seasonBoxPlaceholder}>
                                        {fighter.firstName.charAt(0)}{fighter.lastName.charAt(0)}
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
        </>
    );
};

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
        skip: !id || !data?.getCompetitionMeta
    });

    const { data: fightersData } = useQuery(GET_ALL_FIGHTERS, {
        skip: !id
    });

    // Update page title when competition data is loaded
    React.useEffect(() => {
        if (data?.getCompetitionMeta) {
            document.title = `Amoyan FC | ${data.getCompetitionMeta.competitionName}`;
        }
    }, [data]);

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
                                        .map((season: Season) => (
                                            <SeasonBox 
                                                key={season.id}
                                                season={season}
                                                competitionId={id!}
                                                allFighters={fightersData?.getAllFighters || []}
                                            />
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Cup Competitions */}
                {competition.type === 'cup' && (
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
                                        .map((season: Season) => (
                                            <SeasonBox 
                                                key={season.id}
                                                season={season}
                                                competitionId={id!}
                                                allFighters={fightersData?.getAllFighters || []}
                                            />
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CompetitionPage;
