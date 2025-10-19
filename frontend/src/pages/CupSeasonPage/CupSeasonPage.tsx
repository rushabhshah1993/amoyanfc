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

interface LinkedSeasonMeta {
    seasonNumber: number;
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

    return (
        <div className={styles.cupSeasonPage}>
            <div className={styles.cupSeasonContent}>
                {/* Header Section */}
                <div className={styles.seasonHeader}>
                    <div className={styles.seasonTitleSection}>
                        <h1 className={styles.seasonTitle}>
                            Season {season.seasonMeta.seasonNumber}
                        </h1>
                        {linkedCompetitionName && linkedSeasonNumber && (
                            <p className={styles.linkedCompetition}>
                                Linked to {linkedCompetitionName} Season {linkedSeasonNumber}
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
                        <FontAwesomeIcon icon={faTrophy} className={styles.sectionIcon} />
                        Participants ({participants.length})
                    </h2>
                    
                    {participants.length === 0 ? (
                        <div className={styles.noParticipants}>
                            No participants found for this tournament.
                        </div>
                    ) : (
                        <div className={styles.participantsGrid}>
                            {participants.map((fighter) => (
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
                                        <h3 className={styles.participantName}>
                                            {fighter.firstName} {fighter.lastName}
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CupSeasonPage;

