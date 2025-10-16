import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import S3Image from '../S3Image/S3Image';
import styles from './CompetitionHistory.module.css';

interface TitleDetail {
    competitionSeasonId: string;
    seasonNumber: number;
    divisionNumber: number;
}

interface CompetitionHistoryItem {
    competitionId: string;
    numberOfSeasonAppearances: number;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    competitionMeta?: {
        id: string;
        competitionName: string;
        logo: string;
    };
    titles: {
        totalTitles: number;
        details: TitleDetail[];
    };
}

interface CompetitionHistoryProps {
    competitionHistory: CompetitionHistoryItem[];
}

const CompetitionHistory: React.FC<CompetitionHistoryProps> = ({ competitionHistory }) => {
    const formatTitles = (titles: { totalTitles: number; details: TitleDetail[] }): string => {
        if (!titles || titles.totalTitles === 0) return '';

        const titleCount = `${titles.totalTitles}x Champion`;
        
        // Group titles by division
        const divisionGroups: Record<number, number[]> = {};
        titles.details.forEach(detail => {
            const divNum = detail.divisionNumber;
            if (!divisionGroups[divNum]) {
                divisionGroups[divNum] = [];
            }
            divisionGroups[divNum].push(detail.seasonNumber);
        });

        // Format each division group
        const divisionStrings = Object.entries(divisionGroups).map(([divNum, seasons]) => {
            const seasonList = seasons.sort((a, b) => a - b).map(s => `S${s}`).join(', ');
            
            // Always show division number for IFC titles (since IFC always has multiple divisions)
            // This ensures division numbers are displayed consistently
            return `${seasonList} (Division ${divNum})`;
        });

        return `${titleCount} • ${divisionStrings.join(' | ')}`;
    };

    if (!competitionHistory || competitionHistory.length === 0) {
        return null;
    }

    return (
        <div className={styles.competitionHistorySection}>
            <h2 className={styles.sectionTitle}>Competition History</h2>
            <div className={styles.competitionsGrid}>
                {competitionHistory.map((history, index) => {
                    const meta = history.competitionMeta;
                    if (!meta) return null;

                    const titlesText = formatTitles(history.titles);

                    return (
                        <div key={index} className={styles.competitionCard}>
                            {/* Left: Competition Logo */}
                            <div className={styles.logoSection}>
                                <S3Image
                                    src={meta.logo}
                                    alt={meta.competitionName}
                                    className={styles.competitionLogo}
                                    width={180}
                                    height={180}
                                    fallback={
                                        <div className={styles.logoPlaceholder}>
                                            {meta.competitionName.charAt(0)}
                                        </div>
                                    }
                                />
                            </div>

                            {/* Right: Stats */}
                            <div className={styles.statsSection}>
                                <h3 className={styles.competitionName}>{meta.competitionName}</h3>
                                
                                {titlesText && (
                                    <div className={styles.titlesRow}>
                                        <FontAwesomeIcon icon={faTrophy} className={styles.trophyIcon} />
                                        <span className={styles.titlesText}>{titlesText}</span>
                                    </div>
                                )}

                                <div className={styles.statsGrid}>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Season Appearances</span>
                                        <span className={styles.statValue}>{history.numberOfSeasonAppearances}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Total Fights</span>
                                        <span className={styles.statValue}>{history.totalFights}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Total Wins</span>
                                        <span className={styles.statValue}>{history.totalWins}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Total Losses</span>
                                        <span className={styles.statValue}>{history.totalLosses}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>Win Percentage</span>
                                        <span className={styles.statValue}>{history.winPercentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CompetitionHistory;
