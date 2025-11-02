/**
 * Fight Result Service
 * Handles preparation of fight result data for MongoDB updates
 * All updates are prepared in a single payload to minimize database requests
 */

interface ChatGPTResponse {
    winner: string;
    date: string;
    userDescription?: string;
    genAIDescription: string;
    isSimulated: boolean;
    fighterStats: Array<{
        fighterId: string;
        stats: any;
    }>;
}

interface FightResultPayload {
    fightId: string;
    competitionId: string;
    seasonNumber: number;
    divisionNumber: number;
    roundNumber: number;
    timestamp: string;
    chatGPTResponse: ChatGPTResponse;
    competitionUpdate: {
        winner: string;
        date: string;
        userDescription: string | null;
        genAIDescription: string;
        isSimulated: boolean;
        fighterStats: any[];
    };
    fighter1Updates: any;
    fighter2Updates: any;
    roundStandingsUpdate: {
        competitionId: string;
        seasonNumber: number;
        divisionNumber: number;
        roundNumber: number;
        fightId: string;
        fightIdentifier: string;
        standings: any[];
    } | null;
    seasonCompletionStatus: {
        isSeasonCompleted: boolean;
        competitionType?: 'league' | 'cup';
        divisionStatuses?: any[];
        seasonNumber?: number;
        competitionId?: string;
        reason?: string;
    };
}

/**
 * Step 1: Prepare competition fight update
 */
const prepareCompetitionUpdate = (
    chatGPTResponse: ChatGPTResponse,
    timestamp: string
) => {
    return {
        winner: chatGPTResponse.winner,
        date: timestamp,
        userDescription: chatGPTResponse.userDescription || null,
        genAIDescription: chatGPTResponse.genAIDescription,
        isSimulated: chatGPTResponse.isSimulated,
        fighterStats: chatGPTResponse.fighterStats,
    };
};

/**
 * Step 3: Prepare competition history update for a fighter
 */
const prepareCompetitionHistoryUpdate = (
    fighter: any,
    competitionId: string,
    isWinner: boolean
) => {
    const competitionHistory = fighter.competitionHistory || [];
    const existingComp = competitionHistory.find(
        (ch: any) => ch.competitionId === competitionId
    );

    if (existingComp) {
        const newTotalFights = existingComp.totalFights + 1;
        const newTotalWins = isWinner ? existingComp.totalWins + 1 : existingComp.totalWins;
        const newTotalLosses = !isWinner ? existingComp.totalLosses + 1 : existingComp.totalLosses;
        const newWinPercentage = (newTotalWins / newTotalFights) * 100;

        return {
            competitionId,
            totalFights: newTotalFights,
            totalWins: newTotalWins,
            totalLosses: newTotalLosses,
            winPercentage: newWinPercentage,
        };
    } else {
        // New competition entry
        return {
            competitionId,
            totalFights: 1,
            totalWins: isWinner ? 1 : 0,
            totalLosses: isWinner ? 0 : 1,
            winPercentage: isWinner ? 100 : 0,
        };
    }
};

/**
 * Step 4: Prepare season details update for a fighter
 */
const prepareSeasonDetailsUpdate = (
    fighter: any,
    competitionId: string,
    seasonNumber: number,
    divisionNumber: number,
    isWinner: boolean
) => {
    const competitionHistory = fighter.competitionHistory || [];
    const competition = competitionHistory.find((ch: any) => ch.competitionId === competitionId);
    const seasonDetails = competition?.seasonDetails || [];
    
    const existingSeason = seasonDetails.find(
        (sd: any) => sd.seasonNumber === seasonNumber && sd.divisionNumber === divisionNumber
    );

    if (existingSeason) {
        const newFights = existingSeason.fights + 1;
        const newWins = isWinner ? existingSeason.wins + 1 : existingSeason.wins;
        const newLosses = !isWinner ? existingSeason.losses + 1 : existingSeason.losses;
        const newPoints = existingSeason.points + (isWinner ? 3 : 0);
        const newWinPercentage = (newWins / newFights) * 100;

        return {
            seasonNumber,
            divisionNumber,
            fights: newFights,
            wins: newWins,
            losses: newLosses,
            points: newPoints,
            winPercentage: newWinPercentage,
        };
    } else {
        // New season/division entry
        return {
            seasonNumber,
            divisionNumber,
            fights: 1,
            wins: isWinner ? 1 : 0,
            losses: isWinner ? 0 : 1,
            points: isWinner ? 3 : 0,
            winPercentage: isWinner ? 100 : 0,
        };
    }
};

