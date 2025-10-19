import React, { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import styles from './SeasonTimeline.module.css';

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

interface SeasonTimelineProps {
    season: Season;
}

interface FightMarker {
    fight: Fight;
    divisionNumber: number;
    roundNumber: number;
    date: Date;
    fighter1Data?: Fighter;
    fighter2Data?: Fighter;
    xPosition: number;
}

interface DurationBreakdown {
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalDays: number;
}

const SeasonTimeline: React.FC<SeasonTimelineProps> = ({ season }) => {
    const [hoveredFight, setHoveredFight] = useState<FightMarker | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Initialize dates (hooks must be called before any early returns)
    const startDate = season.seasonMeta.startDate ? new Date(season.seasonMeta.startDate) : null;
    const endDate = season.seasonMeta.endDate ? new Date(season.seasonMeta.endDate) : null;
    const now = new Date();
    const isOngoing = season.isActive && endDate && now < endDate;

    // Calculate duration
    const calculateDuration = (start: Date, end: Date): DurationBreakdown => {
        const diff = end.getTime() - start.getTime();
        const totalSeconds = Math.floor(diff / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        const totalDays = Math.floor(totalHours / 24);
        const totalMonths = Math.floor(totalDays / 30.44); // Average month length

        return {
            months: totalMonths,
            days: totalDays % 30,
            hours: totalHours % 24,
            minutes: totalMinutes % 60,
            seconds: totalSeconds % 60,
            totalDays
        };
    };

    const duration = useMemo(() => {
        if (!startDate || !endDate) return null;
        return isOngoing 
            ? calculateDuration(startDate, now)
            : calculateDuration(startDate, endDate);
    }, [startDate, endDate, isOngoing, now]);

    // Generate colors for divisions
    const generateDivisionColor = (divisionIndex: number, totalDivisions: number): string => {
        const hueStep = 360 / totalDivisions;
        const hue = (divisionIndex * hueStep) % 360;
        return `hsl(${hue}, 60%, 55%)`;
    };

    // Process fights data
    const { fightMarkers, divisions, minDate, maxDate } = useMemo(() => {
        const markers: FightMarker[] = [];
        const divs: Division[] = season.leagueData?.divisions || [];
        
        let earliest: Date | null = null;
        let latest: Date | null = null;

        if (startDate && endDate) {
            divs.forEach(division => {
                division.rounds?.forEach(round => {
                    round.fights.forEach(fight => {
                        if (fight.date && fight.fightStatus === 'completed') {
                            const fightDate = new Date(fight.date);
                            
                            // Find fighter data
                            const divMeta = season.seasonMeta.leagueDivisions?.find(
                                d => d.divisionNumber === division.divisionNumber
                            );
                            const fighter1Data = divMeta?.fighters.find(f => f.id === fight.fighter1);
                            const fighter2Data = divMeta?.fighters.find(f => f.id === fight.fighter2);

                            markers.push({
                                fight,
                                divisionNumber: division.divisionNumber,
                                roundNumber: round.roundNumber,
                                date: fightDate,
                                fighter1Data,
                                fighter2Data,
                                xPosition: 0 // Will be calculated later
                            });

                            if (!earliest || fightDate < earliest) earliest = fightDate;
                            if (!latest || fightDate > latest) latest = fightDate;
                        }
                    });
                });
            });
        }

        return {
            fightMarkers: markers,
            divisions: divs,
            minDate: earliest || startDate,
            maxDate: latest || endDate
        };
    }, [season, startDate, endDate]);

    // Calculate x positions for markers
    const markersWithPositions = useMemo(() => {
        if (!startDate || !endDate) return [];
        
        const timelineStart = startDate.getTime();
        const timelineEnd = endDate.getTime();
        const totalDuration = timelineEnd - timelineStart;

        return fightMarkers.map(marker => ({
            ...marker,
            xPosition: ((marker.date.getTime() - timelineStart) / totalDuration) * 100
        }));
    }, [fightMarkers, startDate, endDate]);

    // Generate X-axis labels
    const timeLabels = useMemo(() => {
        if (!startDate || !endDate) return [];
        
        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const labels: string[] = [];

        if (daysDiff <= 7) {
            // Show days
            for (let i = 0; i <= daysDiff; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            }
        } else if (daysDiff <= 60) {
            // Show weekly markers
            const weeks = Math.ceil(daysDiff / 7);
            for (let i = 0; i <= weeks; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + (i * 7));
                labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            }
        } else if (daysDiff <= 365) {
            // Show monthly markers
            const months = Math.ceil(daysDiff / 30);
            for (let i = 0; i <= months; i++) {
                const date = new Date(startDate);
                date.setMonth(date.getMonth() + i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            }
        } else {
            // Show quarterly markers
            const quarters = Math.ceil(daysDiff / 90);
            for (let i = 0; i <= quarters; i++) {
                const date = new Date(startDate);
                date.setMonth(date.getMonth() + (i * 3));
                labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            }
        }

        return labels;
    }, [startDate, endDate]);

    const formatDateTime = (date: Date): string => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleMouseEnter = (marker: FightMarker, event: React.MouseEvent) => {
        setHoveredFight(marker);
        updateTooltipPosition(event);
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        if (hoveredFight) {
            updateTooltipPosition(event);
        }
    };

    const updateTooltipPosition = (event: React.MouseEvent) => {
        const tooltipWidth = 250;
        const tooltipHeight = 150;
        const padding = 15;
        
        let x = event.clientX + padding;
        let y = event.clientY + padding;
        
        // Check if tooltip would overflow right edge
        if (x + tooltipWidth > window.innerWidth) {
            x = event.clientX - tooltipWidth - padding;
        }
        
        // Check if tooltip would overflow bottom edge
        if (y + tooltipHeight > window.innerHeight) {
            y = event.clientY - tooltipHeight - padding;
        }
        
        // Ensure tooltip doesn't go off left edge
        if (x < padding) {
            x = padding;
        }
        
        // Ensure tooltip doesn't go off top edge
        if (y < padding) {
            y = padding;
        }
        
        setMousePosition({ x, y });
    };

    const handleMouseLeave = () => {
        setHoveredFight(null);
    };

    // Check if we should show timeline (after all hooks have been called)
    if (!startDate || !endDate || !duration) {
        return null;
    }

    return (
        <div className={styles.seasonTimeline}>
            <h2 className={styles.sectionTitle}>Season Timeline</h2>
            
            <div className={styles.timelineRow}>
                {/* Left Side - Duration Info */}
                <div className={styles.durationSection}>
                    <div className={styles.durationDisplay}>
                        <FontAwesomeIcon icon={faClock} className={styles.clockIcon} />
                        <div className={styles.durationText}>
                            {isOngoing && <span className={styles.ongoingBadge}>Ongoing</span>}
                            <div className={styles.durationBreakdown}>
                                {duration.months > 0 && (
                                    <span className={styles.durationValue}>
                                        {duration.months} {duration.months === 1 ? 'month' : 'months'}
                                    </span>
                                )}
                                {duration.days > 0 && (
                                    <span className={styles.durationValue}>
                                        {duration.days} {duration.days === 1 ? 'day' : 'days'}
                                    </span>
                                )}
                                {duration.hours > 0 && (
                                    <span className={styles.durationValue}>
                                        {duration.hours} {duration.hours === 1 ? 'hour' : 'hours'}
                                    </span>
                                )}
                                {duration.minutes > 0 && (
                                    <span className={styles.durationValue}>
                                        {duration.minutes} {duration.minutes === 1 ? 'minute' : 'minutes'}
                                    </span>
                                )}
                                {duration.seconds > 0 && duration.months === 0 && duration.days === 0 && duration.hours === 0 && (
                                    <span className={styles.durationValue}>
                                        {duration.seconds} {duration.seconds === 1 ? 'second' : 'seconds'}
                                    </span>
                                )}
                            </div>
                            {isOngoing && (
                                <p className={styles.ongoingNote}>
                                    ({duration.totalDays} {duration.totalDays === 1 ? 'day' : 'days'} so far)
                                </p>
                            )}
                        </div>
                    </div>

                    <div className={styles.dateInfo}>
                        <div className={styles.dateItem}>
                            <span className={styles.dateLabel}>Start</span>
                            <span className={styles.dateValue}>{formatDateTime(startDate)}</span>
                        </div>
                        <div className={styles.dateItem}>
                            <span className={styles.dateLabel}>End</span>
                            <span className={styles.dateValue}>{formatDateTime(endDate)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Activity Graph */}
                <div className={styles.activitySection}>
                    <div className={styles.activityGraph} onMouseMove={handleMouseMove}>
                        <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet">
                            {/* Grid lines and divisions */}
                            {divisions.map((division, index) => {
                                const yPosition = (index / divisions.length) * 220 + 10;
                                const rowHeight = 220 / divisions.length;
                                const color = generateDivisionColor(index, divisions.length);

                                return (
                                    <g key={division.divisionNumber}>
                                        {/* Division row background */}
                                        <rect
                                            x="0"
                                            y={yPosition}
                                            width="1000"
                                            height={rowHeight}
                                            fill="transparent"
                                            stroke="var(--border-color)"
                                            strokeWidth="1"
                                            opacity="0.2"
                                        />
                                        
                                        {/* Division label */}
                                        <text
                                            x="10"
                                            y={yPosition + rowHeight / 2}
                                            fill="var(--text-secondary)"
                                            fontSize="12"
                                            dominantBaseline="middle"
                                        >
                                            D{division.divisionNumber}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Horizontal line for X-axis */}
                            <line
                                x1="50"
                                y1="240"
                                x2="950"
                                y2="240"
                                stroke="var(--text-secondary)"
                                strokeWidth="1"
                                opacity="0.3"
                            />

                            {/* Fight markers */}
                            {markersWithPositions.map((marker, index) => {
                                const divisionIndex = divisions.findIndex(
                                    d => d.divisionNumber === marker.divisionNumber
                                );
                                if (divisionIndex === -1) return null;

                                const yPosition = (divisionIndex / divisions.length) * 220 + 10;
                                const rowHeight = 220 / divisions.length;
                                const xPos = (marker.xPosition / 100) * 900 + 50;
                                const color = generateDivisionColor(divisionIndex, divisions.length);

                                // Check for overlapping fights
                                const overlapOffset = markersWithPositions
                                    .slice(0, index)
                                    .filter(m => 
                                        m.divisionNumber === marker.divisionNumber &&
                                        Math.abs(m.xPosition - marker.xPosition) < 2
                                    ).length;

                                return (
                                    <rect
                                        key={`${marker.fight._id}-${index}`}
                                        x={xPos + (overlapOffset * 3)}
                                        y={yPosition + 5}
                                        width="4"
                                        height={rowHeight - 10}
                                        fill={color}
                                        opacity="0.8"
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e) => handleMouseEnter(marker, e as any)}
                                        onMouseLeave={handleMouseLeave}
                                    />
                                );
                            })}

                            {/* X-axis labels - positioned below the line */}
                            {timeLabels.map((label, index) => {
                                const xPos = (index / (timeLabels.length - 1)) * 900 + 50;
                                return (
                                    <text
                                        key={`label-${index}`}
                                        x={xPos}
                                        y="260"
                                        fill="var(--text-secondary)"
                                        fontSize="10"
                                        textAnchor="middle"
                                    >
                                        {label}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </div>
            </div>

            {/* Hover Tooltip */}
            {hoveredFight && (
                <div
                    className={styles.tooltip}
                    style={{
                        left: `${mousePosition.x + 15}px`,
                        top: `${mousePosition.y + 15}px`
                    }}
                >
                    <div className={styles.tooltipDate}>
                        {formatDateTime(hoveredFight.date)}
                    </div>
                    <div className={styles.tooltipFightId}>
                        {hoveredFight.fight.fightIdentifier || 
                            `S${season.seasonMeta.seasonNumber}-D${hoveredFight.divisionNumber}-R${hoveredFight.roundNumber}`}
                    </div>
                    <div className={styles.tooltipFighters}>
                        {hoveredFight.fighter1Data && (
                            <div 
                                className={`${styles.tooltipFighter} ${
                                    hoveredFight.fight.winner === hoveredFight.fighter1Data.id 
                                        ? styles.winner 
                                        : ''
                                }`}
                            >
                                {hoveredFight.fighter1Data.profileImage ? (
                                    <img 
                                        src={hoveredFight.fighter1Data.profileImage} 
                                        alt={hoveredFight.fighter1Data.firstName}
                                    />
                                ) : (
                                    <div className={styles.fighterPlaceholder}>
                                        {hoveredFight.fighter1Data.firstName.charAt(0)}
                                        {hoveredFight.fighter1Data.lastName.charAt(0)}
                                    </div>
                                )}
                                <span>{hoveredFight.fighter1Data.firstName} {hoveredFight.fighter1Data.lastName}</span>
                            </div>
                        )}
                        <span className={styles.vsText}>vs</span>
                        {hoveredFight.fighter2Data && (
                            <div 
                                className={`${styles.tooltipFighter} ${
                                    hoveredFight.fight.winner === hoveredFight.fighter2Data.id 
                                        ? styles.winner 
                                        : ''
                                }`}
                            >
                                {hoveredFight.fighter2Data.profileImage ? (
                                    <img 
                                        src={hoveredFight.fighter2Data.profileImage} 
                                        alt={hoveredFight.fighter2Data.firstName}
                                    />
                                ) : (
                                    <div className={styles.fighterPlaceholder}>
                                        {hoveredFight.fighter2Data.firstName.charAt(0)}
                                        {hoveredFight.fighter2Data.lastName.charAt(0)}
                                    </div>
                                )}
                                <span>{hoveredFight.fighter2Data.firstName} {hoveredFight.fighter2Data.lastName}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Second Row - WIP */}
            <div className={styles.wipSection}>
                <p className={styles.wipText}>Additional timeline features coming soon...</p>
            </div>
        </div>
    );
};

export default SeasonTimeline;

