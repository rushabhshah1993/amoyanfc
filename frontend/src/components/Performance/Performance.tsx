import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import S3Image from '../S3Image/S3Image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import styles from './Performance.module.css';

interface FightDetail {
    competitionId: string;
    season: number;
    division: number;
    round: number;
    fightId: string;
    isWinner: boolean;
}

interface OpponentHistory {
    opponentId: string;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    details: FightDetail[];
}

interface CompetitionMeta {
    id: string;
    competitionName: string;
    logo?: string;
}

interface CompetitionHistory {
    competitionId: string;
    competitionMeta?: CompetitionMeta;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    opponentsHistory?: OpponentHistory[];
    competitionHistory?: CompetitionHistory[];
}

interface FightWithOpponent extends FightDetail {
    opponentId: string;
    opponentName?: string;
    opponentImage?: string;
    competitionName?: string;
}

interface PerformanceProps {
    fighter: Fighter;
    allFighters?: Fighter[];
    competitionId?: string;
    count?: number;
    showOpponentName?: boolean;
    sortOrder?: 'asc' | 'desc';
    title?: string;
    currentSeason?: number;
    currentDivision?: number;
    currentRound?: number;
}

const Performance: React.FC<PerformanceProps> = ({
    fighter,
    allFighters = [],
    competitionId,
    count = 5,
    showOpponentName = true,
    sortOrder = 'asc',
    title = 'Recent Performance',
    currentSeason,
    currentDivision,
    currentRound
}) => {
    const navigate = useNavigate();

    // Extract and process fight history
    const fightHistory = useMemo(() => {
        if (!fighter.opponentsHistory || fighter.opponentsHistory.length === 0) {
            return [];
        }

        // Flatten all fights from all opponents
        const allFights: FightWithOpponent[] = fighter.opponentsHistory.flatMap(opponent =>
            opponent.details.map(detail => ({
                ...detail,
                opponentId: opponent.opponentId
            }))
        );

        // Filter to show only fights BEFORE the current fight (if context provided)
        // This shows the last N fights chronologically before the current fight
        let filteredFights = allFights;
        
        if (currentSeason != null && currentDivision != null && currentRound != null) {
            // Filter to fights that happened BEFORE the current fight
            // Note: We don't filter by competitionId here because we want ALL fights chronologically before this moment
            filteredFights = allFights.filter(fight => {
                // Fight is before if:
                // 1. Season is less than current season, OR
                // 2. Same season, division is less than current division, OR
                // 3. Same season and division, round is less than current round
                if (fight.season < currentSeason) return true;
                if (fight.season === currentSeason && fight.division < currentDivision) return true;
                if (fight.season === currentSeason && fight.division === currentDivision && fight.round < currentRound) return true;
                return false;
            });
        } else if (competitionId) {
            // No temporal context, just filter by competition
            filteredFights = allFights.filter(fight => fight.competitionId === competitionId);
        }

        // Sort chronologically (by season -> division -> round)
        const sortedFights = [...filteredFights].sort((a, b) => {
            if (a.season !== b.season) return a.season - b.season;
            if (a.division !== b.division) return a.division - b.division;
            return a.round - b.round;
        });

        // Take the last N fights (most recent) and order them based on sortOrder
        // slice(-count) takes the last N elements
        const recentFights = sortedFights.slice(-count);
        
        // Apply sort order (asc = oldest first, desc = newest first)
        const limitedFights = sortOrder === 'desc' ? recentFights.reverse() : recentFights;

        // Enrich with opponent and competition information
        return limitedFights.map(fight => {
            const opponent = allFighters.find(f => f.id === fight.opponentId);
            const competition = fighter.competitionHistory?.find(
                comp => comp.competitionId === fight.competitionId
            );

            return {
                ...fight,
                opponentName: opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Unknown',
                opponentImage: opponent?.profileImage,
                competitionName: competition?.competitionMeta?.competitionName || 'Unknown Competition'
            };
        });
    }, [fighter, allFighters, competitionId, count, sortOrder, currentSeason, currentDivision, currentRound]);

    const handleFightClick = (fightId: string) => {
        navigate(`/fight/${fightId}`);
    };

    if (fightHistory.length === 0) {
        return null; // Don't show component if no fights available
    }

    return (
        <div className={styles.performanceContainer}>
            <h2 className={styles.performanceTitle}>
                {title}
                {competitionId && (
                    <span className={styles.subtitle}>
                        ({fightHistory[0]?.competitionName})
                    </span>
                )}
            </h2>
            <div className={styles.fightsTimeline}>
                {fightHistory.map((fight, index) => (
                    <div
                        key={`${fight.fightId}-${index}`}
                        className={`${styles.fightItem} ${fight.isWinner ? styles.win : styles.loss}`}
                        onClick={() => handleFightClick(fight.fightId)}
                        title={`${fight.competitionName}\nSeason ${fight.season}${fight.division != null ? `, Division ${fight.division}` : ''}${fight.round != null ? `, Round ${fight.round}` : ''}\nvs ${fight.opponentName}\n${fight.isWinner ? 'WON' : 'LOST'}`}
                    >
                        <div className={styles.opponentThumbnail}>
                            <S3Image
                                src={fight.opponentImage}
                                alt={fight.opponentName || 'Opponent'}
                                className={styles.thumbnailImage}
                                width={45}
                                height={45}
                                lazy={true}
                                fallback={
                                    <div className={styles.thumbnailPlaceholder}>
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                }
                            />
                        </div>
                        {showOpponentName && (
                            <div className={styles.opponentName}>
                                {fight.opponentName}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Performance;

