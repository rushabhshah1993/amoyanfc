import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import styles from './StatsComparison.module.css';

interface Location {
    city?: string;
    country?: string;
}

interface PhysicalAttributes {
    heightCm?: number;
    heightFeet?: string;
    weightKg?: number;
    armReach?: number;
    legReach?: number;
    bodyType?: string;
    koPower?: number;
    durability?: number;
    strength?: number;
    endurance?: number;
    agility?: number;
}

interface CompetitionHistory {
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    titles: {
        totalTitles: number;
    };
}

interface Streak {
    type: string;
    count: number;
    active: boolean;
}

interface GlobalRank {
    rank?: number;
    score?: number;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    skillset?: string[];
    location?: Location;
    physicalAttributes?: PhysicalAttributes;
    competitionHistory?: CompetitionHistory[];
    streaks?: Streak[];
    globalRank?: GlobalRank;
    debutInformation?: {
        competitionId: string;
        season: number;
        fightId: string;
        dateOfDebut?: string;
        competitionMeta?: {
            id: string;
            competitionName: string;
            logo?: string;
        };
    };
}

interface StatsComparisonProps {
    fighter1: Fighter;
    fighter2: Fighter;
}

const StatsComparison: React.FC<StatsComparisonProps> = ({ fighter1, fighter2 }) => {
    const navigate = useNavigate();
    // Calculate age from dateOfBirth
    const calculateAge = (dateOfBirth?: string): number | null => {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Calculate total stats across all competitions
    const calculateTotalStats = (fighter: Fighter) => {
        if (!fighter.competitionHistory || fighter.competitionHistory.length === 0) {
            return {
                totalFights: 0,
                totalWins: 0,
                totalLosses: 0,
                winPercentage: 0,
                totalTitles: 0
            };
        }

        return fighter.competitionHistory.reduce((acc, comp) => ({
            totalFights: acc.totalFights + comp.totalFights,
            totalWins: acc.totalWins + comp.totalWins,
            totalLosses: acc.totalLosses + comp.totalLosses,
            winPercentage: 0, // Will calculate after
            totalTitles: acc.totalTitles + (comp.titles?.totalTitles || 0)
        }), {
            totalFights: 0,
            totalWins: 0,
            totalLosses: 0,
            winPercentage: 0,
            totalTitles: 0
        });
    };

    // Get highest win streak count (active or ended)
    const getHighestWinStreak = (fighter: Fighter): number => {
        if (!fighter.streaks || fighter.streaks.length === 0) return 0;
        
        const winStreaks = fighter.streaks.filter(s => s.type === 'win');
        if (winStreaks.length === 0) return 0;
        
        return Math.max(...winStreaks.map(s => s.count));
    };

    const fighter1Stats = calculateTotalStats(fighter1);
    const fighter2Stats = calculateTotalStats(fighter2);

    // Calculate win percentages
    fighter1Stats.winPercentage = fighter1Stats.totalFights > 0 
        ? (fighter1Stats.totalWins / fighter1Stats.totalFights) * 100 
        : 0;
    fighter2Stats.winPercentage = fighter2Stats.totalFights > 0 
        ? (fighter2Stats.totalWins / fighter2Stats.totalFights) * 100 
        : 0;

    const fighter1Age = calculateAge(fighter1.dateOfBirth);
    const fighter2Age = calculateAge(fighter2.dateOfBirth);
    const fighter1WinStreak = getHighestWinStreak(fighter1);
    const fighter2WinStreak = getHighestWinStreak(fighter2);

    // Helper to determine which value is "better" (for subtle highlighting)
    const getBetterClass = (val1: number | null, val2: number | null, higherIsBetter: boolean = true) => {
        if (val1 === null || val2 === null) return '';
        if (val1 === val2) return '';
        if (higherIsBetter) {
            return val1 > val2 ? styles.better : '';
        } else {
            return val1 < val2 ? styles.better : '';
        }
    };

    // Render a stat row
    const renderStatRow = (
        label: string,
        fighter1Value: string | number | null,
        fighter2Value: string | number | null,
        fighter1Class: string = '',
        fighter2Class: string = ''
    ) => (
        <div className={styles.statRow}>
            <div className={`${styles.fighter1Value} ${fighter1Class}`}>
                {fighter1Value !== null ? fighter1Value : 'N/A'}
            </div>
            <div className={styles.statLabel}>{label}</div>
            <div className={`${styles.fighter2Value} ${fighter2Class}`}>
                {fighter2Value !== null ? fighter2Value : 'N/A'}
            </div>
        </div>
    );

    return (
        <div className={styles.statsComparison}>
            <h2 className={styles.title}>Fighter Comparison</h2>

            {/* Category 1: General */}
            <div className={styles.category}>
                <h3 className={styles.categoryTitle}>General</h3>
                {renderStatRow(
                    'Age',
                    fighter1Age,
                    fighter2Age
                )}
                {renderStatRow(
                    'City',
                    fighter1.location?.city || 'N/A',
                    fighter2.location?.city || 'N/A'
                )}
                {renderStatRow(
                    'Country',
                    fighter1.location?.country || 'N/A',
                    fighter2.location?.country || 'N/A'
                )}
            </div>

            {/* Category 2: Fight Style */}
            <div className={styles.category}>
                <h3 className={styles.categoryTitle}>Fight Style</h3>
                {renderStatRow(
                    'Skillset',
                    fighter1.skillset?.join(', ') || 'N/A',
                    fighter2.skillset?.join(', ') || 'N/A'
                )}
            </div>

            {/* Category 3: Fights */}
            <div className={styles.category}>
                <h3 className={styles.categoryTitle}>Fights</h3>
                
                {/* Debut Row */}
                <div className={styles.statRow}>
                    <div className={styles.fighter1Value}>
                        {fighter1.debutInformation ? (
                            <div className={styles.debutValue}>
                                <span>{fighter1.debutInformation.competitionMeta?.competitionName || 'Competition'} | Season {fighter1.debutInformation.season}</span>
                                {fighter1.debutInformation.fightId && (
                                    <button
                                        className={styles.debutLinkInline}
                                        onClick={() => navigate(`/fight/${fighter1.debutInformation!.fightId}`)}
                                        title="View debut fight"
                                    >
                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            'N/A'
                        )}
                    </div>
                    <div className={styles.statLabel}>Debut</div>
                    <div className={styles.fighter2Value}>
                        {fighter2.debutInformation ? (
                            <div className={styles.debutValue}>
                                <span>{fighter2.debutInformation.competitionMeta?.competitionName || 'Competition'} | Season {fighter2.debutInformation.season}</span>
                                {fighter2.debutInformation.fightId && (
                                    <button
                                        className={styles.debutLinkInline}
                                        onClick={() => navigate(`/fight/${fighter2.debutInformation!.fightId}`)}
                                        title="View debut fight"
                                    >
                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            'N/A'
                        )}
                    </div>
                </div>

                {renderStatRow(
                    'Rank',
                    fighter1.globalRank?.rank ?? null,
                    fighter2.globalRank?.rank ?? null,
                    getBetterClass(fighter1.globalRank?.rank ?? null, fighter2.globalRank?.rank ?? null, false),
                    getBetterClass(fighter2.globalRank?.rank ?? null, fighter1.globalRank?.rank ?? null, false)
                )}
                {renderStatRow(
                    'Total Fights',
                    fighter1Stats.totalFights,
                    fighter2Stats.totalFights,
                    getBetterClass(fighter1Stats.totalFights, fighter2Stats.totalFights, true),
                    getBetterClass(fighter2Stats.totalFights, fighter1Stats.totalFights, true)
                )}
                {renderStatRow(
                    'Total Wins',
                    fighter1Stats.totalWins,
                    fighter2Stats.totalWins,
                    getBetterClass(fighter1Stats.totalWins, fighter2Stats.totalWins, true),
                    getBetterClass(fighter2Stats.totalWins, fighter1Stats.totalWins, true)
                )}
                {renderStatRow(
                    'Total Losses',
                    fighter1Stats.totalLosses,
                    fighter2Stats.totalLosses,
                    getBetterClass(fighter1Stats.totalLosses, fighter2Stats.totalLosses, false),
                    getBetterClass(fighter2Stats.totalLosses, fighter1Stats.totalLosses, false)
                )}
                {renderStatRow(
                    'Win %',
                    fighter1Stats.winPercentage.toFixed(1) + '%',
                    fighter2Stats.winPercentage.toFixed(1) + '%',
                    getBetterClass(fighter1Stats.winPercentage, fighter2Stats.winPercentage, true),
                    getBetterClass(fighter2Stats.winPercentage, fighter1Stats.winPercentage, true)
                )}
                {renderStatRow(
                    'Titles',
                    fighter1Stats.totalTitles,
                    fighter2Stats.totalTitles,
                    getBetterClass(fighter1Stats.totalTitles, fighter2Stats.totalTitles, true),
                    getBetterClass(fighter2Stats.totalTitles, fighter1Stats.totalTitles, true)
                )}
                {renderStatRow(
                    'Highest Win Streak',
                    fighter1WinStreak,
                    fighter2WinStreak,
                    getBetterClass(fighter1WinStreak, fighter2WinStreak, true),
                    getBetterClass(fighter2WinStreak, fighter1WinStreak, true)
                )}
            </div>

            {/* Category 4: Physical Attributes */}
            <div className={styles.category}>
                <h3 className={styles.categoryTitle}>Physical Attributes</h3>
                {renderStatRow(
                    'Height',
                    fighter1.physicalAttributes?.heightCm 
                        ? `${fighter1.physicalAttributes.heightCm} cm (${fighter1.physicalAttributes.heightFeet})`
                        : 'N/A',
                    fighter2.physicalAttributes?.heightCm 
                        ? `${fighter2.physicalAttributes.heightCm} cm (${fighter2.physicalAttributes.heightFeet})`
                        : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.heightCm || null, fighter2.physicalAttributes?.heightCm || null, true),
                    getBetterClass(fighter2.physicalAttributes?.heightCm || null, fighter1.physicalAttributes?.heightCm || null, true)
                )}
                {renderStatRow(
                    'Weight',
                    fighter1.physicalAttributes?.weightKg ? `${fighter1.physicalAttributes.weightKg} kg` : 'N/A',
                    fighter2.physicalAttributes?.weightKg ? `${fighter2.physicalAttributes.weightKg} kg` : 'N/A'
                )}
                {renderStatRow(
                    'Arm Reach',
                    fighter1.physicalAttributes?.armReach ? `${fighter1.physicalAttributes.armReach} cm` : 'N/A',
                    fighter2.physicalAttributes?.armReach ? `${fighter2.physicalAttributes.armReach} cm` : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.armReach || null, fighter2.physicalAttributes?.armReach || null, true),
                    getBetterClass(fighter2.physicalAttributes?.armReach || null, fighter1.physicalAttributes?.armReach || null, true)
                )}
                {renderStatRow(
                    'Leg Reach',
                    fighter1.physicalAttributes?.legReach ? `${fighter1.physicalAttributes.legReach} cm` : 'N/A',
                    fighter2.physicalAttributes?.legReach ? `${fighter2.physicalAttributes.legReach} cm` : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.legReach || null, fighter2.physicalAttributes?.legReach || null, true),
                    getBetterClass(fighter2.physicalAttributes?.legReach || null, fighter1.physicalAttributes?.legReach || null, true)
                )}
                {renderStatRow(
                    'Body Type',
                    fighter1.physicalAttributes?.bodyType || 'N/A',
                    fighter2.physicalAttributes?.bodyType || 'N/A'
                )}
            </div>

            {/* Category 5: Power Statistics */}
            <div className={styles.category}>
                <h3 className={styles.categoryTitle}>Power Statistics</h3>
                {renderStatRow(
                    'KO Power',
                    fighter1.physicalAttributes?.koPower !== undefined ? fighter1.physicalAttributes.koPower : 'N/A',
                    fighter2.physicalAttributes?.koPower !== undefined ? fighter2.physicalAttributes.koPower : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.koPower ?? null, fighter2.physicalAttributes?.koPower ?? null, true),
                    getBetterClass(fighter2.physicalAttributes?.koPower ?? null, fighter1.physicalAttributes?.koPower ?? null, true)
                )}
                {renderStatRow(
                    'Durability',
                    fighter1.physicalAttributes?.durability !== undefined ? fighter1.physicalAttributes.durability : 'N/A',
                    fighter2.physicalAttributes?.durability !== undefined ? fighter2.physicalAttributes.durability : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.durability ?? null, fighter2.physicalAttributes?.durability ?? null, true),
                    getBetterClass(fighter2.physicalAttributes?.durability ?? null, fighter1.physicalAttributes?.durability ?? null, true)
                )}
                {renderStatRow(
                    'Strength',
                    fighter1.physicalAttributes?.strength !== undefined ? fighter1.physicalAttributes.strength : 'N/A',
                    fighter2.physicalAttributes?.strength !== undefined ? fighter2.physicalAttributes.strength : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.strength ?? null, fighter2.physicalAttributes?.strength ?? null, true),
                    getBetterClass(fighter2.physicalAttributes?.strength ?? null, fighter1.physicalAttributes?.strength ?? null, true)
                )}
                {renderStatRow(
                    'Endurance',
                    fighter1.physicalAttributes?.endurance !== undefined ? fighter1.physicalAttributes.endurance : 'N/A',
                    fighter2.physicalAttributes?.endurance !== undefined ? fighter2.physicalAttributes.endurance : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.endurance ?? null, fighter2.physicalAttributes?.endurance ?? null, true),
                    getBetterClass(fighter2.physicalAttributes?.endurance ?? null, fighter1.physicalAttributes?.endurance ?? null, true)
                )}
                {renderStatRow(
                    'Agility',
                    fighter1.physicalAttributes?.agility !== undefined ? fighter1.physicalAttributes.agility : 'N/A',
                    fighter2.physicalAttributes?.agility !== undefined ? fighter2.physicalAttributes.agility : 'N/A',
                    getBetterClass(fighter1.physicalAttributes?.agility ?? null, fighter2.physicalAttributes?.agility ?? null, true),
                    getBetterClass(fighter2.physicalAttributes?.agility ?? null, fighter1.physicalAttributes?.agility ?? null, true)
                )}
            </div>
        </div>
    );
};

export default StatsComparison;

