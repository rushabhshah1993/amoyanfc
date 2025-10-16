import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faTrophy, faSkullCrossbones } from '@fortawesome/free-solid-svg-icons';
import S3Image from '../S3Image/S3Image';
import './Streaks.css';

interface StreakStart {
    season: number;
    division: number;
    round: number;
}

interface StreakEnd {
    season: number;
    division: number;
    round: number;
}

interface CompetitionMeta {
    id: string;
    competitionName: string;
    logo?: string;
}

interface Opponent {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface Streak {
    competitionId: string;
    type: 'win' | 'lose';
    start: StreakStart;
    end?: StreakEnd;
    count: number;
    active: boolean;
    opponents: Opponent[];
    competitionMeta: CompetitionMeta;
}

interface StreaksProps {
    streaks: Streak[];
}

interface CompetitionStreaks {
    [competitionId: string]: {
        competitionMeta: CompetitionMeta;
        streaks: Streak[];
    };
}

const Streaks: React.FC<StreaksProps> = ({ streaks }) => {
    const [expandedCompetitions, setExpandedCompetitions] = useState<Set<string>>(new Set());

    // Group streaks by competition
    const competitionStreaks: CompetitionStreaks = streaks.reduce((acc, streak) => {
        const competitionId = streak.competitionId;
        if (!acc[competitionId]) {
            acc[competitionId] = {
                competitionMeta: streak.competitionMeta,
                streaks: []
            };
        }
        acc[competitionId].streaks.push(streak);
        return acc;
    }, {} as CompetitionStreaks);

    const toggleCompetition = (competitionId: string) => {
        const newExpanded = new Set(expandedCompetitions);
        if (newExpanded.has(competitionId)) {
            newExpanded.delete(competitionId);
        } else {
            newExpanded.add(competitionId);
        }
        setExpandedCompetitions(newExpanded);
    };

    const calculateStreakStats = (streaks: Streak[], type: 'win' | 'lose') => {
        const filteredStreaks = streaks.filter(streak => streak.type === type);
        if (filteredStreaks.length === 0) return { highest: 0, lowest: 0 };
        
        const counts = filteredStreaks.map(streak => streak.count);
        return {
            highest: Math.max(...counts),
            lowest: Math.min(...counts)
        };
    };

    if (streaks.length === 0) {
        return (
            <div className="streaks-section">
                <h2 className="section-title">Fighting Streaks</h2>
                <div className="empty-state">
                    <p>This fighter's fights have not yet been added to the system.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="streaks-section">
            <h2 className="section-title">Fighting Streaks</h2>
            <div className="streaks-container">
                {Object.entries(competitionStreaks).map(([competitionId, { competitionMeta, streaks: competitionStreaksList }]) => {
                    const isExpanded = expandedCompetitions.has(competitionId);
                    const winStats = calculateStreakStats(competitionStreaksList, 'win');
                    const loseStats = calculateStreakStats(competitionStreaksList, 'lose');
                    
                    // Sort streaks chronologically (oldest first) and separate by type
                    const sortedStreaks = [...competitionStreaksList].sort((a, b) => {
                        // Sort by season, then division, then round
                        if (a.start.season !== b.start.season) {
                            return a.start.season - b.start.season;
                        }
                        if (a.start.division !== b.start.division) {
                            return a.start.division - b.start.division;
                        }
                        return a.start.round - b.start.round;
                    });
                    
                    const winStreaks = sortedStreaks.filter(streak => streak.type === 'win');
                    const loseStreaks = sortedStreaks.filter(streak => streak.type === 'lose');

                    return (
                        <div key={competitionId} className="streak-card">
                            <div 
                                className="streak-card-header"
                                onClick={() => toggleCompetition(competitionId)}
                            >
                                <div className="competition-info">
                                    {competitionMeta.logo && (
                                        <img 
                                            src={competitionMeta.logo} 
                                            alt={competitionMeta.competitionName}
                                            className="competition-logo"
                                        />
                                    )}
                                    <h3 className="competition-name">{competitionMeta.competitionName}</h3>
                                </div>
                                <FontAwesomeIcon 
                                    icon={isExpanded ? faChevronUp : faChevronDown} 
                                    className="expand-icon"
                                />
                            </div>

                            <div className="streak-stats">
                                <div className="streak-stats-left">
                                    <div className="streak-stat win-streaks">
                                        <div className="streak-stat-header">
                                            <FontAwesomeIcon icon={faTrophy} className="win-icon" />
                                            <span className="streak-stat-title">Win Streaks</span>
                                        </div>
                                        <div className="streak-stat-values">
                                            <div className="streak-stat-item">
                                                <span className="streak-stat-label">Highest</span>
                                                <span className="streak-stat-value highest">{winStats.highest}</span>
                                            </div>
                                            <div className="streak-stat-item">
                                                <span className="streak-stat-label">Lowest</span>
                                                <span className="streak-stat-value lowest">{winStats.lowest}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="streak-stats-right">
                                    <div className="streak-stat lose-streaks">
                                        <div className="streak-stat-header">
                                            <FontAwesomeIcon icon={faSkullCrossbones} className="lose-icon" />
                                            <span className="streak-stat-title">Lose Streaks</span>
                                        </div>
                                        <div className="streak-stat-values">
                                            <div className="streak-stat-item">
                                                <span className="streak-stat-label">Highest</span>
                                                <span className="streak-stat-value highest">{loseStats.highest}</span>
                                            </div>
                                            <div className="streak-stat-item">
                                                <span className="streak-stat-label">Lowest</span>
                                                <span className="streak-stat-value lowest">{loseStats.lowest}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="streak-card-content">
                                    <div className="streak-details">
                                        <div className="streak-section">
                                            <h4 className="streak-section-title">
                                                <FontAwesomeIcon icon={faTrophy} className="win-icon" />
                                                Win Streaks
                                            </h4>
                                            {winStreaks.length > 0 ? (
                                                <div className="streak-list">
                                                    {winStreaks.map((streak, index) => (
                                                        <div key={index} className="streak-item">
                                                            <div className="streak-title">
                                                                <span className="streak-period">
                                                                    S{streak.start.season} D{streak.start.division} R{streak.start.round} - 
                                                                    {streak.active ? (
                                                                        <>
                                                                            <span className="live-indicator">
                                                                                <span className="live-dot"></span>
                                                                                Live
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        ` S${streak.end?.season} D${streak.end?.division} R${streak.end?.round}`
                                                                    )}
                                                                </span>
                                                                <span className="streak-count">({streak.count})</span>
                                                            </div>
                                                            <div className="opponents-grid">
                                                                {streak.opponents.map((opponent, oppIndex) => (
                                                                    <div key={oppIndex} className="opponent-thumbnail">
                                                                        <S3Image
                                                                            src={opponent.profileImage}
                                                                            alt={`${opponent.firstName} ${opponent.lastName}`}
                                                                            className="opponent-image"
                                                                            width={60}
                                                                            height={60}
                                                                            lazy={true}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-streak">
                                                    <p>No fight data available</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="streak-section">
                                            <h4 className="streak-section-title">
                                                <FontAwesomeIcon icon={faSkullCrossbones} className="lose-icon" />
                                                Lose Streaks
                                            </h4>
                                            {loseStreaks.length > 0 ? (
                                                <div className="streak-list">
                                                    {loseStreaks.map((streak, index) => (
                                                        <div key={index} className="streak-item">
                                                            <div className="streak-title">
                                                                <span className="streak-period">
                                                                    S{streak.start.season} D{streak.start.division} R{streak.start.round} - 
                                                                    {streak.active ? (
                                                                        <>
                                                                            <span className="live-indicator">
                                                                                <span className="live-dot"></span>
                                                                                Live
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        ` S${streak.end?.season} D${streak.end?.division} R${streak.end?.round}`
                                                                    )}
                                                                </span>
                                                                <span className="streak-count">({streak.count})</span>
                                                            </div>
                                                            <div className="opponents-grid">
                                                                {streak.opponents.map((opponent, oppIndex) => (
                                                                    <div key={oppIndex} className="opponent-thumbnail">
                                                                        <S3Image
                                                                            src={opponent.profileImage}
                                                                            alt={`${opponent.firstName} ${opponent.lastName}`}
                                                                            className="opponent-image"
                                                                            width={60}
                                                                            height={60}
                                                                            lazy={true}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-streak">
                                                    <p>No fight data available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Streaks;
