import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@apollo/client';
import { GET_ALL_FIGHTERS_WITH_STATS } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import styles from './FightersSortingPage.module.css';

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

interface Location {
    city?: string;
    country?: string;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    profileImage?: string;
    location?: Location;
    physicalAttributes?: PhysicalAttributes;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    totalSeasons: number;
    totalOpponents: number;
    totalTitles: number;
    highestWinStreak: number;
    highestLoseStreak: number;
}

type SortMetric = 
    | 'age'
    | 'height'
    | 'weight'
    | 'armReach'
    | 'legReach'
    | 'fightsOverall'
    | 'winsOverall'
    | 'defeatsOverall'
    | 'winPercentageOverall'
    | 'seasonsInIFC'
    | 'winPercentageIFC'
    | 'opponentsFaced'
    | 'titles'
    | 'highestWinStreak'
    | 'highestLoseStreak'
    | 'koPower'
    | 'durability'
    | 'strength'
    | 'endurance'
    | 'agility';

const metricLabels: Record<SortMetric, string> = {
    age: 'Age',
    height: 'Height',
    weight: 'Weight',
    armReach: 'Arm Reach',
    legReach: 'Leg Reach',
    fightsOverall: 'Number of Fights Overall',
    winsOverall: 'Number of Wins Overall',
    defeatsOverall: 'Number of Defeats Overall',
    winPercentageOverall: 'Win % Overall',
    seasonsInIFC: 'Number of Seasons in IFC',
    winPercentageIFC: 'Win % in IFC',
    opponentsFaced: 'Opponents Faced',
    titles: 'Number of Titles',
    highestWinStreak: 'Highest Win Streak',
    highestLoseStreak: 'Highest Lose Streak',
    koPower: 'KO Power',
    durability: 'Durability',
    strength: 'Strength',
    endurance: 'Endurance',
    agility: 'Agility'
};

const getMetricValue = (fighter: Fighter, metric: SortMetric): number => {
    switch (metric) {
        case 'age':
            if (!fighter.dateOfBirth) return -1;
            const birthDate = new Date(fighter.dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                return age - 1;
            }
            return age;
        
        case 'height':
            return fighter.physicalAttributes?.heightCm ?? -1;
        
        case 'weight':
            return fighter.physicalAttributes?.weightKg ?? -1;
        
        case 'armReach':
            return fighter.physicalAttributes?.armReach ?? -1;
        
        case 'legReach':
            return fighter.physicalAttributes?.legReach ?? -1;
        
        case 'fightsOverall':
            return fighter.totalFights ?? 0;
        
        case 'winsOverall':
            return fighter.totalWins ?? 0;
        
        case 'defeatsOverall':
            return fighter.totalLosses ?? 0;
        
        case 'winPercentageOverall':
            return fighter.winPercentage ?? 0;
        
        case 'seasonsInIFC':
            return fighter.totalSeasons ?? 0;
        
        case 'winPercentageIFC':
            return fighter.winPercentage ?? 0;
        
        case 'opponentsFaced':
            return fighter.totalOpponents ?? 0;
        
        case 'titles':
            return fighter.totalTitles ?? 0;
        
        case 'highestWinStreak':
            return fighter.highestWinStreak ?? 0;
        
        case 'highestLoseStreak':
            return fighter.highestLoseStreak ?? 0;
        
        case 'koPower':
            return fighter.physicalAttributes?.koPower ?? -1;
        
        case 'durability':
            return fighter.physicalAttributes?.durability ?? -1;
        
        case 'strength':
            return fighter.physicalAttributes?.strength ?? -1;
        
        case 'endurance':
            return fighter.physicalAttributes?.endurance ?? -1;
        
        case 'agility':
            return fighter.physicalAttributes?.agility ?? -1;
        
        default:
            return 0;
    }
};

const formatMetricValue = (fighter: Fighter, metric: SortMetric): string => {
    const value = getMetricValue(fighter, metric);
    
    if (value === -1) return 'N/A';
    
    switch (metric) {
        case 'age':
            return `${value} years`;
        case 'height':
            const heightFeet = fighter.physicalAttributes?.heightFeet;
            if (heightFeet) {
                return `${value} cm (${heightFeet})`;
            }
            return `${value} cm`;
        case 'weight':
            return `${value} kg`;
        case 'armReach':
        case 'legReach':
            return `${value} cm`;
        case 'winPercentageOverall':
        case 'winPercentageIFC':
            return `${value.toFixed(1)}%`;
        default:
            return value.toString();
    }
};

