import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import S3Image from '../S3Image/S3Image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import styles from './Performance.module.css';

interface FightDetail {
    competitionId: string;
    season: number;
    division?: number;
    round?: number;
    divisionId?: number;  // Legacy field name
    roundId?: number;     // Legacy field name
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
    competitionType?: 'league' | 'cup';
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
    size = 'default',
    competitionType
}) => {
    const navigate = useNavigate();
    
    // Extract and process fight history
    const fightHistory = useMemo(() => {
        if (!fighter.opponentsHistory || fighter.opponentsHistory.length === 0) {
            return [];
        }

        // Flatten all fights from all opponents
        // Normalize field names: some fights use division/round, others use divisionId/roundId
        const allFights: FightWithOpponent[] = fighter.opponentsHistory.flatMap(opponent =>
            opponent.details.map(detail => ({
                ...detail,
                division: detail.division ?? detail.divisionId,
                round: detail.round ?? detail.roundId,
                opponentId: opponent.opponentId
            }))
        );

        // For FighterPage and CUP: Simple flattened array of last N fights
        if (!competitionType || competitionType === 'cup') {
            // Sort all fights chronologically
            const sortedFights = [...allFights].sort((a, b) => {
                // Sort by date if available
                if (a.date && b.date) {
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                }
                if (a.date && !b.date) return 1;
                if (!a.date && b.date) return -1;
                
                // Fallback: sort by season/division/round across ALL competitions
                if (a.season !== b.season) return a.season - b.season;
                if ((a.division ?? 0) !== (b.division ?? 0)) return (a.division ?? 0) - (b.division ?? 0);
                return (a.round ?? 0) - (b.round ?? 0);
            });

            // Take the last N fights
            const recentFights = sortedFights.slice(-count);
            
            // Apply sort order (asc = oldest first, desc = newest first)
            const limitedFights = sortOrder === 'desc' ? [...recentFights].reverse() : recentFights;

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
        }

        // For LEAGUE competitions in FightPage - show only fights from the same competition
        let filteredFights = allFights;
        
        if (currentSeason != null && currentDivision != null && currentRound != null && competitionId) {
            // LEAGUE fights: Filter by competition first (e.g., only IFC, not IFL)
            // Then by season/division/round
            filteredFights = allFights.filter(fight => {
                // Must be from the same competition (e.g., only IFC across all seasons, not IFL)
                if (fight.competitionId !== competitionId) return false;
                
                const fightDivision = fight.division ?? 0;
                const fightRound = fight.round ?? 0;
                
                // Include fights from previous seasons
                if (fight.season < currentSeason) return true;
                // Include fights from current season, previous divisions
                if (fight.season === currentSeason && fightDivision < currentDivision) return true;
                // Include fights from current season-division, previous rounds
                if (fight.season === currentSeason && fightDivision === currentDivision && fightRound < currentRound) return true;
                return false;
            });
        } else if (competitionId) {
            filteredFights = allFights.filter(fight => fight.competitionId === competitionId);
        }

        const sortedFights = [...filteredFights].sort((a, b) => {
            // Get chronological sort values for both fights
            // For fights with dates, use the date; for fights without dates, use season as proxy
            const getChronologicalValue = (fight: FightWithOpponent): number => {
                if (fight.date) {
                    return new Date(fight.date).getTime();
                }
                // For fights without dates, use season number as a rough proxy
                // Multiply by a large number to separate seasons, add division/round for finer sorting
                // This puts Season 1 before Season 2, etc.
                return (fight.season * 100000000) + ((fight.division || 0) * 100000) + ((fight.round || 0) * 1000);
            };
            
            const aValue = getChronologicalValue(a);
            const bValue = getChronologicalValue(b);
            
            if (aValue !== bValue) {
                return aValue - bValue;
            }
            
            // If values are equal, fall back to competition ID for stable sorting
            return a.competitionId.localeCompare(b.competitionId);
        });

        const recentFights = sortedFights.slice(-count);
        const limitedFights = sortOrder === 'desc' ? [...recentFights].reverse() : recentFights;

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
    }, [fighter, allFighters, competitionId, count, sortOrder, currentSeason, currentDivision, currentRound, competitionType]);

    const handleFightClick = (fightId: string) => {
        navigate(`/fight/${fightId}`);
    };

    if (fightHistory.length === 0) {
        return null;
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
