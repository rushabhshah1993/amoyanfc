import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { GET_CURRENT_GLOBAL_RANK } from '../../services/queries';
import GlobalRankings from '../../components/GlobalRankings';
import styles from './GlobalRankingsPage.module.css';

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

interface GlobalRankData {
    id: string;
    createdAt: string;
    updatedAt: string;
    isCurrent: boolean;
    fighters: RankedFighter[];
}

const GlobalRankingsPage: React.FC = () => {
    const { loading, error, data } = useQuery<{ getCurrentGlobalRank: GlobalRankData }>(GET_CURRENT_GLOBAL_RANK, {
        fetchPolicy: 'cache-first', // Use cached data first, only fetch if not available
        nextFetchPolicy: 'cache-first', // Keep using cache for subsequent queries
    });

    useEffect(() => {
        document.title = 'Amoyan FC | Global Rankings';
    }, []);

    if (loading) {
        return (
            <div className={styles.loading}>
                <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                <p>Loading global rankings...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <h2>Error Loading Rankings</h2>
                <p>{error.message}</p>
            </div>
        );
    }

    const globalRankData = data?.getCurrentGlobalRank;

    if (!globalRankData || !globalRankData.fighters || globalRankData.fighters.length === 0) {
        return (
            <div className={styles.noData}>
                <h2>No Global Rankings Available</h2>
                <p>Global rankings have not been calculated yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <GlobalRankings rankedFighters={globalRankData.fighters} />
            
            <div className={styles.footer}>
                <p className={styles.updateInfo}>
                    Last updated: {new Date(globalRankData.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </div>
        </div>
    );
};

export default GlobalRankingsPage;

