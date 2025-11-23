import React, { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faFire } from '@fortawesome/free-solid-svg-icons';
import S3Image from '../S3Image/S3Image';
import styles from './GlobalRankings.module.css';

// Competition IDs - Configurable via environment variables
// Falls back to staging IDs if not set
const COMPETITION_IDS = {
    IFC: process.env.REACT_APP_COMPETITION_ID_IFC || '67780dcc09a4c4b25127f8f6',
    IFL: process.env.REACT_APP_COMPETITION_ID_IFL || '67780e1d09a4c4b25127f8f8',
    CHAMPIONS_CUP: process.env.REACT_APP_COMPETITION_ID_CC || '6778100309a4c4b25127f8fa',
    INVICTA_CUP: process.env.REACT_APP_COMPETITION_ID_IC || '6778103309a4c4b25127f8fc'
};

interface CompetitionMeta {
    id: string;
    competitionName: string;
    shortName?: string;
    logo: string;
}

interface TitleData {
    competitionId: string;
    numberOfTitles: number;
    competition?: CompetitionMeta;
}

interface CupAppearance {
    competitionId: string;
    appearances: number;
    competition?: CompetitionMeta;
}

interface DivisionAppearance {
    division: number;
    appearances: number;
}

interface LeagueAppearance {
    competitionId: string;
    divisionAppearances: DivisionAppearance[];
    competition?: CompetitionMeta;
}

interface CompetitionHistory {
    competitionId: string;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
}

interface Streak {
    competitionId: string;
    type: string;
    count: number;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    competitionHistory?: CompetitionHistory[];
    streaks?: Streak[];
}

interface RankedFighter {
    fighterId: string;
    score: number;
    rank: number;
    titles: TitleData[];
    cupAppearances: CupAppearance[];
    leagueAppearances: LeagueAppearance[];
    fighter: Fighter;
}

interface GlobalRankingsProps {
    rankedFighters: RankedFighter[];
}