/**
 * Step 5 & 6: Prepare opponents history update for a fighter
 */
const prepareOpponentsHistoryUpdate = (
    fighter: any,
    opponentId: string,
    competitionId: string,
    seasonNumber: number,
    divisionNumber: number,
    roundNumber: number,
    fightId: string,
    isWinner: boolean,
    timestamp: string
) => {
    const opponentsHistory = fighter.opponentsHistory || [];
    const existingOpponent = opponentsHistory.find((oh: any) => oh.opponentId === opponentId);

    const newDetail = {
        competitionId,
        season: seasonNumber,
        divisionId: divisionNumber,
        roundId: roundNumber,
        fightId,
        isWinner,
        date: timestamp,
    };

    if (existingOpponent) {
        const newTotalFights = existingOpponent.totalFights + 1;
        const newTotalWins = isWinner ? existingOpponent.totalWins + 1 : existingOpponent.totalWins;
        const newTotalLosses = !isWinner ? existingOpponent.totalLosses + 1 : existingOpponent.totalLosses;
        const newWinPercentage = (newTotalWins / newTotalFights) * 100;

        return {
            opponentId,
            totalFights: newTotalFights,
            totalWins: newTotalWins,
            totalLosses: newTotalLosses,
            winPercentage: newWinPercentage,
            newDetail,
        };
    } else {
        // New opponent entry
        return {
            opponentId,
            totalFights: 1,
            totalWins: isWinner ? 1 : 0,
            totalLosses: isWinner ? 0 : 1,
            winPercentage: isWinner ? 100 : 0,
            newDetail,
        };
    }
};

/**
 * Step 7A: Prepare debut information update (if needed)
 */
const prepareDebutInformationUpdate = (
    fighter: any,
    competitionId: string,
    seasonNumber: number,
    fightId: string,
    timestamp: string
) => {
    // Check if debut information is empty or doesn't exist
    const hasDebut = fighter.debutInformation && 
                     fighter.debutInformation.competitionId && 
                     fighter.debutInformation.fightId;

    if (!hasDebut) {
        return {
            competitionId,
            season: seasonNumber,
            fightId,
            dateOfDebut: timestamp
        };
    }

    return null; // No update needed
};

/**
 * Step 7B: Prepare streaks update for a fighter
 */
const prepareStreaksUpdate = (
    fighter: any,
    competitionId: string,
    seasonNumber: number,
    divisionNumber: number,
    roundNumber: number,
    opponentId: string,
    isWinner: boolean
) => {
    const streaks = fighter.streaks || [];
    const activeStreak = streaks.find((streak: any) => streak.active === true);
    const resultType = isWinner ? 'win' : 'lose';

    if (!activeStreak) {
        // No active streak exists, create new one
        return {
            action: 'create',
            newStreak: {
                competitionId,
                type: resultType,
                start: {
                    season: seasonNumber,
                    division: divisionNumber,
                    round: roundNumber
                },
                end: {
                    season: seasonNumber,
                    division: divisionNumber,
                    round: roundNumber
                },
                count: 1,
                active: true,
                opponents: [opponentId]
            }
        };
    }

    // Active streak exists
    if (activeStreak.type === resultType) {
        // Streak continues - update count, end, and add opponent
        return {
            action: 'continue',
            streakId: activeStreak._id, // Need to identify which streak to update
            updates: {
                count: activeStreak.count + 1,
                end: {
                    season: seasonNumber,
                    division: divisionNumber,
                    round: roundNumber
                },
                opponents: [...(activeStreak.opponents || []), opponentId]
            }
        };
    } else {
        // Streak breaks - end current streak and create new one
        return {
            action: 'break',
            endStreak: {
                streakId: activeStreak._id,
                updates: {
                    end: {
                        season: activeStreak.end.season,
                        division: activeStreak.end.division,
                        round: activeStreak.end.round
                    },
                    active: false
                }
            },
            newStreak: {
                competitionId,
                type: resultType,
                start: {
                    season: seasonNumber,
                    division: divisionNumber,
                    round: roundNumber
                },
                end: {
                    season: seasonNumber,
                    division: divisionNumber,
                    round: roundNumber
                },
                count: 1,
                active: true,
                opponents: [opponentId]
            }
        };
    }
};

