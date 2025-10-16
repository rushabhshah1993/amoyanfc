import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faTrophy, faSkullCrossbones } from '@fortawesome/free-solid-svg-icons';
import S3Image from '../S3Image/S3Image';
import styles from './Streaks.module.css';

interface StreakStart {
    season: number;
    division: number;
    round: number;
}

interface StreakEnd {
    season: number;
    division: number;
    round: number;
}

interface CompetitionMeta {
    id: string;
    competitionName: string;
    logo?: string;
}

interface Opponent {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface Streak {
    competitionId: string;
    type: 'win' | 'lose';
    start: StreakStart;
    end?: StreakEnd;
    count: number;
    active: boolean;
    opponents: Opponent[];
    competitionMeta: CompetitionMeta;
}

interface StreaksProps {
    streaks: Streak[];
}

interface CompetitionStreaks {
    [competitionId: string]: {
        competitionMeta: CompetitionMeta;
        streaks: Streak[];
    };
}

const Streaks: React.FC<StreaksProps> = ({ streaks }) => {
    const [expandedCompetitions, setExpandedCompetitions] = useState<Set<string>>(new Set());

    // Group streaks by competition
    const competitionStreaks: CompetitionStreaks = streaks.reduce((acc, streak) => {
        const competitionId = streak.competitionId;
        if (!acc[competitionId]) {
            acc[competitionId] = {
                competitionMeta: streak.competitionMeta,
                streaks: []
            };
        }
        acc[competitionId].streaks.push(streak);
        return acc;
    }, {} as CompetitionStreaks);

    const toggleCompetition = (competitionId: string) => {
        const newExpanded = new Set(expandedCompetitions);
        if (newExpanded.has(competitionId)) {
            newExpanded.delete(competitionId);
        } else {
            newExpanded.add(competitionId);
        }
        setExpandedCompetitions(newExpanded);
    };

    const calculateStreakStats = (streaks: Streak[], type: 'win' | 'lose') => {
        const filteredStreaks = streaks.filter(streak => streak.type === type);
        if (filteredStreaks.length === 0) return { highest: 0, lowest: 0 };
        
        const counts = filteredStreaks.map(streak => streak.count);
        return {
            highest: Math.max(...counts),
            lowest: Math.min(...counts)
        };
    };

    if (streaks.length === 0) {
        return (
            <div className={styles.streaksSection}>
                <h2 className={styles.sectionTitle}>Fighting Streaks</h2>
                <div className={styles.emptyState}>
                    <p>This fighter's fights have not yet been added to the system.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.streaksSection}>
            <h2 className={styles.sectionTitle}>Fighting Streaks</h2>
            <div className={styles.streaksContainer}>
                {Object.entries(competitionStreaks).map(([competitionId, { competitionMeta, streaks: competitionStreaksList }]) => {
                    const isExpanded = expandedCompetitions.has(competitionId);
                    const winStats = calculateStreakStats(competitionStreaksList, 'win');
                    const loseStats = calculateStreakStats(competitionStreaksList, 'lose');
                    
                    // Sort streaks chronologically (oldest first) and separate by type
                    const sortedStreaks = [...competitionStreaksList].sort((a, b) => {
                        // Sort by season, then division, then round
                        if (a.start.season !== b.start.season) {
                            return a.start.season - b.start.season;
                        }
                        if (a.start.division !== b.start.division) {
                            return a.start.division - b.start.division;
                        }
                        return a.start.round - b.start.round;
                    });
                    
                    const winStreaks = sortedStreaks.filter(streak => streak.type === 'win');
                    const loseStreaks = sortedStreaks.filter(streak => streak.type === 'lose');

                    return (
                        <div key={competitionId} className={styles.streakCard}>
                            <div 
                                className={styles.streakCardHeader}
                                onClick={() => toggleCompetition(competitionId)}
                            >
                                <div className={styles.competitionInfo}>
                                    {competitionMeta.logo && (
                                        <img 
                                            src={competitionMeta.logo} 
                                            alt={competitionMeta.competitionName}
                                            className={styles.competitionLogo}
                                        />
                                    )}
                                    <h3 className={styles.competitionName}>{competitionMeta.competitionName}</h3>
                                </div>
                                <FontAwesomeIcon 
                                    icon={isExpanded ? faChevronUp : faChevronDown} 
                                    className={styles.expandIcon}
                                />
                            </div>

                            <div className={styles.streakStats}>
                                <div className={styles.streakStatsLeft}>
                                    <div className={`${styles.streakStat} ${styles.winStreaks}`}>
                                        <div className={styles.streakStatHeader}>
                                            <FontAwesomeIcon icon={faTrophy} className={styles.winIcon} />
                                            <span className={styles.streakStatTitle}>Win Streaks</span>
                                        </div>
                                        <div className={styles.streakStatValues}>
                                            <div className={styles.streakStatItem}>
                                                <span className={styles.streakStatLabel}>Highest</span>
                                                <span className={`${styles.streakStatValue} ${styles.highest}`}>{winStats.highest}</span>
                                            </div>
                                            <div className={styles.streakStatItem}>
                                                <span className={styles.streakStatLabel}>Lowest</span>
                                                <span className={`${styles.streakStatValue} ${styles.lowest}`}>{winStats.lowest}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.streakStatsRight}>
                                    <div className={`${styles.streakStat} ${styles.loseStreaks}`}>
                                        <div className={styles.streakStatHeader}>
                                            <FontAwesomeIcon icon={faSkullCrossbones} className={styles.loseIcon} />
                                            <span className={styles.streakStatTitle}>Lose Streaks</span>
                                        </div>
                                        <div className={styles.streakStatValues}>
                                            <div className={styles.streakStatItem}>
                                                <span className={styles.streakStatLabel}>Highest</span>
                                                <span className={`${styles.streakStatValue} ${styles.highest}`}>{loseStats.highest}</span>
                                            </div>
                                            <div className={styles.streakStatItem}>
                                                <span className={styles.streakStatLabel}>Lowest</span>
                                                <span className={`${styles.streakStatValue} ${styles.lowest}`}>{loseStats.lowest}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className={styles.streakCardContent}>
                                    <div className={styles.streakDetails}>
                                        <div className={styles.streakSection}>
                                            <h4 className={styles.streakSectionTitle}>
                                                <FontAwesomeIcon icon={faTrophy} className={styles.winIcon} />
                                                Win Streaks
                                            </h4>
                                            {winStreaks.length > 0 ? (
                                                <div className={styles.streakList}>
                                                    {winStreaks.map((streak, index) => (
                                                        <div key={index} className={styles.streakItem}>
                                                            <div className={styles.streakTitle}>
                                                                <span className={styles.streakPeriod}>
                                                                    S{streak.start.season} D{streak.start.division} R{streak.start.round} - 
                                                                    {streak.active ? (
                                                                        <span className={styles.liveIndicator}>
                                                                            <span className={styles.liveDot}></span>
                                                                            Live
                                                                        </span>
                                                                    ) : (
                                                                        ` S${streak.end?.season} D${streak.end?.division} R${streak.end?.round}`
                                                                    )}
                                                                </span>
                                                                <span className={styles.streakCount}>({streak.count})</span>
                                                            </div>
                                                            <div className={styles.opponentsGrid}>
                                                                {streak.opponents.map((opponent, oppIndex) => (
                                                                    <div key={oppIndex} className={styles.opponentThumbnail}>
                                                                        <S3Image
                                                                            src={opponent.profileImage}
                                                                            alt={`${opponent.firstName} ${opponent.lastName}`}
                                                                            className={styles.opponentImage}
                                                                            lazy={true}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={styles.emptyStreak}>
                                                    <p>No fight data available</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.streakSection}>
                                            <h4 className={styles.streakSectionTitle}>
                                                <FontAwesomeIcon icon={faSkullCrossbones} className={styles.loseIcon} />
                                                Lose Streaks
                                            </h4>
                                            {loseStreaks.length > 0 ? (
                                                <div className={styles.streakList}>
                                                    {loseStreaks.map((streak, index) => (
                                                        <div key={index} className={styles.streakItem}>
                                                            <div className={styles.streakTitle}>
                                                                <span className={styles.streakPeriod}>
                                                                    S{streak.start.season} D{streak.start.division} R{streak.start.round} - 
                                                                    {streak.active ? (
                                                                        <span className={styles.liveIndicator}>
                                                                            <span className={styles.liveDot}></span>
                                                                            Live
                                                                        </span>
                                                                    ) : (
                                                                        ` S${streak.end?.season} D${streak.end?.division} R${streak.end?.round}`
                                                                    )}
                                                                </span>
                                                                <span className={styles.streakCount}>{streak.count}</span>
                                                            </div>
                                                            <div className={styles.opponentsGrid}>
                                                                {streak.opponents.map((opponent, oppIndex) => (
                                                                    <div key={oppIndex} className={styles.opponentThumbnail}>
                                                                        <S3Image
                                                                            src={opponent.profileImage}
                                                                            alt={`${opponent.firstName} ${opponent.lastName}`}
                                                                            className={styles.opponentImage}
                                                                            lazy={true}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={styles.emptyStreak}>
                                                    <p>No fight data available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Streaks;
