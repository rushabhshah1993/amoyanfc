import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faTrophy, faSkullCrossbones } from '@fortawesome/free-solid-svg-icons';
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
                                    {/* This will be populated when you explain what should be shown when expanded */}
                                    <div className="expanded-content">
                                        <p>Detailed streak information will be shown here.</p>
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