/**
 * Step 7C: Prepare fight stats update for a fighter
 */
const prepareFightStatsUpdate = (
    fighter: any,
    chatGPTStats: any
) => {
    const currentStats = fighter.fightStats || {};
    const currentFightsCount = currentStats.fightsCount || 0;
    const newFightsCount = currentFightsCount + 1;

    // Handle finishing moves (array of strings)
    const currentFinishingMoves = currentStats.finishingMoves || [];
    const newFinishingMove = chatGPTStats.finishingMove;
    const updatedFinishingMoves = newFinishingMove && !currentFinishingMoves.includes(newFinishingMove)
        ? [...currentFinishingMoves, newFinishingMove]
        : currentFinishingMoves;

    // Average all numeric stats
    const averageStat = (currentValue: number, newValue: number) => {
        if (currentFightsCount === 0) return newValue;
        return ((currentValue * currentFightsCount) + newValue) / newFightsCount;
    };

    // Prepare updated stats (averaging all metrics)
    const updatedStats: any = {
        fightsCount: newFightsCount,
        finishingMoves: updatedFinishingMoves,
    };

    // Average grappling stats
    if (chatGPTStats.grappling) {
        updatedStats.grappling = {
            accuracy: averageStat(currentStats.grappling?.accuracy || 0, chatGPTStats.grappling.accuracy || 0),
            defence: averageStat(currentStats.grappling?.defence || 0, chatGPTStats.grappling.defence || 0),
        };
    }

    // Average significant strikes stats
    if (chatGPTStats.significantStrikes) {
        updatedStats.significantStrikes = {
            accuracy: averageStat(currentStats.significantStrikes?.accuracy || 0, chatGPTStats.significantStrikes.accuracy || 0),
            attempted: averageStat(currentStats.significantStrikes?.attempted || 0, chatGPTStats.significantStrikes.attempted || 0),
            defence: averageStat(currentStats.significantStrikes?.defence || 0, chatGPTStats.significantStrikes.defence || 0),
            landed: averageStat(currentStats.significantStrikes?.landed || 0, chatGPTStats.significantStrikes.landed || 0),
            landedPerMinute: averageStat(currentStats.significantStrikes?.landedPerMinute || 0, chatGPTStats.significantStrikes.landedPerMinute || 0),
            positions: {
                clinching: averageStat(currentStats.significantStrikes?.positions?.clinching || 0, chatGPTStats.significantStrikes.positions?.clinching || 0),
                ground: averageStat(currentStats.significantStrikes?.positions?.ground || 0, chatGPTStats.significantStrikes.positions?.ground || 0),
                standing: averageStat(currentStats.significantStrikes?.positions?.standing || 0, chatGPTStats.significantStrikes.positions?.standing || 0),
            },
        };
    }

    // Average submissions stats
    if (chatGPTStats.submissions) {
        updatedStats.submissions = {
            attemptsPer15Mins: averageStat(currentStats.submissions?.attemptsPer15Mins || 0, chatGPTStats.submissions.attemptsPer15Mins || 0),
            average: averageStat(currentStats.submissions?.average || 0, chatGPTStats.submissions.average || 0),
        };
    }

    // Average takedowns stats
    if (chatGPTStats.takedowns) {
        updatedStats.takedowns = {
            accuracy: averageStat(currentStats.takedowns?.accuracy || 0, chatGPTStats.takedowns.accuracy || 0),
            attempted: averageStat(currentStats.takedowns?.attempted || 0, chatGPTStats.takedowns.attempted || 0),
            avgTakedownsLandedPerMin: averageStat(currentStats.takedowns?.avgTakedownsLandedPerMin || 0, chatGPTStats.takedowns.avgTakedownsLandedPerMin || 0),
            defence: averageStat(currentStats.takedowns?.defence || 0, chatGPTStats.takedowns.defence || 0),
            landed: averageStat(currentStats.takedowns?.landed || 0, chatGPTStats.takedowns.landed || 0),
        };
    }

    // Average strike map
    if (chatGPTStats.strikeMap) {
        updatedStats.strikeMap = {
            head: {
                absorb: averageStat(currentStats.strikeMap?.head?.absorb || 0, chatGPTStats.strikeMap.head?.absorb || 0),
                strike: averageStat(currentStats.strikeMap?.head?.strike || 0, chatGPTStats.strikeMap.head?.strike || 0),
            },
            torso: {
                absorb: averageStat(currentStats.strikeMap?.torso?.absorb || 0, chatGPTStats.strikeMap.torso?.absorb || 0),
                strike: averageStat(currentStats.strikeMap?.torso?.strike || 0, chatGPTStats.strikeMap.torso?.strike || 0),
            },
            leg: {
                absorb: averageStat(currentStats.strikeMap?.leg?.absorb || 0, chatGPTStats.strikeMap.leg?.absorb || 0),
                strike: averageStat(currentStats.strikeMap?.leg?.strike || 0, chatGPTStats.strikeMap.leg?.strike || 0),
            },
        };
    }

    return updatedStats;
};

