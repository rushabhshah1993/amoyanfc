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
    date?: string;
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
    size?: 'default' | 'lg';
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
    currentRound,
    size = 'default'
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
        
        console.log('Performance Component Debug:', {
            fighterName: `${fighter.firstName} ${fighter.lastName}`,
            totalFights: allFights.length,
            competitionId,
            hasTemporalContext: currentSeason != null && currentDivision != null && currentRound != null,
            uniqueCompetitions: Array.from(new Set(allFights.map(f => f.competitionId))).length
        });

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

        // Sort chronologically by actual date (if available), otherwise by season/division/round
        const sortedFights = [...filteredFights].sort((a, b) => {
            // If both have dates, sort by date
            if (a.date && b.date) {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            }
            // If only one has a date, prioritize the one without date as older
            if (a.date && !b.date) return 1;
            if (!a.date && b.date) return -1;
            
            // Fallback to season/division/round for fights without dates (or same competition)
            // But we need to handle cross-competition sorting better
            // For now, if different competitions, sort by season/division/round within each competition
            if (a.competitionId !== b.competitionId) {
                // Different competitions - if both have dates, we already sorted above
                // Otherwise, keep original order or sort by competition ID
                return a.competitionId.localeCompare(b.competitionId);
            }
            
            // Same competition - sort by season/division/round
            if (a.season !== b.season) return a.season - b.season;
            if (a.division !== b.division) return a.division - b.division;
            return a.round - b.round;
        });

        // Take the last N fights (most recent) and order them based on sortOrder
        // slice(-count) takes the last N elements
        const recentFights = sortedFights.slice(-count);
        
        console.log('Performance Filtering:', {
            totalFights: allFights.length,
            afterFiltering: filteredFights.length,
            afterSorting: sortedFights.length,
            displayingCount: recentFights.length,
            lastFewFights: sortedFights.slice(-5).map(f => ({
                comp: f.competitionId.substring(0, 8),
                season: f.season,
                div: f.division,
                round: f.round,
                date: f.date ? new Date(f.date).toLocaleDateString() : 'no date'
            }))
        });
        
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

    const sizeClasses = {
        container: size === 'lg' ? styles.performanceContainerLg : styles.performanceContainer,
        title: size === 'lg' ? styles.performanceTitleLg : styles.performanceTitle,
        timeline: size === 'lg' ? styles.fightsTimelineLg : styles.fightsTimeline,
        item: size === 'lg' ? styles.fightItemLg : styles.fightItem,
        thumbnail: size === 'lg' ? styles.opponentThumbnailLg : styles.opponentThumbnail,
        name: size === 'lg' ? styles.opponentNameLg : styles.opponentName,
        placeholder: size === 'lg' ? styles.thumbnailPlaceholderLg : styles.thumbnailPlaceholder
    };

    const thumbnailSize = size === 'lg' ? 110 : 45;

    return (
        <div className={sizeClasses.container}>
            <h2 className={sizeClasses.title}>
                {title}
                {competitionId && (
                    <span className={styles.subtitle}>
                        ({fightHistory[0]?.competitionName})
                    </span>
                )}
            </h2>
            <div className={sizeClasses.timeline}>
                {fightHistory.map((fight, index) => (
                    <div
                        key={`${fight.fightId}-${index}`}
                        className={`${sizeClasses.item} ${fight.isWinner ? styles.win : styles.loss}`}
                        onClick={() => handleFightClick(fight.fightId)}
                        title={`${fight.competitionName}\nSeason ${fight.season}${fight.division != null ? `, Division ${fight.division}` : ''}${fight.round != null ? `, Round ${fight.round}` : ''}\nvs ${fight.opponentName}\n${fight.isWinner ? 'WON' : 'LOST'}`}
                    >
                        <div className={sizeClasses.thumbnail}>
                            <S3Image
                                src={fight.opponentImage}
                                alt={fight.opponentName || 'Opponent'}
                                className={styles.thumbnailImage}
                                width={thumbnailSize}
                                height={thumbnailSize}
                                lazy={true}
                                fallback={
                                    <div className={sizeClasses.placeholder}>
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                }
                            />
                        </div>
                        {showOpponentName && (
                            <div className={sizeClasses.name}>
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