const FightersSortingPage: React.FC = () => {
    const navigate = useNavigate();
    const { loading, error, data } = useQuery(GET_ALL_FIGHTERS_WITH_STATS);
    const [selectedMetric, setSelectedMetric] = useState<SortMetric>('fightsOverall');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        document.title = 'Amoyan FC | Sort Fighters';
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(`.${styles.dropdownContainer}`)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) return (
        <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
            Loading fighters...
        </div>
    );
    
    if (error) return <div className={styles.error}>Error: {error.message}</div>;

    const fighters: Fighter[] = data?.getAllFightersWithBasicStats || [];

    // Filter metrics based on search query
    const filteredMetrics = (Object.keys(metricLabels) as SortMetric[]).filter(metric =>
        metricLabels[metric].toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort fighters based on selected metric and order
    const sortedFighters = [...fighters]
        .filter(fighter => getMetricValue(fighter, selectedMetric) !== -1)
        .sort((a, b) => {
            const valueA = getMetricValue(a, selectedMetric);
            const valueB = getMetricValue(b, selectedMetric);
            return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
        });

    const handleMetricSelect = (metric: SortMetric) => {
        setSelectedMetric(metric);
        setSearchQuery('');
        setShowDropdown(false);
    };

    return (
        <div className={styles.sortingPage}>
            <div className={styles.contentSection}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Sort Fighters</h2>
                </div>

                <div className={styles.controls}>
                    <div className={styles.dropdownContainer}>
                        <input
                            type="text"
                            placeholder={metricLabels[selectedMetric]}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className={styles.searchInput}
                        />
                        {showDropdown && (
                            <div className={styles.dropdown}>
                                {filteredMetrics.length > 0 ? (
                                    filteredMetrics.map((metric) => (
                                        <div
                                            key={metric}
                                            className={`${styles.dropdownItem} ${selectedMetric === metric ? styles.selected : ''}`}
                                            onClick={() => handleMetricSelect(metric)}
                                        >
                                            {metricLabels[metric]}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.dropdownEmpty}>No metrics found</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles.sortButtons}>
                        <button
                            className={`${styles.sortButton} ${sortOrder === 'asc' ? styles.active : ''}`}
                            onClick={() => setSortOrder('asc')}
                            title="Ascending"
                        >
                            <FontAwesomeIcon icon={faSortUp} />
                        </button>
                        <button
                            className={`${styles.sortButton} ${sortOrder === 'desc' ? styles.active : ''}`}
                            onClick={() => setSortOrder('desc')}
                            title="Descending"
                        >
                            <FontAwesomeIcon icon={faSortDown} />
                        </button>
                    </div>
                </div>

                {sortedFighters.length === 0 ? (
                    <div className={styles.noFighters}>
                        <FontAwesomeIcon icon={faUser} className={styles.noFightersIcon} />
                        No fighters found with data for this metric.
                    </div>
                ) : (
                    <div className={styles.fightersList}>
                        {sortedFighters.map((fighter, index) => (
                            <div
                                key={fighter.id}
                                className={styles.fighterRow}
                                onClick={() => navigate(`/fighter/${fighter.id}`)}
                            >
                                <div className={styles.rank}>#{index + 1}</div>
                                <div className={styles.thumbnail}>
                                    <S3Image
                                        src={fighter.profileImage}
                                        alt={`${fighter.firstName} ${fighter.lastName}`}
                                        className={styles.fighterImage}
                                        width={60}
                                        height={60}
                                        lazy={true}
                                        retryCount={3}
                                        retryDelay={1000}
                                        disableHoverScale={true}
                                        fallback={
                                            <div className={styles.fighterPlaceholder}>
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                        }
                                        loading={
                                            <div className={styles.fighterLoading}>
                                                <FontAwesomeIcon icon={faSpinner} spin />
                                            </div>
                                        }
                                    />
                                </div>
                                <div className={styles.fighterName}>
                                    {fighter.firstName} {fighter.lastName}
                                </div>
                                <div className={styles.metricValue}>
                                    {formatMetricValue(fighter, selectedMetric)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FightersSortingPage;