/**
 * Main function: Prepare all fighter updates (Steps 3-7 + Debut + Streaks)
 */
const prepareFighterUpdates = (
    fighter: any,
    opponentId: string,
    competitionId: string,
    seasonNumber: number,
    divisionNumber: number,
    roundNumber: number,
    fightId: string,
    isWinner: boolean,
    chatGPTStats: any,
    timestamp: string
) => {
    return {
        fighterId: fighter.id,
        competitionHistoryUpdate: prepareCompetitionHistoryUpdate(fighter, competitionId, isWinner),
        seasonDetailsUpdate: prepareSeasonDetailsUpdate(fighter, competitionId, seasonNumber, divisionNumber, isWinner),
        opponentsHistoryUpdate: prepareOpponentsHistoryUpdate(
            fighter,
            opponentId,
            competitionId,
            seasonNumber,
            divisionNumber,
            roundNumber,
            fightId,
            isWinner,
            timestamp
        ),
        debutInformationUpdate: prepareDebutInformationUpdate(
            fighter,
            competitionId,
            seasonNumber,
            fightId,
            timestamp
        ),
        streaksUpdate: prepareStreaksUpdate(
            fighter,
            competitionId,
            seasonNumber,
            divisionNumber,
            roundNumber,
            opponentId,
            isWinner
        ),
        fightStatsUpdate: prepareFightStatsUpdate(fighter, chatGPTStats),
    };
};

/**
 * Master function: Prepare complete fight result payload
 */