const GlobalRankings: React.FC<GlobalRankingsProps> = ({ rankedFighters }) => {
    const navigate = useNavigate();

    const processedRankings = useMemo(() => {
        return rankedFighters.map(rf => {
            // Calculate overall win percentage
            let totalWins = 0;
            let totalFights = 0;
            if (rf.fighter.competitionHistory) {
                rf.fighter.competitionHistory.forEach(comp => {
                    totalWins += comp.totalWins || 0;
                    totalFights += comp.totalFights || 0;
                });
            }
            const overallWinPercentage = totalFights > 0 ? (totalWins / totalFights) * 100 : 0;

            // Get league titles (IFC + IFL combined)
            const ifcTitles = rf.titles.find(t => t.competitionId === COMPETITION_IDS.IFC)?.numberOfTitles || 0;
            const iflTitles = rf.titles.find(t => t.competitionId === COMPETITION_IDS.IFL)?.numberOfTitles || 0;
            const leagueTitles = ifcTitles + iflTitles;

            // Get CC titles
            const ccTitles = rf.titles.find(t => t.competitionId === COMPETITION_IDS.CHAMPIONS_CUP)?.numberOfTitles || 0;

            // Get IC titles
            const icTitles = rf.titles.find(t => t.competitionId === COMPETITION_IDS.INVICTA_CUP)?.numberOfTitles || 0;

            // Get cup appearances
            const ccAppearances = rf.cupAppearances.find(c => c.competitionId === COMPETITION_IDS.CHAMPIONS_CUP)?.appearances || 0;
            const icAppearances = rf.cupAppearances.find(c => c.competitionId === COMPETITION_IDS.INVICTA_CUP)?.appearances || 0;

            // Get division appearances (check both IFC and IFL)
            const ifcLeague = rf.leagueAppearances.find(l => l.competitionId === COMPETITION_IDS.IFC);
            const iflLeague = rf.leagueAppearances.find(l => l.competitionId === COMPETITION_IDS.IFL);
            
            const ifcDiv1 = ifcLeague?.divisionAppearances.find(d => d.division === 1)?.appearances || 0;
            const ifcDiv2 = ifcLeague?.divisionAppearances.find(d => d.division === 2)?.appearances || 0;
            const ifcDiv3 = ifcLeague?.divisionAppearances.find(d => d.division === 3)?.appearances || 0;
            
            const iflDiv1 = iflLeague?.divisionAppearances.find(d => d.division === 1)?.appearances || 0;
            const iflDiv2 = iflLeague?.divisionAppearances.find(d => d.division === 2)?.appearances || 0;
            const iflDiv3 = iflLeague?.divisionAppearances.find(d => d.division === 3)?.appearances || 0;
            
            const div1Apps = ifcDiv1 + iflDiv1;
            const div2Apps = ifcDiv2 + iflDiv2;
            const div3Apps = ifcDiv3 + iflDiv3;

            // Get longest win streak
            const winStreaks = rf.fighter.streaks?.filter(s => s.type === 'win') || [];
            const longestStreak = winStreaks.length > 0 ? Math.max(...winStreaks.map(s => s.count)) : 0;

            return {
                ...rf,
                breakdown: {
                    overallWinPercentage,
                    leagueTitles,
                    ccTitles,
                    icTitles,
                    ccAppearances,
                    icAppearances,
                    div1Apps,
                    div2Apps,
                    div3Apps,
                    longestStreak
                }
            };
        });
    }, [rankedFighters]);

    const handleRowClick = (fighterId: string) => {
        navigate(`/fighters/${fighterId}`);
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) {
            return <FontAwesomeIcon icon={faTrophy} className={styles.goldMedal} />;
        } else if (rank === 2) {
            return <FontAwesomeIcon icon={faMedal} className={styles.silverMedal} />;
        } else if (rank === 3) {
            return <FontAwesomeIcon icon={faMedal} className={styles.bronzeMedal} />;
        }
        return null;
    };

    return (
        <div className={styles.globalRankingsContainer}>
            <div className={styles.header}>
                <FontAwesomeIcon icon={faTrophy} className={styles.headerIcon} />
                <h1>Global Rankings</h1>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.rankingsTable}>
                    <thead>
                        <tr>
                            <th className={styles.rankColumn}>Rank</th>
                            <th className={styles.fighterColumn}>Fighter</th>
                            <th className={styles.scoreColumn}>Score</th>
                            <th className={styles.statColumn}>Win %</th>
                            <th className={styles.statColumn} title="League Titles">
                                <FontAwesomeIcon icon={faTrophy} /> League
                            </th>
                            <th className={styles.statColumn} title="Champions Cup Titles">
                                <FontAwesomeIcon icon={faTrophy} /> CC
                            </th>
                            <th className={styles.statColumn} title="Invicta Cup Titles">
                                <FontAwesomeIcon icon={faTrophy} /> IC
                            </th>
                            <th className={styles.statColumn} title="Champions Cup Appearances">CC Apps</th>
                            <th className={styles.statColumn} title="Invicta Cup Appearances">IC Apps</th>
                            <th className={styles.statColumn} title="Division 1 Appearances">Div 1</th>
                            <th className={styles.statColumn} title="Division 2 Appearances">Div 2</th>
                            <th className={styles.statColumn} title="Division 3 Appearances">Div 3</th>
                            <th className={styles.statColumn} title="Longest Win Streak">
                                <FontAwesomeIcon icon={faFire} /> Streak
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedRankings.map((rf) => (
                            <tr
                                key={rf.fighterId}
                                className={styles.rankingRow}
                                onClick={() => handleRowClick(rf.fighterId)}
                            >
                                <td className={styles.rankCell}>
                                    <div className={styles.rankContent}>
                                        {getRankBadge(rf.rank)}
                                        <span className={styles.rankNumber}>{rf.rank}</span>
                                    </div>
                                </td>
                                <td className={styles.fighterCell}>
                                    <div className={styles.fighterInfo}>
                                        {rf.fighter.profileImage && (
                                            <S3Image
                                                src={rf.fighter.profileImage}
                                                alt={`${rf.fighter.firstName} ${rf.fighter.lastName}`}
                                                className={styles.fighterImage}
                                            />
                                        )}
                                        <span className={styles.fighterName}>
                                            {rf.fighter.firstName} {rf.fighter.lastName}
                                        </span>
                                    </div>
                                </td>
                                <td className={styles.scoreCell}>
                                    <strong>{rf.score.toFixed(2)}</strong>
                                </td>
                                <td className={styles.statCell}>
                                    {rf.breakdown.overallWinPercentage.toFixed(1)}%
                                </td>
                                <td className={styles.statCell}>
                                    {rf.breakdown.leagueTitles > 0 ? (
                                        <span className={styles.highlight}>{rf.breakdown.leagueTitles}</span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className={styles.statCell}>
                                    {rf.breakdown.ccTitles > 0 ? (
                                        <span className={styles.highlight}>{rf.breakdown.ccTitles}</span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className={styles.statCell}>
                                    {rf.breakdown.icTitles > 0 ? (
                                        <span className={styles.highlight}>{rf.breakdown.icTitles}</span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className={styles.statCell}>{rf.breakdown.ccAppearances || '—'}</td>
                                <td className={styles.statCell}>{rf.breakdown.icAppearances || '—'}</td>
                                <td className={styles.statCell}>{rf.breakdown.div1Apps || '—'}</td>
                                <td className={styles.statCell}>{rf.breakdown.div2Apps || '—'}</td>
                                <td className={styles.statCell}>{rf.breakdown.div3Apps || '—'}</td>
                                <td className={styles.statCell}>
                                    {rf.breakdown.longestStreak > 0 ? (
                                        <span className={styles.streakBadge}>{rf.breakdown.longestStreak}</span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {processedRankings.length === 0 && (
                <div className={styles.noData}>
                    <p>No global rankings available yet.</p>
                </div>
            )}
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(GlobalRankings);

