import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faChevronLeft,
    faArrowUp,
    faArrowDown,
    faChevronDown,
    faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { GET_SEASON_DETAILS } from '../../services/queries';
import styles from './DetailedTimelinePage.module.css';

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
    fightIdentifier?: string;
    date?: string;
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
    startDate?: string;
    endDate?: string;
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

interface FightWithContext {
    fight: Fight;
    divisionNumber: number;
    divisionName?: string;
    roundNumber: number;
    date: Date;
    fighter1Data?: Fighter;
    fighter2Data?: Fighter;
}

interface DayGroup {
    date: Date;
    dateString: string;
    fightCount: number;
    divisionGroups: {
        divisionNumber: number;
        divisionName?: string;
        fights: FightWithContext[];
    }[];
}

const DetailedTimelinePage: React.FC = () => {
    const { competitionId, seasonId } = useParams<{ competitionId: string; seasonId: string }>();
    const navigate = useNavigate();
    const [sortAscending, setSortAscending] = useState(true);
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

    const { loading, error, data } = useQuery(GET_SEASON_DETAILS, {
        variables: { id: seasonId },
        skip: !seasonId
    });

    // Scroll to top when component loads
    React.useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [seasonId]);

    // Update page title
    React.useEffect(() => {
        if (data?.getCompetitionSeason) {
            const season = data.getCompetitionSeason;
            document.title = `Amoyan FC | Season ${season.seasonMeta.seasonNumber} Timeline`;
        }
    }, [data]);

    const timelineData = useMemo(() => {
        if (!data?.getCompetitionSeason) return [];

        const season: Season = data.getCompetitionSeason;
        const fightsWithContext: FightWithContext[] = [];

        // Collect all fights with context
        season.leagueData?.divisions?.forEach(division => {
            division.rounds?.forEach(round => {
                round.fights.forEach(fight => {
                    if (fight.date && fight.fightStatus === 'completed') {
                        const divMeta = season.seasonMeta.leagueDivisions?.find(
                            d => d.divisionNumber === division.divisionNumber
                        );
                        const fighter1Data = divMeta?.fighters.find(f => f.id === fight.fighter1);
                        const fighter2Data = divMeta?.fighters.find(f => f.id === fight.fighter2);

                        fightsWithContext.push({
                            fight,
                            divisionNumber: division.divisionNumber,
                            divisionName: division.divisionName,
                            roundNumber: round.roundNumber,
                            date: new Date(fight.date),
                            fighter1Data,
                            fighter2Data
                        });
                    }
                });
            });
        });

        // Sort by date
        fightsWithContext.sort((a, b) => {
            return sortAscending 
                ? a.date.getTime() - b.date.getTime()
                : b.date.getTime() - a.date.getTime();
        });

        // Group by day
        const dayGroups: Map<string, DayGroup> = new Map();

        fightsWithContext.forEach(fightCtx => {
            const dateString = fightCtx.date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            if (!dayGroups.has(dateString)) {
                dayGroups.set(dateString, {
                    date: fightCtx.date,
                    dateString,
                    fightCount: 0,
                    divisionGroups: []
                });
            }

            const dayGroup = dayGroups.get(dateString)!;
            dayGroup.fightCount++;

            // Find or create division group
            let divGroup = dayGroup.divisionGroups.find(
                dg => dg.divisionNumber === fightCtx.divisionNumber
            );

            if (!divGroup) {
                divGroup = {
                    divisionNumber: fightCtx.divisionNumber,
                    divisionName: fightCtx.divisionName,
                    fights: []
                };
                dayGroup.divisionGroups.push(divGroup);
            }

            divGroup.fights.push(fightCtx);
        });

        // Sort division groups by division number
        dayGroups.forEach(dayGroup => {
            dayGroup.divisionGroups.sort((a, b) => a.divisionNumber - b.divisionNumber);
        });

        return Array.from(dayGroups.values());
    }, [data, sortAscending]);

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleFightClick = (fightId: string) => {
        navigate(`/fight/${fightId}`);
    };

    const toggleDayCollapse = (dateString: string) => {
        setCollapsedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateString)) {
                newSet.delete(dateString);
            } else {
                newSet.add(dateString);
            }
            return newSet;
        });
    };

    if (loading) {
        return (
            <div className={styles.detailedTimelinePage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingSpinner} />
                    Loading timeline...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.detailedTimelinePage}>
                <div className={styles.error}>
                    Error: {error.message}
                </div>
            </div>
        );
    }

    if (!data?.getCompetitionSeason) {
        return (
            <div className={styles.detailedTimelinePage}>
                <div className={styles.error}>
                    Season not found
                </div>
            </div>
        );
    }

    const season: Season = data.getCompetitionSeason;

    return (
        <div className={styles.detailedTimelinePage}>
            <div className={styles.pageContent}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>
                            Season {season.seasonMeta.seasonNumber} Timeline
                        </h1>
                        <button 
                            className={styles.backButton}
                            onClick={() => navigate(`/competition/${competitionId}/season/${seasonId}`)}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} />
                            Back to Season
                        </button>
                    </div>
                    <button 
                        className={styles.sortButton}
                        onClick={() => setSortAscending(!sortAscending)}
                    >
                        <FontAwesomeIcon icon={sortAscending ? faArrowUp : faArrowDown} />
                        {sortAscending ? 'Oldest First' : 'Newest First'}
                    </button>
                </div>

                {/* Timeline */}
                {timelineData.length === 0 ? (
                    <div className={styles.noData}>
                        <p>No fights have been completed yet</p>
                    </div>
                ) : (
                    <div className={styles.timeline}>
                        {timelineData.map((dayGroup, dayIndex) => {
                            const isCollapsed = collapsedDays.has(dayGroup.dateString);
                            
                            return (
                                <div key={dayGroup.dateString} className={styles.timelineDay}>
                                    {/* Timeline Node */}
                                    <div className={styles.timelineNode}>
                                        <div className={styles.timelineCircle} />
                                        {dayIndex < timelineData.length - 1 && (
                                            <div className={styles.timelineLine} />
                                        )}
                                    </div>

                                    {/* Day Content */}
                                    <div className={styles.dayContent}>
                                        <div 
                                            className={styles.dayHeader}
                                            onClick={() => toggleDayCollapse(dayGroup.dateString)}
                                        >
                                            <div className={styles.dayHeaderLeft}>
                                                <h2 className={styles.dayDate}>{dayGroup.dateString}</h2>
                                                <span className={styles.fightCount}>
                                                    {dayGroup.fightCount} {dayGroup.fightCount === 1 ? 'fight' : 'fights'}
                                                </span>
                                            </div>
                                            <FontAwesomeIcon 
                                                icon={isCollapsed ? faChevronDown : faChevronUp} 
                                                className={styles.collapseIcon}
                                            />
                                        </div>

                                    {/* Division Groups */}
                                    {!isCollapsed && (
                                        <div className={styles.divisionGroups}>
                                            {dayGroup.divisionGroups.map(divGroup => (
                                            <div key={divGroup.divisionNumber} className={styles.divisionGroup}>
                                                <div className={styles.divisionLabel}>
                                                    {divGroup.divisionName || `Division ${divGroup.divisionNumber}`}
                                                </div>
                                                <div className={styles.fightCards}>
                                                    {divGroup.fights.map(fightCtx => (
                                                        <div 
                                                            key={fightCtx.fight._id}
                                                            className={styles.fightCard}
                                                            onClick={() => handleFightClick(fightCtx.fight._id)}
                                                        >
                                                            <div className={styles.fightTime}>
                                                                {formatTime(fightCtx.date)}
                                                            </div>
                                                            <div className={styles.fighters}>
                                                                {/* Fighter 1 */}
                                                                <div 
                                                                    className={`${styles.fighter} ${
                                                                        fightCtx.fight.winner === fightCtx.fight.fighter1 
                                                                            ? styles.winner 
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    {fightCtx.fighter1Data?.profileImage ? (
                                                                        <img 
                                                                            src={fightCtx.fighter1Data.profileImage} 
                                                                            alt={fightCtx.fighter1Data.firstName}
                                                                            className={styles.fighterImage}
                                                                        />
                                                                    ) : (
                                                                        <div className={styles.fighterPlaceholder}>
                                                                            {fightCtx.fighter1Data?.firstName.charAt(0)}
                                                                            {fightCtx.fighter1Data?.lastName.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                    {fightCtx.fighter1Data && (
                                                                        <span className={styles.fighterName}>
                                                                            {fightCtx.fighter1Data.firstName} {fightCtx.fighter1Data.lastName}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <span className={styles.vs}>vs</span>

                                                                {/* Fighter 2 */}
                                                                <div 
                                                                    className={`${styles.fighter} ${
                                                                        fightCtx.fight.winner === fightCtx.fight.fighter2 
                                                                            ? styles.winner 
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    {fightCtx.fighter2Data?.profileImage ? (
                                                                        <img 
                                                                            src={fightCtx.fighter2Data.profileImage} 
                                                                            alt={fightCtx.fighter2Data.firstName}
                                                                            className={styles.fighterImage}
                                                                        />
                                                                    ) : (
                                                                        <div className={styles.fighterPlaceholder}>
                                                                            {fightCtx.fighter2Data?.firstName.charAt(0)}
                                                                            {fightCtx.fighter2Data?.lastName.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                    {fightCtx.fighter2Data && (
                                                                        <span className={styles.fighterName}>
                                                                            {fightCtx.fighter2Data.firstName} {fightCtx.fighter2Data.lastName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedTimelinePage;