export const prepareFightResultPayload = (
    fightId: string,
    competitionId: string,
    seasonNumber: number,
    divisionNumber: number,
    roundNumber: number,
    fighter1: any,
    fighter2: any,
    competition: any,
    chatGPTResponse: ChatGPTResponse
): FightResultPayload => {
    const timestamp = new Date().toISOString();
    
    // Step 1-2: Competition and fight stats update
    const competitionUpdate = prepareCompetitionUpdate(chatGPTResponse, timestamp);

    // Get fighter stats from ChatGPT response
    const fighter1Stats = chatGPTResponse.fighterStats.find(fs => fs.fighterId === fighter1.id)?.stats;
    const fighter2Stats = chatGPTResponse.fighterStats.find(fs => fs.fighterId === fighter2.id)?.stats;

    if (!fighter1Stats || !fighter2Stats) {
        throw new Error('Fighter stats not found in ChatGPT response');
    }

    // Determine winners
    const fighter1IsWinner = chatGPTResponse.winner === fighter1.id;
    const fighter2IsWinner = chatGPTResponse.winner === fighter2.id;

    // Steps 3-7 for Fighter 1
    const fighter1Updates = prepareFighterUpdates(
        fighter1,
        fighter2.id,
        competitionId,
        seasonNumber,
        divisionNumber,
        roundNumber,
        fightId,
        fighter1IsWinner,
        fighter1Stats,
        timestamp
    );

    // Steps 3-7 for Fighter 2
    const fighter2Updates = prepareFighterUpdates(
        fighter2,
        fighter1.id,
        competitionId,
        seasonNumber,
        divisionNumber,
        roundNumber,
        fightId,
        fighter2IsWinner,
        fighter2Stats,
        timestamp
    );

    // Calculate round standings after this fight
    const divisionFighters = competition.seasonMeta?.leagueDivisions?.find(
        (div: any) => div.divisionNumber === divisionNumber
    )?.fighters || [];
    
    const roundStandingsUpdate = divisionFighters.length > 0 
        ? prepareRoundStandingsUpdate(
            competition,
            fightId,
            competitionId,
            seasonNumber,
            divisionNumber,
            roundNumber,
            divisionFighters
        )
        : null;

    // Check if season is completed after this fight
    const seasonCompletionStatus = checkSeasonCompletion(competition);

    return {
        fightId,
        competitionId,
        seasonNumber,
        divisionNumber,
        roundNumber,
        timestamp,
        chatGPTResponse,
        competitionUpdate,
        fighter1Updates,
        fighter2Updates,
        roundStandingsUpdate,
        seasonCompletionStatus,
    };
};

// ==========================================
// SEASON COMPLETION CHECK
// ==========================================

/**
 * Checks if a season has ended by verifying all fights in the last round
 * of every division are completed.
 * 
 * @param competitionData - Full competition document with leagueData or cupData
 * @returns Object with completion status and details
 */
export const checkSeasonCompletion = (competitionData: any) => {
    console.log('\n🔍 Checking Season Completion...');

    // Determine if it's a league or cup competition
    const isLeague = competitionData.leagueData !== null && competitionData.leagueData !== undefined;
    const data = isLeague ? competitionData.leagueData : competitionData.cupData;

    if (!data) {
        console.warn('⚠️ No league/cup data found in competition');
        return {
            isSeasonCompleted: false,
            reason: 'No competition data found'
        };
    }

    // For league competitions
    if (isLeague && data.divisions) {
        const divisions = data.divisions;
        const divisionStatuses: any[] = [];

        for (const division of divisions) {
            const { divisionNumber, totalRounds, rounds } = division;

            // Find the last round
            const lastRound = rounds?.find((r: any) => r.roundNumber === totalRounds);

            if (!lastRound) {
                console.log(`⚠️ Division ${divisionNumber}: Last round (${totalRounds}) not found`);
                divisionStatuses.push({
                    divisionNumber,
                    isCompleted: false,
                    reason: `Round ${totalRounds} not found`
                });
                continue;
            }

            // Check if all fights in the last round are completed
            const fights = lastRound.fights || [];
            const totalFights = fights.length;
            const completedFights = fights.filter((fight: any) => 
                fight.fightStatus === 'completed' || fight.winner !== null
            ).length;

            const isCompleted = totalFights > 0 && completedFights === totalFights;

            console.log(
                `📊 Division ${divisionNumber}: Round ${totalRounds} - ` +
                `${completedFights}/${totalFights} fights completed`
            );

            divisionStatuses.push({
                divisionNumber,
                totalRounds,
                lastRound: totalRounds,
                totalFights,
                completedFights,
                isCompleted
            });
        }

        // Season is completed only if ALL divisions are completed
        const allDivisionsCompleted = divisionStatuses.every(d => d.isCompleted);

        if (allDivisionsCompleted) {
            console.log('✅ SEASON COMPLETED! All divisions have finished their final rounds.');
        } else {
            console.log('⏳ Season still in progress...');
        }

        return {
            isSeasonCompleted: allDivisionsCompleted,
            competitionType: 'league' as const,
            divisionStatuses,
            seasonNumber: competitionData.seasonMeta?.seasonNumber,
            competitionId: competitionData.id
        };
    }

    // For cup competitions (if needed in the future)
    if (!isLeague && data.rounds) {
        // Cup completion logic: check if final round is completed
        const rounds = data.rounds;
        const lastRound = rounds[rounds.length - 1];
        
        if (!lastRound) {
            return {
                isSeasonCompleted: false,
                competitionType: 'cup' as const,
                reason: 'No rounds found'
            };
        }

        const fights = lastRound.fights || [];
        const totalFights = fights.length;
        const completedFights = fights.filter((fight: any) => 
            fight.fightStatus === 'completed' || fight.winner !== null
        ).length;

        const isCompleted = totalFights > 0 && completedFights === totalFights;

        console.log(
            `📊 Cup Final (Round ${lastRound.roundNumber}): ` +
            `${completedFights}/${totalFights} fights completed`
        );

        if (isCompleted) {
            console.log('✅ CUP SEASON COMPLETED!');
        }

        return {
            isSeasonCompleted: isCompleted,
            competitionType: 'cup' as const,
            roundNumber: lastRound.roundNumber,
            totalFights,
            completedFights,
            seasonNumber: competitionData.seasonMeta?.seasonNumber,
            competitionId: competitionData.id
        };
    }

    return {
        isSeasonCompleted: false,
        reason: 'Unable to determine competition structure'
    };
};

