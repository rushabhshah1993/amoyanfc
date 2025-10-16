import React from 'react';
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
    totalFights: number;
    fighter1Wins: number;
    fighter2Wins: number;
    fights: {
        winner: string; // fighter ID
        season: number;
        division?: number;
        round: number;
        fightId: string;
    }[];
}

interface HeadToHeadProps {
    fighter1: Fighter;
    fighter2: Fighter;
    headToHeadData: CompetitionHeadToHead[];
}

const HeadToHead: React.FC<HeadToHeadProps> = ({ fighter1, fighter2, headToHeadData }) => {
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
                        <h3 className={styles.competitionName}>{competition.competitionName}</h3>
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
                                                <div key={`${fight.fightId}-${idx}`} className={styles.fightCard}>
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
                                                            <br />Round {fight.round}
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
