import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import BodySilhouette from '../../pages/FightPage/BodySilhouette';
import styles from './FightStatistics.module.css';

interface FightStats {
    avgFightTime?: number;
    finishingMoves?: string[];
    grappling?: {
        accuracy?: number;
        defence?: number;
    };
    significantStrikes?: {
        accuracy?: number;
        attempted?: number;
        defence?: number;
        landed?: number;
        landedPerMinute?: number;
        positions?: {
            clinching?: number;
            ground?: number;
            standing?: number;
        };
    };
    strikeMap?: {
        head: { absorb: number; strike: number };
        torso: { absorb: number; strike: number };
        leg: { absorb: number; strike: number };
    };
    submissions?: {
        attemptsPer15Mins?: number;
        average?: number;
    };
    takedowns?: {
        accuracy?: number;
        attempted?: number;
        avgTakedownsLandedPerMin?: number;
        defence?: number;
        landed?: number;
    };
}

interface FightStatisticsProps {
    fightStats?: FightStats;
    fighterName: string;
}

const FightStatistics: React.FC<FightStatisticsProps> = ({ fightStats, fighterName }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!fightStats) {
        return (
            <div className={styles.fightStatisticsSection}>
                <div className={styles.sectionHeader} onClick={() => setIsExpanded(!isExpanded)}>
                    <h3 className={styles.sectionTitle}>Fight Statistics</h3>
                    <button className={styles.toggleButton}>
                        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                    </button>
                </div>
                {isExpanded && (
                    <div className={styles.noStatsMessage}>
                        <p>No fight statistics available yet</p>
                        <p className={styles.subMessage}>Stats will appear after first fight</p>
                    </div>
                )}
            </div>
        );
    }

    // Calculate color based on rank (same as FightPage)
    const getBodyPartColor = (value: number, values: number[]): string => {
        const sorted = [...values].sort((a, b) => b - a); // Sort descending
        const rank = sorted.indexOf(value);
        
        if (rank === 0) return '#ef4444'; // Red - highest
        if (rank === 1) return '#f59e0b'; // Orange/Yellow - middle
        return '#22c55e'; // Green - lowest
    };

    // Calculate opacity based on value range (same as FightPage)
    const getBodyPartOpacity = (value: number, values: number[]): number => {
        const max = Math.max(...values);
        if (max === 0) return 0.3;
        const opacity = 0.3 + (value / max) * 0.7; // Range from 0.3 to 1.0
        return opacity;
    };

    // Render body silhouette for strike map
    const renderBodySilhouette = (strikeMap: any, type: 'strike' | 'absorb') => {
        const headValue = strikeMap.head?.[type] || 0;
        const torsoValue = strikeMap.torso?.[type] || 0;
        const legValue = strikeMap.leg?.[type] || 0;
        
        const values = [headValue, torsoValue, legValue];
        const headColor = getBodyPartColor(headValue, values);
        const torsoColor = getBodyPartColor(torsoValue, values);
        const legColor = getBodyPartColor(legValue, values);
        
        const headOpacity = getBodyPartOpacity(headValue, values);
        const torsoOpacity = getBodyPartOpacity(torsoValue, values);
        const legOpacity = getBodyPartOpacity(legValue, values);

        return (
            <div className={styles.strikeMapContainer}>
                <h5 className={styles.strikeMapTitle}>
                    {type === 'strike' ? 'Strikes Landed' : 'Strikes Absorbed'}
                </h5>
                <div className={styles.silhouetteWrapper}>
                    <BodySilhouette
                        headColor={headColor}
                        torsoColor={torsoColor}
                        legColor={legColor}
                        headOpacity={headOpacity}
                        torsoOpacity={torsoOpacity}
                        legOpacity={legOpacity}
                        id={`${fighterName.replace(/\s+/g, '-')}-${type}-career`}
                    />
                </div>
                <div className={styles.strikeMapLegend}>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: headColor, opacity: headOpacity }}></div>
                        <span>Head: {headValue}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: torsoColor, opacity: torsoOpacity }}></div>
                        <span>Torso: {torsoValue}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: legColor, opacity: legOpacity }}></div>
                        <span>Leg: {legValue}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.fightStatisticsSection}>
            <div className={styles.sectionHeader} onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className={styles.sectionTitle}>Fight Statistics</h3>
                <button className={styles.toggleButton}>
                    <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                </button>
            </div>
            
            {isExpanded && (
            <>
            <div className={styles.statsGrid}>
                {/* General Stats */}
                <div className={styles.statsCard}>
                    <h4 className={styles.cardTitle}>General</h4>
                    <div className={styles.statRows}>
                        {fightStats.avgFightTime !== undefined && (
                            <div className={styles.statRow}>
                                <span className={styles.statLabel}>Average Fight Time</span>
                                <span className={styles.statValue}>{fightStats.avgFightTime.toFixed(1)} min</span>
                            </div>
                        )}
                        {fightStats.finishingMoves && fightStats.finishingMoves.length > 0 && (
                            <div className={styles.statRow}>
                                <span className={styles.statLabel}>Finishing Moves</span>
                                <span className={styles.statValue}>{fightStats.finishingMoves.join(', ')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Significant Strikes */}
                {fightStats.significantStrikes && (
                    <div className={styles.statsCard}>
                        <h4 className={styles.cardTitle}>Significant Strikes</h4>
                        <div className={styles.statRows}>
                            {fightStats.significantStrikes.accuracy !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Accuracy</span>
                                    <span className={styles.statValue}>{fightStats.significantStrikes.accuracy.toFixed(1)}%</span>
                                </div>
                            )}
                            {fightStats.significantStrikes.landed !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Landed</span>
                                    <span className={styles.statValue}>{fightStats.significantStrikes.landed}</span>
                                </div>
                            )}
                            {fightStats.significantStrikes.attempted !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Attempted</span>
                                    <span className={styles.statValue}>{fightStats.significantStrikes.attempted}</span>
                                </div>
                            )}
                            {fightStats.significantStrikes.landedPerMinute !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Per Minute</span>
                                    <span className={styles.statValue}>{fightStats.significantStrikes.landedPerMinute.toFixed(2)}</span>
                                </div>
                            )}
                            {fightStats.significantStrikes.defence !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Defense</span>
                                    <span className={styles.statValue}>{fightStats.significantStrikes.defence}%</span>
                                </div>
                            )}
                        </div>
                        {fightStats.significantStrikes.positions && (
                            <div className={styles.positionsSection}>
                                <h5 className={styles.subsectionTitle}>Strike Positions</h5>
                                <div className={styles.statRows}>
                                    <div className={styles.statRow}>
                                        <span className={styles.statLabel}>Standing</span>
                                        <span className={styles.statValue}>{fightStats.significantStrikes.positions.standing || 0}</span>
                                    </div>
                                    <div className={styles.statRow}>
                                        <span className={styles.statLabel}>Clinching</span>
                                        <span className={styles.statValue}>{fightStats.significantStrikes.positions.clinching || 0}</span>
                                    </div>
                                    <div className={styles.statRow}>
                                        <span className={styles.statLabel}>Ground</span>
                                        <span className={styles.statValue}>{fightStats.significantStrikes.positions.ground || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Grappling */}
                {fightStats.grappling && (
                    <div className={styles.statsCard}>
                        <h4 className={styles.cardTitle}>Grappling</h4>
                        <div className={styles.statRows}>
                            {fightStats.grappling.accuracy !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Accuracy</span>
                                    <span className={styles.statValue}>{fightStats.grappling.accuracy.toFixed(1)}%</span>
                                </div>
                            )}
                            {fightStats.grappling.defence !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Defense</span>
                                    <span className={styles.statValue}>{fightStats.grappling.defence}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Takedowns */}
                {fightStats.takedowns && (
                    <div className={styles.statsCard}>
                        <h4 className={styles.cardTitle}>Takedowns</h4>
                        <div className={styles.statRows}>
                            {fightStats.takedowns.accuracy !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Accuracy</span>
                                    <span className={styles.statValue}>{fightStats.takedowns.accuracy.toFixed(1)}%</span>
                                </div>
                            )}
                            {fightStats.takedowns.landed !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Landed</span>
                                    <span className={styles.statValue}>{fightStats.takedowns.landed}</span>
                                </div>
                            )}
                            {fightStats.takedowns.attempted !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Attempted</span>
                                    <span className={styles.statValue}>{fightStats.takedowns.attempted}</span>
                                </div>
                            )}
                            {fightStats.takedowns.avgTakedownsLandedPerMin !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Per Minute</span>
                                    <span className={styles.statValue}>{fightStats.takedowns.avgTakedownsLandedPerMin.toFixed(2)}</span>
                                </div>
                            )}
                            {fightStats.takedowns.defence !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Defense</span>
                                    <span className={styles.statValue}>{fightStats.takedowns.defence}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Submissions */}
                {fightStats.submissions && (
                    <div className={styles.statsCard}>
                        <h4 className={styles.cardTitle}>Submissions</h4>
                        <div className={styles.statRows}>
                            {fightStats.submissions.average !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Average</span>
                                    <span className={styles.statValue}>{fightStats.submissions.average.toFixed(2)}</span>
                                </div>
                            )}
                            {fightStats.submissions.attemptsPer15Mins !== undefined && (
                                <div className={styles.statRow}>
                                    <span className={styles.statLabel}>Attempts per 15 min</span>
                                    <span className={styles.statValue}>{fightStats.submissions.attemptsPer15Mins.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Strike Map Visualization */}
            {fightStats.strikeMap && (
                <div className={styles.strikeMapSection}>
                    <h4 className={styles.strikeMapSectionTitle}>Strike Distribution</h4>
                    <div className={styles.strikeMapGrid}>
                        {renderBodySilhouette(fightStats.strikeMap, 'strike')}
                        {renderBodySilhouette(fightStats.strikeMap, 'absorb')}
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default FightStatistics;