// ==========================================
// ROUND STANDINGS CALCULATION
// ==========================================

const POINTS_PER_WIN = 3;

/**
 * Calculate head-to-head points for tied fighters
 * Used as tiebreaker when multiple fighters have the same total points
 */
const calculateHeadToHeadPoints = (
    tiedFighters: string[],
    completedFights: any[]
): Map<string, number> => {
    const h2hPoints = new Map<string, number>();
    
    tiedFighters.forEach(fighterId => {
        h2hPoints.set(fighterId, 0);
    });

    completedFights.forEach(fight => {
        if (!fight.winner || fight.fightStatus !== 'completed') return;

        const fighter1InTied = tiedFighters.includes(fight.fighter1);
        const fighter2InTied = tiedFighters.includes(fight.fighter2);

        // Only count fights between tied fighters
        if (fighter1InTied && fighter2InTied) {
            const currentPoints = h2hPoints.get(fight.winner) || 0;
            h2hPoints.set(fight.winner, currentPoints + POINTS_PER_WIN);
        }
    });

    return h2hPoints;
};

/**
 * Sort standings with tiebreaking logic
 * 1. Points (descending)
 * 2. Head-to-head points among tied fighters (descending)
 * 3. Alphabetical by fighter ID (ascending) - final tiebreaker
 */
const sortStandingsWithTiebreakers = (
    standings: any[],
    completedFights: any[]
): any[] => {
    // Group fighters by points
    const pointsGroups = new Map<number, string[]>();
    
    standings.forEach(standing => {
        const fighters = pointsGroups.get(standing.points) || [];
        fighters.push(standing.fighterId);
        pointsGroups.set(standing.points, fighters);
    });

    const fighterRankings = new Map<string, number>();
    let currentRank = 1;

    // Sort points descending
    const sortedPoints = Array.from(pointsGroups.keys()).sort((a, b) => b - a);

    sortedPoints.forEach(points => {
        const tiedFighters = pointsGroups.get(points) || [];

        if (tiedFighters.length === 1) {
            // No tie - assign rank directly
            fighterRankings.set(tiedFighters[0], currentRank);
            currentRank++;
        } else {
            // Tie - use head-to-head tiebreaker
            const h2hPoints = calculateHeadToHeadPoints(tiedFighters, completedFights);
            
            const sortedTiedFighters = [...tiedFighters].sort((a, b) => {
                const h2hA = h2hPoints.get(a) || 0;
                const h2hB = h2hPoints.get(b) || 0;

                // First: compare head-to-head points
                if (h2hA !== h2hB) {
                    return h2hB - h2hA;
                }

                // Final tiebreaker: alphabetical by ID
                return a.localeCompare(b);
            });

            // Assign ranks to tied fighters
            sortedTiedFighters.forEach(fighterId => {
                fighterRankings.set(fighterId, currentRank);
                currentRank++;
            });
        }
    });

    // Sort all standings by rank
    const sortedStandings = [...standings].sort((a, b) => {
        const rankA = fighterRankings.get(a.fighterId) || 999;
        const rankB = fighterRankings.get(b.fighterId) || 999;
        return rankA - rankB;
    });

    // Update rank property
    sortedStandings.forEach((standing, index) => {
        standing.rank = index + 1;
    });

    return sortedStandings;
};

