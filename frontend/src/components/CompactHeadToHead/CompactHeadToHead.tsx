import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSpinner } from '@fortawesome/free-solid-svg-icons';
import S3Image from '../S3Image/S3Image';
import styles from './CompactHeadToHead.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface CompetitionHeadToHead {
    competitionId: string;
    competitionName: string;
    competitionLogo?: string;
    totalFights: number;
    fighter1Wins: number;
    fighter2Wins: number;
    fights: {
        winner: string; // fighter ID
        season: number;
        division?: number;
        round: number;
        fightId: string;
        date?: string;
    }[];
}

interface CompactHeadToHeadProps {
    fighter1: Fighter;
    fighter2: Fighter;
    headToHeadData: CompetitionHeadToHead[];
    loading?: boolean;
}

const CompactHeadToHead: React.FC<CompactHeadToHeadProps> = ({ fighter1, fighter2, headToHeadData, loading = false }) => {
    const navigate = useNavigate();
    const hasNoFights = headToHeadData.length === 0 || headToHeadData.every(comp => comp.totalFights === 0);

    // Calculate total stats across all competitions
    const totalFights = headToHeadData.reduce((sum, comp) => sum + comp.totalFights, 0);
    const totalFighter1Wins = headToHeadData.reduce((sum, comp) => sum + comp.fighter1Wins, 0);
    const totalFighter2Wins = headToHeadData.reduce((sum, comp) => sum + comp.fighter2Wins, 0);

    // Flatten all fights from all competitions
    const allFights = headToHeadData.flatMap(comp => 
        comp.fights.map(fight => ({
            ...fight,
            competitionName: comp.competitionName,
            competitionLogo: comp.competitionLogo
        }))
    );

    // Show loading state
    if (loading) {
        return (
            <div className={styles.compactHeadToHead}>
                <h3 className={styles.sectionTitle}>Head-to-Head History</h3>
                <div className={styles.emptyState}>
                    <p className={styles.emptyMessage}>
                        <FontAwesomeIcon icon={faUser} spin style={{ marginRight: '0.5rem' }} />
                        Loading fight history...
                    </p>
                </div>
            </div>
        );
    }

    if (hasNoFights) {
        return (
            <div className={styles.compactHeadToHead}>
                <h3 className={styles.sectionTitle}>Head-to-Head History</h3>
                <div className={styles.emptyState}>
                    <p className={styles.emptyMessage}>
                        {fighter1.firstName} and {fighter2.firstName} have not fought before.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.compactHeadToHead}>
            <h3 className={styles.sectionTitle}>Head-to-Head History</h3>
            
            {/* Summary Stats */}
            <div className={styles.summaryStats}>
                <div className={styles.fighterStat}>
                    <div className={styles.fighterStatThumbnail}>
                        <S3Image
                            src={fighter1.profileImage}
                            alt={fighter1.firstName}
                            className={styles.statFighterImage}
                            width={50}
                            height={50}
                            lazy={true}
                            fallback={
                                <div className={styles.statImagePlaceholder}>
                                    <FontAwesomeIcon icon={faUser} />
                                </div>
                            }
                        />
                    </div>
                    <div className={styles.fighterStatInfo}>
                        <span className={styles.fighterStatName}>{fighter1.firstName}</span>
                        <span className={styles.fighterStatWins}>{totalFighter1Wins} win{totalFighter1Wins !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                <div className={styles.totalFightsDisplay}>
                    <span className={styles.totalFightsNumber}>{totalFights}</span>
                    <span className={styles.totalFightsLabel}>Total Fights</span>
                </div>

                <div className={styles.fighterStat}>
                    <div className={styles.fighterStatInfo}>
                        <span className={styles.fighterStatName}>{fighter2.firstName}</span>
                        <span className={styles.fighterStatWins}>{totalFighter2Wins} win{totalFighter2Wins !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.fighterStatThumbnail}>
                        <S3Image
                            src={fighter2.profileImage}
                            alt={fighter2.firstName}
                            className={styles.statFighterImage}
                            width={50}
                            height={50}
                            lazy={true}
                            fallback={
                                <div className={styles.statImagePlaceholder}>
                                    <FontAwesomeIcon icon={faUser} />
                                </div>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* Horizontally Scrollable Fight Cards */}
            <div className={styles.fightsScrollContainer}>
                <div className={styles.fightCards}>
                    {allFights.map((fight, idx) => {
                        const winner = fight.winner === fighter1.id ? fighter1 : fighter2;
                        const fightDate = fight.date ? new Date(fight.date) : null;
                        
                        return (
                            <div 
                                key={`${fight.fightId}-${idx}`} 
                                className={styles.fightCard}
                                onClick={() => fight.fightId && navigate(`/fight/${fight.fightId}`)}
                                style={{ cursor: fight.fightId ? 'pointer' : 'default' }}
                            >
                                {/* Competition Logo & Name at Top */}
                                <div className={styles.cardHeader}>
                                    {fight.competitionLogo && (
                                        <S3Image
                                            src={fight.competitionLogo}
                                            alt={fight.competitionName}
                                            className={styles.cardCompetitionLogo}
                                            width={24}
                                            height={24}
                                            lazy={true}
                                        />
                                    )}
                                    <span className={styles.cardCompetitionName}>{fight.competitionName}</span>
                                </div>

                                {/* Winner Thumbnail */}
                                <div className={styles.cardWinnerThumbnail}>
                                    <S3Image
                                        src={winner.profileImage}
                                        alt={winner.firstName}
                                        className={styles.cardWinnerImage}
                                        width={120}
                                        height={120}
                                        lazy={true}
                                        fallback={
                                            <div className={styles.cardImagePlaceholder}>
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                        }
                                    />
                                </div>

                                {/* Fight Location Info */}
                                <div className={styles.cardFightInfo}>
                                    <span className={styles.cardLocation}>
                                        S{fight.season}
                                        {fight.division && ` • D${fight.division}`}
                                        {` • R${fight.round}`}
                                    </span>
                                </div>

                                {/* Date at Bottom */}
                                {fightDate && (
                                    <div className={styles.cardDate}>
                                        {fightDate.toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CompactHeadToHead;

