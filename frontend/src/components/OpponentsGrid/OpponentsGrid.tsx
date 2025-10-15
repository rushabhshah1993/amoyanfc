import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import S3Image from '../S3Image/S3Image';
import './OpponentsGrid.css';

interface OpponentHistory {
    opponentId: string;
    totalFights: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
}

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface OpponentsGridProps {
    currentFighterId: string;
    allFighters: Fighter[];
    opponentsHistory: OpponentHistory[];
    loading?: boolean;
}

const OpponentsGrid: React.FC<OpponentsGridProps> = ({
    currentFighterId,
    allFighters,
    opponentsHistory,
    loading = false
}) => {
    const navigate = useNavigate();

    // Create a set of fought opponent IDs for quick lookup
    const foughtOpponentIds = new Set(
        (opponentsHistory || []).map(oh => oh.opponentId)
    );

    // Filter out current fighter from all fighters
    const otherFighters = allFighters.filter(f => f.id !== currentFighterId);

    // Helper function to check if opponent was faced
    const hasFoughtOpponent = (opponentId: string): boolean => {
        return foughtOpponentIds.has(opponentId);
    };

    // Get opponent stats
    const getOpponentStats = (opponentId: string): OpponentHistory | null => {
        return opponentsHistory?.find(oh => oh.opponentId === opponentId) || null;
    };

    if (loading || otherFighters.length === 0) {
        return null;
    }

    return (
        <div className="opponents-section">
            <div className="opponents-content">
                <h2 className="opponents-title">League Opponents</h2>
                <p className="opponents-subtitle">
                    Fighters faced: {foughtOpponentIds.size} of {otherFighters.length}
                </p>
                <div className="opponents-grid">
                    {otherFighters.map(opponent => {
                        const isFought = hasFoughtOpponent(opponent.id);
                        const stats = getOpponentStats(opponent.id);
                        
                        return (
                            <div 
                                key={opponent.id}
                                className={`opponent-card ${isFought ? 'opponent-fought' : 'opponent-not-fought'}`}
                                onClick={() => isFought && navigate(`/versus/${currentFighterId}/${opponent.id}`)}
                                title={isFought 
                                    ? `${opponent.firstName} ${opponent.lastName} - ${stats?.totalFights} fight(s): ${stats?.totalWins}W-${stats?.totalLosses}L` 
                                    : `${opponent.firstName} ${opponent.lastName} - Not yet faced`
                                }
                            >
                                <div className="opponent-image-wrapper">
                                    <S3Image
                                        src={opponent.profileImage}
                                        alt={`${opponent.firstName} ${opponent.lastName}`}
                                        className="opponent-image"
                                        width={120}
                                        height={120}
                                        lazy={true}
                                        fallback={
                                            <div className="opponent-image-placeholder">
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                        }
                                    />
                                    {!isFought && <div className="opponent-overlay" />}
                                </div>
                                <div className="opponent-info">
                                    <div className="opponent-name">
                                        {opponent.firstName}
                                    </div>
                                    {isFought && stats && (
                                        <div className="opponent-record">
                                            {stats.totalWins}W-{stats.totalLosses}L
                                            <span className="opponent-win-rate">
                                                ({stats.winPercentage.toFixed(0)}%)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default OpponentsGrid;