/**
 * Get all completed fights in a division up to and including a specific fight
 */
const getCompletedFightsUpToPoint = (
    allFights: any[],
    fightIdentifier: string,
    divisionNumber: number
): any[] => {
    // Parse fight identifier (e.g., "IFC-S10-D1-R5-F1")
    const parts = fightIdentifier.split('-');
    const targetRound = parseInt(parts[3].substring(1));
    const targetFightNum = parseInt(parts[4].substring(1));

    return allFights.filter(fight => {
        if (fight.fightStatus !== 'completed' || !fight.winner) return false;

        const fightParts = fight.fightIdentifier.split('-');
        const fightRound = parseInt(fightParts[3].substring(1));
        const fightNum = parseInt(fightParts[4].substring(1));

        // Include if in earlier round, or same round but earlier/equal fight number
        if (fightRound < targetRound) return true;
        if (fightRound === targetRound && fightNum <= targetFightNum) return true;

        return false;
    });
};

/**
 * Prepares round standings update after a fight result
 * This calculates the standings for all fighters in the division
 * after the current fight is completed.
 * 
 * @param competitionData - Full competition document
 * @param fightId - The fight identifier (e.g., "IFC-S10-D1-R5-F1")
 * @param divisionNumber - The division number
 * @param roundNumber - The round number
 * @param divisionFighters - Array of fighter IDs in the division
 * @returns Round standings document to be saved
 */
export const prepareRoundStandingsUpdate = (
    competitionData: any,
    fightId: string,
    competitionId: string,
    seasonNumber: number,
    divisionNumber: number,
    roundNumber: number,
    divisionFighters: string[]
) => {
    console.log(`\n📊 Calculating Round Standings for ${fightId}...`);

    // Get all fights in this division from competition data
    const division = competitionData.leagueData?.divisions?.find(
        (d: any) => d.divisionNumber === divisionNumber
    );

    if (!division) {
        console.warn(`⚠️ Division ${divisionNumber} not found in competition data`);
        return null;
    }

    // Flatten all fights from all rounds in this division
    const allDivisionFights: any[] = [];
    division.rounds?.forEach((round: any) => {
        round.fights?.forEach((fight: any) => {
            allDivisionFights.push(fight);
        });
    });

    // Get completed fights up to this point
    const completedFights = getCompletedFightsUpToPoint(
        allDivisionFights,
        fightId,
        divisionNumber
    );

    console.log(`   - Division fighters: ${divisionFighters.length}`);
    console.log(`   - Completed fights: ${completedFights.length}`);

    // Calculate stats for each fighter
    const fighterStats = new Map<string, any>();
    divisionFighters.forEach(fighterId => {
        fighterStats.set(fighterId, {
            fighterId,
            fightsCount: 0,
            wins: 0,
            points: 0,
            rank: 0,  // Will be calculated later
            totalFightersCount: divisionFighters.length
        });
    });

    // Process completed fights
    completedFights.forEach(fight => {
        const fighter1Stats = fighterStats.get(fight.fighter1);
        const fighter2Stats = fighterStats.get(fight.fighter2);

        if (fighter1Stats) {
            fighter1Stats.fightsCount++;
            if (fight.winner === fight.fighter1) {
                fighter1Stats.wins++;
                fighter1Stats.points += POINTS_PER_WIN;
            }
        }

        if (fighter2Stats) {
            fighter2Stats.fightsCount++;
            if (fight.winner === fight.fighter2) {
                fighter2Stats.wins++;
                fighter2Stats.points += POINTS_PER_WIN;
            }
        }
    });

    // Convert to array and sort with tiebreakers
    let standings = Array.from(fighterStats.values());
    standings = sortStandingsWithTiebreakers(standings, completedFights);

    console.log(`   ✅ Standings calculated - Top 3:`);
    standings.slice(0, 3).forEach((s, idx) => {
        const trophy = idx === 0 ? ' 🏆' : '';
        console.log(`      ${s.rank}. Fighter ${s.fighterId.substring(0, 8)}... - ${s.points} pts (${s.wins}W)${trophy}`);
    });

    return {
        competitionId,
        seasonNumber,
        divisionNumber,
        roundNumber,
        fightId,
        fightIdentifier: fightId,
        standings
    };
};

