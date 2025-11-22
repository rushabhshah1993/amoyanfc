import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import S3Image from '../S3Image/S3Image';
import styles from './HeadToHead.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface CompetitionHeadToHead {
    competitionId: string;
    competitionName: string;
    competitionLogo?: string;
    totalFights: number;
    fighter1Wins: number;
    fighter2Wins: number;
    fights: {
        winner: string; // fighter ID
        season: number;
        division?: number;
        round: number | string; // Can be number or stage code like "SF", "FN"
        fightId: string;
    }[];
}

interface HeadToHeadProps {
    fighter1: Fighter;
    fighter2: Fighter;
    headToHeadData: CompetitionHeadToHead[];
}

// Helper function to format round name for both league and cup competitions
const formatRoundName = (round: number | string | null | undefined, hasDivision: boolean): string => {
    // Handle null/undefined
    if (round === null || round === undefined) {
        return hasDivision ? 'Round -' : 'Cup Fight';
    }
    
    // If it's a league fight (has division), just return "Round X"
    if (hasDivision) {
        return `Round ${round}`;
    }
    
    // For cup fights, handle stage codes
    const roundStr = String(round);
    
    if (roundStr === 'FN' || roundStr.includes('FINAL')) {
        return 'Finals';
    } else if (roundStr === 'SF' || roundStr.includes('SEMI')) {
        return 'Semifinals';
    } else if (roundStr.startsWith('R')) {
        // R1, R2, etc.
        const roundNum = roundStr.substring(1);
        return `Round ${roundNum}`;
    } else {
        // Fallback for numeric round numbers or unknown
        return `Round ${round}`;
    }
};

const HeadToHead: React.FC<HeadToHeadProps> = ({ fighter1, fighter2, headToHeadData }) => {
    const navigate = useNavigate();
    const hasNoFights = headToHeadData.length === 0;

    if (hasNoFights) {
        return (
            <div className={styles.headToHeadSection}>
                <h2 className={styles.sectionTitle}>Head-to-Head</h2>
                <div className={styles.emptyState}>
                    <p className={styles.emptyMessage}>
                        {fighter1.firstName} has not yet fought {fighter2.firstName} in any competitions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.headToHeadSection}>
            <h2 className={styles.sectionTitle}>Head-to-Head</h2>
            <div className={styles.competitionsList}>
                {headToHeadData.map(competition => (
                    <div key={competition.competitionId} className={styles.competitionWrapper}>
                        <div className={styles.competitionTitleRow}>
                            {competition.competitionLogo && (
                                <S3Image
                                    src={competition.competitionLogo}
                                    alt={competition.competitionName}
                                    className={styles.competitionLogo}
                                    width={40}
                                    height={40}
                                    lazy={true}
                                />
                            )}
                            <h3 className={styles.competitionName}>{competition.competitionName}</h3>
                        </div>
                        <div className={styles.competitionCard}>
                            {/* Fighter Records and Scrollable Fight Cards */}
                            <div className={styles.fighterRecordsSection}>
                                {/* Left: Fighter Win Records */}
                                <div className={styles.recordsSummary}>
                                    <div className={styles.totalFightsLabel}>TOTAL FIGHTS</div>
                                    <div className={styles.recordItem}>
                                        <div className={styles.totalEncounters}>
                                            {competition.totalFights}
                                        </div>
                                        <div className={styles.fightersThumbnails}>
                                            <div className={styles.fighterThumbnail}>
                                                <div className={styles.recordThumbnail}>
                                                <S3Image
                                                    src={fighter1.profileImage}
                                                    alt={fighter1.firstName}
                                                    className={styles.recordFighterImage}
                                                    width={70}
                                                    height={70}
                                                    lazy={true}
                                                    fallback={
                                                        <div className={styles.recordImagePlaceholder}>
                                                            <FontAwesomeIcon icon={faUser} />
                                                        </div>
                                                    }
                                                />
                                                </div>
                                                <span className={styles.recordWins}>{competition.fighter1Wins} win{competition.fighter1Wins !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className={styles.fighterThumbnail}>
                                                <div className={styles.recordThumbnail}>
                                                <S3Image
                                                    src={fighter2.profileImage}
                                                    alt={fighter2.firstName}
                                                    className={styles.recordFighterImage}
                                                    width={70}
                                                    height={70}
                                                    lazy={true}
                                                    fallback={
                                                        <div className={styles.recordImagePlaceholder}>
                                                            <FontAwesomeIcon icon={faUser} />
                                                        </div>
                                                    }
                                                />
                                                </div>
                                                <span className={styles.recordWins}>{competition.fighter2Wins} win{competition.fighter2Wins !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Horizontally Scrollable Fight Cards */}
                                <div className={styles.fightsScrollContainer}>
                                    <div className={styles.clashesLabel}>CLASHES</div>
                                    <div className={styles.fightsList}>
                                        {competition.fights.map((fight, idx) => {
                                            const winner = fight.winner === fighter1.id ? fighter1 : fighter2;
                                            return (
                                                <div 
                                                    key={`${fight.fightId}-${idx}`} 
                                                    className={styles.fightCard}
                                                    onClick={() => fight.fightId && navigate(`/fight/${fight.fightId}`)}
                                                    style={{ cursor: fight.fightId ? 'pointer' : 'default' }}
                                                >
                                                    <div className={styles.fightWinnerThumbnail}>
                                                    <S3Image
                                                        src={winner.profileImage}
                                                        alt={winner.firstName}
                                                        className={styles.fightWinnerImage}
                                                        width={200}
                                                        height={200}
                                                        lazy={true}
                                                        fallback={
                                                            <div className={styles.fightImagePlaceholder}>
                                                                <FontAwesomeIcon icon={faUser} />
                                                            </div>
                                                        }
                                                    />
                                                    </div>
                                                    <div className={styles.fightDetails}>
                                                        <div className={styles.fightLocation}>
                                                            Season {fight.season}
                                                            {fight.division && <><br />Division {fight.division}</>}
                                                            <br />{formatRoundName(fight.round, !!fight.division)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HeadToHead;
