import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal } from '@fortawesome/free-solid-svg-icons';
import styles from './SeasonRanking.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface Fight {
    _id: string;
    fighter1: string;
    fighter2: string;
    winner?: string;
    fightStatus?: string;
}

interface Round {
    roundNumber: number;
    fights: Fight[];
}

interface Division {
    divisionNumber: number;
    divisionName?: string;
    rounds?: Round[];
}

interface LeagueDivisionMeta {
    divisionNumber: number;
    fighters: Fighter[];
}

interface SeasonMeta {
    seasonNumber: number;
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

interface SeasonRankingProps {
    season: Season;
    competitionId: string;
}

interface FighterStats {
    fighter: Fighter;
    divisionNumber: number;
    totalFights: number;
    wins: number;
    losses: number;
    winPercentage: number;
}

const SeasonRanking: React.FC<SeasonRankingProps> = ({ season, competitionId }) => {
    const navigate = useNavigate();

    const rankedFighters = useMemo(() => {
        // Create a map to store fighter stats
        const statsMap = new Map<string, FighterStats>();

        // First, populate the map with all fighters from divisions
        season.seasonMeta.leagueDivisions?.forEach(divisionMeta => {
            divisionMeta.fighters.forEach(fighter => {
                if (!statsMap.has(fighter.id)) {
                    statsMap.set(fighter.id, {
                        fighter,
                        divisionNumber: divisionMeta.divisionNumber,
                        totalFights: 0,
                        wins: 0,
                        losses: 0,
                        winPercentage: 0
                    });
                }
            });
        });

        // Now process all fights to calculate stats
        season.leagueData?.divisions?.forEach(division => {
            division.rounds?.forEach(round => {
                round.fights.forEach(fight => {
                    // Only count completed fights
                    if (fight.fightStatus === 'completed' && fight.winner) {
                        const fighter1Stats = statsMap.get(fight.fighter1);
                        const fighter2Stats = statsMap.get(fight.fighter2);

                        if (fighter1Stats) {
                            fighter1Stats.totalFights++;
                            if (fight.winner === fight.fighter1) {
                                fighter1Stats.wins++;
                            } else {
                                fighter1Stats.losses++;
                            }
                        }

                        if (fighter2Stats) {
                            fighter2Stats.totalFights++;
                            if (fight.winner === fight.fighter2) {
                                fighter2Stats.wins++;
                            } else {
                                fighter2Stats.losses++;
                            }
                        }
                    }
                });
            });
        });

        // Calculate win percentages and filter fighters with at least 1 fight
        const fightersWithStats: FighterStats[] = [];
        statsMap.forEach(stats => {
            if (stats.totalFights > 0) {
                stats.winPercentage = (stats.wins / stats.totalFights) * 100;
                fightersWithStats.push(stats);
            }
        });

        // Sort by win percentage (descending), then by total wins (descending)
        return fightersWithStats.sort((a, b) => {
            if (Math.abs(a.winPercentage - b.winPercentage) < 0.01) {
                return b.wins - a.wins;
            }
            return b.winPercentage - a.winPercentage;
        });
    }, [season]);

    const handleFighterClick = (fighterId: string) => {
        navigate(`/fighter/${fighterId}`);
    };

    if (rankedFighters.length === 0) {
        return (
            <div className={styles.seasonRanking}>
                <h2 className={styles.sectionTitle}>Season Rankings</h2>
                <div className={styles.noDataMessage}>
                    <p>No fights completed yet this season</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.seasonRanking}>
            <h2 className={styles.sectionTitle}>
                Season Rankings by Win Percentage
            </h2>
            <p className={styles.sectionDescription}>
                Fighters ranked by performance across all divisions
            </p>

            <div className={styles.rankingTable}>
                <div className={styles.tableHeader}>
                    <div className={styles.headerRank}>Rank</div>
                    <div className={styles.headerFighter}>Fighter</div>
                    <div className={styles.headerDivision}>Division</div>
                    <div className={styles.headerRecord}>Record</div>
                    <div className={styles.headerWinPct}>Win %</div>
                </div>

                <div className={styles.tableBody}>
                    {rankedFighters.map((stats, index) => (
                        <div 
                            key={stats.fighter.id}
                            className={styles.tableRow}
                            onClick={() => handleFighterClick(stats.fighter.id)}
                        >
                            <div className={styles.cellRank}>
                                {index === 0 && (
                                    <FontAwesomeIcon 
                                        icon={faTrophy} 
                                        className={styles.trophyIcon}
                                    />
                                )}
                                {index === 1 && (
                                    <FontAwesomeIcon 
                                        icon={faMedal} 
                                        className={styles.medalIconSilver}
                                    />
                                )}
                                {index === 2 && (
                                    <FontAwesomeIcon 
                                        icon={faMedal} 
                                        className={styles.medalIconBronze}
                                    />
                                )}
                                {index > 2 && <span>{index + 1}</span>}
                            </div>

                            <div className={styles.cellFighter}>
                                <div className={styles.fighterImage}>
                                    {stats.fighter.profileImage ? (
                                        <img 
                                            src={stats.fighter.profileImage} 
                                            alt={`${stats.fighter.firstName} ${stats.fighter.lastName}`}
                                        />
                                    ) : (
                                        <div className={styles.fighterImagePlaceholder}>
                                            {stats.fighter.firstName.charAt(0)}{stats.fighter.lastName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.fighterName}>
                                    {stats.fighter.firstName} {stats.fighter.lastName}
                                </div>
                            </div>

                            <div className={styles.cellDivision}>
                                Division {stats.divisionNumber}
                            </div>

                            <div className={styles.cellRecord}>
                                <span className={styles.recordWins}>{stats.wins}</span>
                                <span className={styles.recordSeparator}>-</span>
                                <span className={styles.recordLosses}>{stats.losses}</span>
                            </div>

                            <div className={styles.cellWinPct}>
                                <div className={styles.winPctBar}>
                                    <div 
                                        className={styles.winPctBarFill}
                                        style={{ width: `${stats.winPercentage}%` }}
                                    />
                                </div>
                                <span className={styles.winPctText}>
                                    {stats.winPercentage.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SeasonRanking;