// ==========================================
// DETERMINE DIVISION WINNERS
// ==========================================

/**
 * Prepares the structure for updating division winners in seasonMeta
 * when a season is complete. This should be called AFTER verifying
 * the season is complete using checkSeasonCompletion().
 * 
 * NOTE: This function does NOT sort standings. It assumes the standings
 * have already been calculated and sorted by the round standings logic.
 * It simply picks all fighters with rank 1.
 * 
 * @param competitionData - Full competition document with leagueData
 * @param finalStandingsData - Array of ALREADY SORTED standings data for each division
 * @returns Object with updates for seasonMeta.leagueDivisions[].winners
 */
export const prepareDivisionWinnersUpdate = (
    competitionData: any,
    finalStandingsData: Array<{
        divisionNumber: number;
        standings: Array<{
            fighterId: string;
            fightsCount: number;
            wins: number;
            points: number;
            rank: number;
            totalFightersCount: number;
        }>;
    }>
) => {
    console.log('\n🏆 Determining Division Winners...');

    const isLeague = competitionData.leagueData !== null && competitionData.leagueData !== undefined;

    if (!isLeague) {
        console.warn('⚠️ Not a league competition. Division winners only apply to leagues.');
        return null;
    }

    const divisionWinners: Array<{
        divisionNumber: number;
        winners: string[];  // Fighter IDs (array to support potential ties)
    }> = [];

    for (const divisionStandings of finalStandingsData) {
        const { divisionNumber, standings } = divisionStandings;

        if (!standings || standings.length === 0) {
            console.warn(`⚠️ No standings found for Division ${divisionNumber}`);
            continue;
        }

        // Simply get all fighters with rank 1 (standings are pre-sorted by round standings calculation)
        const topRankFighters = standings.filter(s => s.rank === 1);

        if (topRankFighters.length === 0) {
            console.warn(`⚠️ No rank 1 fighter found in Division ${divisionNumber}`);
            continue;
        }

        const winnerIds = topRankFighters.map(f => f.fighterId);

        console.log(
            `🥇 Division ${divisionNumber} Winner${winnerIds.length > 1 ? 's' : ''}: ` +
            `${winnerIds.join(', ')}` +
            (topRankFighters[0] ? ` (${topRankFighters[0].wins} wins, ${topRankFighters[0].points} points)` : '')
        );

        divisionWinners.push({
            divisionNumber,
            winners: winnerIds
        });
    }

    if (divisionWinners.length === 0) {
        console.warn('⚠️ No division winners could be determined');
        return null;
    }

    console.log(`✅ Successfully determined winners for ${divisionWinners.length} division(s)`);

    return {
        competitionId: competitionData.id,
        seasonNumber: competitionData.seasonMeta?.seasonNumber,
        divisionWinners,
        updateType: 'seasonMeta.leagueDivisions[].winners'
    };
};

