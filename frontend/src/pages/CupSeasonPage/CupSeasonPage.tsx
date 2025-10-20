import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faChevronLeft,
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { GET_SEASON_DETAILS, GET_FINAL_SEASON_STANDINGS } from '../../services/queries';
import TournamentBracket from '../../components/TournamentBracket/TournamentBracket';
import client from '../../services/apolloClient';
import styles from './CupSeasonPage.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface CupParticipants {
    fighters: Fighter[];
}

interface SeasonMeta {
    seasonNumber: number;
    startDate?: string;
    endDate?: string;
    winners?: Fighter[];
    cupParticipants?: CupParticipants;
}

interface LinkedCompetitionMeta {
    id: string;
    competitionName: string;
    shortName?: string;
}

interface LeagueDivision {
    divisionNumber: number;
    fighters: Fighter[];
}

interface LinkedSeasonMeta {
    id: string;
    seasonNumber: number;
    leagueDivisions?: LeagueDivision[];
}

interface LinkedLeagueSeason {
    competition: LinkedCompetitionMeta;
    season: LinkedSeasonMeta;
}

interface CompetitionMeta {
    id: string;
    competitionName: string;
    shortName?: string;
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
    cupData?: CupData;
    linkedLeagueSeason?: LinkedLeagueSeason;
    competitionMeta?: CompetitionMeta;
}

