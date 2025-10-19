import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TournamentBracket.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface Fight {
    _id?: string;
    fighter1: string;
    fighter2: string;
    winner: string;
    fightIdentifier: string;
    date?: string;
    fightStatus?: string;
}

interface TournamentBracketProps {
    fights: Fight[];
    participants: Fighter[];
}

interface BracketFight {
    _id?: string;
    fighter1?: Fighter;
    fighter2?: Fighter;
    winner?: string;
    fightIdentifier: string;
    date?: string;
}

interface Round {
    name: string;
    fights: BracketFight[];
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ fights, participants }) => {
    const navigate = useNavigate();

    // Create a map of fighter IDs to fighter objects
    const fighterMap = React.useMemo(() => {
        const map = new Map<string, Fighter>();
        participants.forEach(fighter => {
            map.set(fighter.id, fighter);
        });
        return map;
    }, [participants]);

    // Organize fights into rounds
    const rounds = React.useMemo(() => {
        const roundsMap = new Map<string, Fight[]>();

        fights.forEach(fight => {
            const identifier = fight.fightIdentifier;
            let roundKey = '';

            if (identifier.includes('-R1-')) {
                roundKey = 'R1';
            } else if (identifier.includes('-QF-')) {
                roundKey = 'QF';
            } else if (identifier.includes('-SF-')) {
                roundKey = 'SF';
            } else if (identifier.includes('-FN')) {
                roundKey = 'FN';
            }

            if (roundKey) {
                if (!roundsMap.has(roundKey)) {
                    roundsMap.set(roundKey, []);
                }
                roundsMap.get(roundKey)!.push(fight);
            }
        });

        // Sort fights within each round by fight identifier
        roundsMap.forEach((roundFights) => {
            roundFights.sort((a, b) => a.fightIdentifier.localeCompare(b.fightIdentifier));
        });

        // Determine round names based on number of participants
        const numFighters = participants.length;
        const orderedRounds: Round[] = [];

        if (roundsMap.has('R1')) {
            const r1Fights = roundsMap.get('R1')!;
            let roundName = 'Round 1';
            if (numFighters === 16) roundName = 'Round of 16';
            if (numFighters === 32) roundName = 'Round of 32';
            
            orderedRounds.push({
                name: roundName,
                fights: r1Fights.map(f => ({
                    _id: f._id,
                    fighter1: fighterMap.get(f.fighter1),
                    fighter2: fighterMap.get(f.fighter2),
                    winner: f.winner,
                    fightIdentifier: f.fightIdentifier,
                    date: f.date
                }))
            });
        }

        if (roundsMap.has('QF')) {
            orderedRounds.push({
                name: 'Quarter-finals',
                fights: roundsMap.get('QF')!.map(f => ({
                    _id: f._id,
                    fighter1: fighterMap.get(f.fighter1),
                    fighter2: fighterMap.get(f.fighter2),
                    winner: f.winner,
                    fightIdentifier: f.fightIdentifier,
                    date: f.date
                }))
            });
        }

        if (roundsMap.has('SF')) {
            orderedRounds.push({
                name: 'Semi-finals',
                fights: roundsMap.get('SF')!.map(f => ({
                    _id: f._id,
                    fighter1: fighterMap.get(f.fighter1),
                    fighter2: fighterMap.get(f.fighter2),
                    winner: f.winner,
                    fightIdentifier: f.fightIdentifier,
                    date: f.date
                }))
            });
        }

        if (roundsMap.has('FN')) {
            orderedRounds.push({
                name: 'Final',
                fights: roundsMap.get('FN')!.map(f => ({
                    _id: f._id,
                    fighter1: fighterMap.get(f.fighter1),
                    fighter2: fighterMap.get(f.fighter2),
                    winner: f.winner,
                    fightIdentifier: f.fightIdentifier,
                    date: f.date
                }))
            });
        }

        return orderedRounds;
    }, [fights, participants, fighterMap]);

    const handleFightClick = (fightId?: string) => {
        if (fightId) {
            navigate(`/fight/${fightId}`, { state: { isCupFight: true } });
        }
    };

    return (
        <div className={styles.bracketContainer}>
            {/* Headers Row */}
            <div className={styles.bracketHeaders}>
                {rounds.map((round, roundIndex) => (
                    <div key={`header-${roundIndex}`} className={styles.roundHeader}>
                        {round.name}
                    </div>
                ))}
            </div>

            {/* Bracket Tree */}
            <div className={styles.bracket}>
                {rounds.map((round, roundIndex) => (
                    <div key={roundIndex} className={styles.round}>
                        <div className={styles.roundMatches}>
                            {round.fights.map((fight, fightIndex) => (
                                <div key={fightIndex} className={styles.matchWrapper}>
                                    <div 
                                        className={styles.match}
                                        onClick={() => handleFightClick(fight._id)}
                                        style={{ cursor: fight._id ? 'pointer' : 'default' }}
                                    >
                                        {fight.date && (
                                            <div className={styles.fightDate}>
                                                {new Date(fight.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        )}
                                        <div className={styles.fightersContainer}>
                                            {/* Fighter 1 */}
                                            {fight.fighter1 && (
                                                <div 
                                                    className={`${styles.fighterSide} ${fight.winner === fight.fighter1.id ? styles.winner : ''}`}
                                                >
                                                    {fight.winner === fight.fighter1.id && (
                                                        <div className={styles.winnerTag}>WINNER</div>
                                                    )}
                                                    {fight.fighter1.profileImage ? (
                                                        <img
                                                            src={fight.fighter1.profileImage}
                                                            alt={`${fight.fighter1.firstName} ${fight.fighter1.lastName}`}
                                                            className={styles.fighterImage}
                                                        />
                                                    ) : (
                                                        <div className={styles.fighterImagePlaceholder}>
                                                            {fight.fighter1.firstName.charAt(0)}{fight.fighter1.lastName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className={styles.fighterName}>
                                                        {fight.fighter1.firstName} {fight.fighter1.lastName}
                                                    </div>
                                                </div>
                                            )}

                                            {/* VS Indicator */}
                                            <div className={styles.vsIndicator}>VS</div>

                                            {/* Fighter 2 */}
                                            {fight.fighter2 && (
                                                <div 
                                                    className={`${styles.fighterSide} ${fight.winner === fight.fighter2.id ? styles.winner : ''}`}
                                                >
                                                    {fight.winner === fight.fighter2.id && (
                                                        <div className={styles.winnerTag}>WINNER</div>
                                                    )}
                                                    {fight.fighter2.profileImage ? (
                                                        <img
                                                            src={fight.fighter2.profileImage}
                                                            alt={`${fight.fighter2.firstName} ${fight.fighter2.lastName}`}
                                                            className={styles.fighterImage}
                                                        />
                                                    ) : (
                                                        <div className={styles.fighterImagePlaceholder}>
                                                            {fight.fighter2.firstName.charAt(0)}{fight.fighter2.lastName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className={styles.fighterName}>
                                                        {fight.fighter2.firstName} {fight.fighter2.lastName}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TournamentBracket;