const CupSeasonPage: React.FC = () => {
    const { competitionId, seasonId } = useParams<{ competitionId: string; seasonId: string }>();
    const navigate = useNavigate();

    const { loading, error, data } = useQuery(GET_SEASON_DETAILS, {
        variables: { id: seasonId },
        skip: !seasonId
    });

    // State to store fighter positions
    const [fighterPositions, setFighterPositions] = React.useState<Map<string, number>>(new Map());

    // Create a map of fighter ID to division number
    const fighterDivisionMap = React.useMemo(() => {
        const map = new Map<string, number>();
        const divisions = data?.getCompetitionSeason?.linkedLeagueSeason?.season?.leagueDivisions;
        if (divisions) {
            divisions.forEach((division: LeagueDivision) => {
                division.fighters.forEach((fighter: Fighter) => {
                    map.set(fighter.id, division.divisionNumber);
                });
            });
        }
        return map;
    }, [data]);

    // Check if this is a CC competition
    const isCC = React.useMemo(() => {
        return data?.getCompetitionSeason?.competitionMeta?.shortName === 'CC';
    }, [data]);

    // Fetch final standings for all divisions in the linked league season
    React.useEffect(() => {
        if (!isCC || !data?.getCompetitionSeason?.linkedLeagueSeason) return;

        const linkedCompetitionId = data.getCompetitionSeason.linkedLeagueSeason.competition?.id;
        const linkedSeasonNumber = data.getCompetitionSeason.linkedLeagueSeason.season?.seasonNumber;
        const divisions = data.getCompetitionSeason.linkedLeagueSeason.season?.leagueDivisions;

        if (!linkedCompetitionId || !linkedSeasonNumber || !divisions) return;

        // Fetch standings for each division and build position map
        const fetchAllStandings = async () => {
            const positionMap = new Map<string, number>();

            for (const division of divisions) {
                try {
                    const result = await client.query({
                        query: GET_FINAL_SEASON_STANDINGS,
                        variables: {
                            competitionId: linkedCompetitionId,
                            seasonNumber: linkedSeasonNumber,
                            divisionNumber: division.divisionNumber
                        },
                        fetchPolicy: 'network-only'
                    });

                    const standings = result.data?.getFinalSeasonStandings?.standings;

                    if (standings) {
                        standings.forEach((standing: { fighterId: string; rank: number }) => {
                            positionMap.set(standing.fighterId, standing.rank);
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching standings for division ${division.divisionNumber}:`, err);
                }
            }

            setFighterPositions(positionMap);
        };

        fetchAllStandings();
    }, [data, isCC]);

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
        if (data?.getCompetitionSeason && data?.getCompetitionSeason?.competitionMeta) {
            const season = data.getCompetitionSeason;
            const compName = season.competitionMeta.shortName || season.competitionMeta.competitionName;
            document.title = `Amoyan FC | ${compName} Season ${season.seasonMeta.seasonNumber}`;
        }
    }, [data]);

    if (loading) {
        return (
            <div className={styles.cupSeasonPage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                    Loading season details...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.cupSeasonPage}>
                <div className={styles.error}>
                    Error: {error.message}
                </div>
            </div>
        );
    }

    if (!data?.getCompetitionSeason) {
        return (
            <div className={styles.cupSeasonPage}>
                <div className={styles.error}>
                    Season not found
                </div>
            </div>
        );
    }

    const season: Season = data.getCompetitionSeason;
    const participants = season.seasonMeta.cupParticipants?.fighters || [];
    const cupCompetitionName = season.competitionMeta?.shortName || season.competitionMeta?.competitionName || 'Cup';
    
    // Get linked league season info
    const linkedCompetition = season.linkedLeagueSeason?.competition;
    const linkedSeason = season.linkedLeagueSeason?.season;
    const linkedCompetitionName = linkedCompetition?.shortName || linkedCompetition?.competitionName || '';
    const linkedSeasonNumber = linkedSeason?.seasonNumber;
    const linkedSeasonId = linkedSeason?.id;
    const linkedCompetitionId = linkedCompetition?.id;

    // Sort participants by division for CC competitions
    const sortedParticipants = (() => {
        if (!isCC || fighterDivisionMap.size === 0) {
            return participants;
        }

        // Create a copy and sort by division number
        return [...participants].sort((a, b) => {
            const divisionA = fighterDivisionMap.get(a.id) || 999;
            const divisionB = fighterDivisionMap.get(b.id) || 999;
            
            // First sort by division
            if (divisionA !== divisionB) {
                return divisionA - divisionB;
            }
            
            // Then by position within division (if available)
            const positionA = fighterPositions.get(a.id) || 999;
            const positionB = fighterPositions.get(b.id) || 999;
            return positionA - positionB;
        });
    })();

    return (
        <div className={styles.cupSeasonPage}>
            <div className={styles.cupSeasonContent}>
                {/* Header Section */}
                <div className={styles.seasonHeader}>
                    <div className={styles.seasonTitleSection}>
                        <h1 className={styles.seasonTitle}>
                            Season {season.seasonMeta.seasonNumber}
                        </h1>
                        {linkedCompetitionName && linkedSeasonNumber && linkedSeasonId && linkedCompetitionId && (
                            <p className={styles.linkedCompetition}>
                                Linked to{' '}
                                <span 
                                    className={styles.linkedCompetitionLink}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/competition/${linkedCompetitionId}/season/${linkedSeasonId}`);
                                    }}
                                >
                                    {linkedCompetitionName} Season {linkedSeasonNumber}
                                </span>
                            </p>
                        )}
                    </div>

                    <button 
                        className={styles.backButton}
                        onClick={() => navigate(`/competition/${competitionId}`)}
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                        <span>Back to {cupCompetitionName}</span>
                    </button>
                </div>

                {/* Participants Section */}
                <div className={styles.participantsSection}>
                    <h2 className={styles.sectionTitle}>
                        Participants ({participants.length})
                    </h2>
                    
                    {participants.length === 0 ? (
                        <div className={styles.noParticipants}>
                            No participants found for this tournament.
                        </div>
                    ) : (
                        <div className={styles.participantsGrid}>
                            {sortedParticipants.map((fighter) => (
                                <div 
                                    key={fighter.id}
                                    className={styles.participantCard}
                                    onClick={() => navigate(`/fighter/${fighter.id}`)}
                                >
                                    <div className={styles.participantImageWrapper}>
                                        {fighter.profileImage ? (
                                            <img
                                                src={fighter.profileImage}
                                                alt={`${fighter.firstName} ${fighter.lastName}`}
                                                className={styles.participantImage}
                                            />
                                        ) : (
                                            <div className={styles.participantImagePlaceholder}>
                                                {fighter.firstName.charAt(0)}{fighter.lastName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.participantInfo}>
                                        <div className={styles.participantFirstName}>
                                            {fighter.firstName}
                                        </div>
                                        <div className={styles.participantLastName}>
                                            {fighter.lastName}
                                        </div>
                                        {fighterDivisionMap.has(fighter.id) && (
                                            <div className={styles.participantDivision}>
                                                Division {fighterDivisionMap.get(fighter.id)}
                                                {isCC && fighterPositions.has(fighter.id) && (
                                                    <span className={styles.participantPosition}>
                                                        {' '}#{fighterPositions.get(fighter.id)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tournament Bracket Section */}
                {season.cupData && season.cupData.fights && season.cupData.fights.length > 0 && (
                    <div className={styles.bracketSection}>
                        <h2 className={styles.sectionTitle}>
                            Tournament Bracket
                        </h2>
                        <TournamentBracket 
                            fights={season.cupData.fights}
                            participants={participants}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CupSeasonPage;

