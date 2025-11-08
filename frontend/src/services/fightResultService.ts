/**
 * ⚠️⚠️⚠️ REFERENCE FILE ONLY - NOT ACTIVELY USED ⚠️⚠️⚠️
 * 
 * This file is kept for REFERENCE and DOCUMENTATION purposes only.
 * 
 * CURRENT IMPLEMENTATION (November 8, 2025):
 * All fight result processing now happens on the BACKEND:
 * → Location: server/services/fight-result.service.js
 * → Triggered by: GraphQL mutations (simulateFight, generateFightWithWinner)
 * → Handles: All 8 MongoDB update steps + IC/CC season creation
 * 
 * WHY THIS FILE STILL EXISTS:
 * - Documents the fight result data structure
 * - Reference for understanding MongoDB update flow
 * - Useful for debugging and comparison
 * - Educational purposes for new developers
 * 
 * DO NOT USE THIS FILE IN PRODUCTION CODE!
 * 
 * See also:
 * - frontend/src/utils/fightService.README.md
 * - BACKEND_FIGHT_RESULT_IMPLEMENTATION.md
 * - FIGHT_RESULT_SERVICE_README.md
 * 
 * ========================================================================
 * ORIGINAL DOCUMENTATION (kept for reference):
 * ========================================================================
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
        shouldDeactivateSeason?: boolean;
    };
    seasonMetaUpdate?: {
        isActive?: boolean;
        endDate?: string;
        createdAt?: string;
    };
    cupBracketProgression?: {
        updateType: 'final' | 'update_existing' | 'create_new';
        seasonWinnerUpdate?: {
            winner: string;
        };
        championTitleUpdate?: {
            competitionId: string;
            titleUpdate: {
                totalTitles: number;
                newTitleDetail: {
                    competitionSeasonId: string;
                    seasonNumber: number;
                };
            };
        };
        nextFightUpdate?: {
            fightIdentifier: string;
            fighter1?: string;
            fighter2?: string;
        };
        newFight?: {
            fighter1: string | null;
            fighter2: string | null;
            winner: null;
            fightIdentifier: string;
            date: null;
            userDescription: null;
            genAIDescription: null;
            isSimulated: false;
            fighterStats: [];
            fightStatus: 'scheduled';
        };
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
 * @param competitionType - 'league' or 'cup' - determines if seasonDetails should be updated
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
    timestamp: string,
    competitionType: 'league' | 'cup'
) => {
    // Only update seasonDetails for league competitions
    const seasonDetailsUpdate = competitionType === 'league' 
        ? prepareSeasonDetailsUpdate(fighter, competitionId, seasonNumber, divisionNumber, isWinner)
        : undefined;

    return {
        fighterId: fighter.id,
        competitionHistoryUpdate: prepareCompetitionHistoryUpdate(fighter, competitionId, isWinner),
        seasonDetailsUpdate,
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
    
    // Determine competition type (league or cup)
    const competitionType: 'league' | 'cup' = 
        competition.leagueData !== null && competition.leagueData !== undefined ? 'league' : 'cup';
    
    console.log(`📊 Competition Type: ${competitionType.toUpperCase()}`);
    
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
        timestamp,
        competitionType
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
        timestamp,
        competitionType
    );

    // Calculate round standings after this fight (ONLY for league competitions)
    let roundStandingsUpdate = null;
    if (competitionType === 'league') {
        const divisionFighters = competition.seasonMeta?.leagueDivisions?.find(
            (div: any) => div.divisionNumber === divisionNumber
        )?.fighters || [];
        
        if (divisionFighters.length > 0) {
            roundStandingsUpdate = prepareRoundStandingsUpdate(
                competition,
                fightId,
                competitionId,
                seasonNumber,
                divisionNumber,
                roundNumber,
                divisionFighters
            );
        }
    } else {
        console.log('⏭️  Skipping round standings calculation (cup competition)');
    }

    // Check if season is completed after this fight
    const seasonCompletionStatus = checkSeasonCompletion(competition);

    // Check if IC season should be created (ONLY for league competitions at 25% completion)
    // Note: This is called asynchronously and doesn't block the main payload
    // TODO: Uncomment when MongoDB integration is ready
    // if (competitionType === 'league') {
    //     checkAndCreateICSeasonIfNeeded(competition, competitionId, seasonNumber).catch(err => {
    //         console.error('Error checking IC season creation:', err);
    //     });
    // }

    // Check if this is the first completed fight of the season
    const divisions = competition.leagueData?.divisions || competition.cupData?.fights || [];
    let isFirstFight = true;
    
    if (competition.leagueData?.divisions) {
        // For league competitions, check all divisions
        for (const division of competition.leagueData.divisions) {
            for (const round of division.rounds || []) {
                for (const fight of round.fights || []) {
                    // If any fight is already completed (and it's not the current fight)
                    if (fight.fightIdentifier !== fightId && 
                        (fight.fightStatus === 'completed' || fight.winner !== null)) {
                        isFirstFight = false;
                        break;
                    }
                }
                if (!isFirstFight) break;
            }
            if (!isFirstFight) break;
        }
    } else if (competition.cupData?.fights) {
        // For cup competitions, check all fights
        for (const fight of competition.cupData.fights) {
            if (fight.fightIdentifier !== fightId && 
                (fight.fightStatus === 'completed' || fight.winner !== null)) {
                isFirstFight = false;
                break;
            }
        }
    }

    // Prepare season meta update
    let seasonMetaUpdate: any = undefined;
    
    if (seasonCompletionStatus.isSeasonCompleted) {
        // Season ended - mark as inactive
        seasonMetaUpdate = {
            isActive: false,
            endDate: timestamp
        };
        
        // TODO: When season completes, backend should:
        // 1. Query final standings for all divisions using GET_FINAL_SEASON_STANDINGS
        // 2. Call prepareDivisionWinnersUpdate() to determine winners
        // 3. Call checkAndCreateCCSeasonIfNeeded() with final standings to create Champions Cup
        console.log('🏁 Season completed! Backend should create CC season with final standings.');
    } else if (isFirstFight) {
        // First fight - update createdAt
        seasonMetaUpdate = {
            createdAt: timestamp
        };
    }

    if (isFirstFight) {
        console.log('🎉 First fight of the season! Updating createdAt timestamp.');
    }

    // Handle cup bracket progression (IC & CC)
    let cupBracketProgression = null;
    if (competitionType === 'cup') {
        // Determine which fighter is the champion
        const championFighter = chatGPTResponse.winner === fighter1.id ? fighter1 : fighter2;
        
        cupBracketProgression = prepareCupBracketProgression(
            competition,
            fightId,
            chatGPTResponse.winner,
            championFighter
        );
    }

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
        ...(seasonMetaUpdate && { seasonMetaUpdate }),
        ...(cupBracketProgression && { cupBracketProgression }),
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

/**
 * Prepare title updates for all division winners (league only)
 * Updates each division winner's competitionHistory.titles
 * 
 * @param competitionData - Full competition document
 * @param seasonNumber - Season number
 * @param divisionWinnersData - Output from prepareDivisionWinnersUpdate()
 * @param winnerFightersData - Array of full fighter documents for all winners
 * @returns Title updates for all division winners
 */
export const prepareDivisionWinnersTitleUpdates = (
    competitionData: any,
    seasonNumber: number,
    divisionWinnersData: {
        competitionId: string;
        seasonNumber: number;
        divisionWinners: Array<{
            divisionNumber: number;
            winners: string[];
        }>;
        updateType: string;
    },
    winnerFightersData: Array<any>
) => {
    console.log('\n🏆 Preparing Title Updates for Division Winners...');

    if (!divisionWinnersData || !divisionWinnersData.divisionWinners) {
        console.log('⚠️  No division winners data provided');
        return null;
    }

    const competitionMetaId = competitionData.competitionMetaId;
    const competitionSeasonId = competitionData.id;
    const titleUpdates: Array<{
        fighterId: string;
        fighterName: string;
        divisionNumber: number;
        competitionId: string;
        titleUpdate: {
            totalTitles: number;
            newTitleDetail: {
                competitionSeasonId: string;
                seasonNumber: number;
                divisionNumber: number;
            };
        };
    }> = [];

    // Process each division
    for (const division of divisionWinnersData.divisionWinners) {
        // Process each winner in the division (typically 1, but could be multiple in case of ties)
        for (const winnerId of division.winners) {
            const winnerFighter = winnerFightersData.find((f: any) => f.id === winnerId || f._id === winnerId);

            if (!winnerFighter) {
                console.log(`   ⚠️  Fighter data not found for winner ${winnerId.substring(0, 8)}... - skipping title update`);
                continue;
            }

            // Find the competitionHistory entry for this competition
            const competitionHistory = winnerFighter.competitionHistory?.find(
                (ch: any) => ch.competitionId === competitionMetaId
            );

            if (!competitionHistory) {
                console.log(`   ⚠️  No competition history found for ${winnerFighter.firstName} ${winnerFighter.lastName} - skipping`);
                continue;
            }

            const existingTitles = competitionHistory.titles;
            const hasExistingTitles = existingTitles && existingTitles.totalTitles > 0;

            let newTotalTitles: number;
            if (hasExistingTitles) {
                newTotalTitles = existingTitles.totalTitles + 1;
                console.log(`   ✓ Division ${division.divisionNumber} - ${winnerFighter.firstName} ${winnerFighter.lastName}: ${existingTitles.totalTitles} → ${newTotalTitles} titles`);
            } else {
                newTotalTitles = 1;
                console.log(`   ✨ Division ${division.divisionNumber} - ${winnerFighter.firstName} ${winnerFighter.lastName}: First title!`);
            }

            titleUpdates.push({
                fighterId: winnerId,
                fighterName: `${winnerFighter.firstName} ${winnerFighter.lastName}`,
                divisionNumber: division.divisionNumber,
                competitionId: competitionMetaId,
                titleUpdate: {
                    totalTitles: newTotalTitles,
                    newTitleDetail: {
                        competitionSeasonId,
                        seasonNumber,
                        divisionNumber: division.divisionNumber
                    }
                }
            });
        }
    }

    console.log(`✅ Prepared title updates for ${titleUpdates.length} division winner(s)`);

    return {
        titleUpdates
    };
};

// ==========================================
// IC SEASON CREATION (25% League Completion)
// ==========================================

/**
 * Check if 25% of league fights are completed and create IC season if needed
 * 
 * @param competitionData - Full league competition document
 * @param leagueCompetitionId - League competition ID
 * @param leagueSeasonNumber - League season number
 * @returns IC season creation payload or null
 */
export const checkAndCreateICSeasonIfNeeded = async (
    competitionData: any,
    leagueCompetitionId: string,
    leagueSeasonNumber: number
) => {
    console.log('\n🔍 Checking if IC Season should be created...');

    const isLeague = competitionData.leagueData !== null && competitionData.leagueData !== undefined;

    if (!isLeague) {
        console.log('⏭️  Skipping: Not a league competition');
        return null;
    }

    // Calculate total fights and completed fights
    const divisions = competitionData.leagueData.divisions || [];
    let totalFights = 0;
    let completedFights = 0;

    divisions.forEach((division: any) => {
        division.rounds?.forEach((round: any) => {
            const fights = round.fights || [];
            totalFights += fights.length;
            completedFights += fights.filter((f: any) => 
                f.fightStatus === 'completed' || f.winner !== null
            ).length;
        });
    });

    const completionPercentage = totalFights > 0 ? (completedFights / totalFights) * 100 : 0;

    console.log(`   📊 Completion: ${completedFights}/${totalFights} fights (${completionPercentage.toFixed(2)}%)`);

    // Check if exactly 25% (with small tolerance for floating point)
    if (Math.abs(completionPercentage - 25) > 0.5) {
        if (completionPercentage > 25) {
            console.log('⏭️  Skipping: Already past 25% threshold');
        } else {
            console.log('⏳ Not yet at 25% threshold');
        }
        return null;
    }

    console.log('✅ Exactly at 25% completion! Checking if IC season should be created...');

    // TODO: Query MongoDB to check if IC season already exists for this league season
    // const existingICSeasons = await Competition.find({
    //     'linkedLeagueSeason.competitionId': leagueCompetitionId,
    //     'linkedLeagueSeason.seasonNumber': leagueSeasonNumber
    // });
    // 
    // if (existingICSeasons.length > 0) {
    //     console.log('⏭️  Skipping: IC season already exists for this league season');
    //     return null;
    // }

    console.log('📝 Creating new IC season...');

    // TODO: Query MongoDB for IC competition meta and previous champion
    // const icMeta = await CompetitionMeta.findOne({
    //     competitionName: 'Invicta Cup',
    //     type: 'cup'
    // });
    // const IC_COMPETITION_META_ID = icMeta._id;
    //
    // const previousICSeason = await Competition.findOne({
    //     competitionMetaId: IC_COMPETITION_META_ID
    // }).sort({ 'seasonMeta.seasonNumber': -1 }).limit(1);
    // 
    // const previousChampion = previousICSeason?.seasonMeta?.winners?.[0];
    // const newICSeasonNumber = (previousICSeason?.seasonMeta?.seasonNumber || 0) + 1;

    // For now, using placeholders
    const previousChampion = 'PREVIOUS_IC_CHAMPION_ID'; // TODO: Replace with actual query result
    const newICSeasonNumber = 5; // TODO: Get from MongoDB

    // Get all fighters from current league season (all divisions)
    const allLeagueFighters: string[] = [];
    const divisionFightersMap = new Map<number, string[]>();

    competitionData.seasonMeta?.leagueDivisions?.forEach((division: any) => {
        const divisionFighters = division.fighters || [];
        divisionFightersMap.set(division.divisionNumber, divisionFighters);
        allLeagueFighters.push(...divisionFighters);
    });

    console.log(`   👥 Total league fighters: ${allLeagueFighters.length}`);
    console.log(`   👑 Previous IC champion: ${previousChampion.substring(0, 8)}...`);

    // Remove previous champion from available pool
    const availableFighters = allLeagueFighters.filter(id => id !== previousChampion);

    if (availableFighters.length < 7) {
        console.error('❌ Error: Not enough fighters available after excluding champion');
        return null;
    }

    // Select 7 random fighters ensuring at least 1 from each division
    const selectedFighters: string[] = [previousChampion];
    const fightersToSelect = new Set<string>();

    // First, ensure at least 1 fighter from each division
    divisionFightersMap.forEach((fighters, divisionNumber) => {
        const divisionFighters = fighters.filter(id => id !== previousChampion);
        if (divisionFighters.length > 0) {
            const randomIndex = Math.floor(Math.random() * divisionFighters.length);
            const selectedFighter = divisionFighters[randomIndex];
            fightersToSelect.add(selectedFighter);
            console.log(`   ✓ Division ${divisionNumber}: Selected ${selectedFighter.substring(0, 8)}...`);
        }
    });

    // If we have less than 7 fighters, select more randomly
    const remainingFighters = availableFighters.filter(id => !fightersToSelect.has(id));
    const needMoreFighters = 7 - fightersToSelect.size;

    if (needMoreFighters > 0) {
        const shuffled = remainingFighters.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(needMoreFighters, shuffled.length); i++) {
            fightersToSelect.add(shuffled[i]);
            console.log(`   ✓ Random: Selected ${shuffled[i].substring(0, 8)}...`);
        }
    }

    selectedFighters.push(...Array.from(fightersToSelect).slice(0, 7));

    if (selectedFighters.length !== 8) {
        console.error(`❌ Error: Could not select exactly 8 fighters (got ${selectedFighters.length})`);
        return null;
    }

    console.log(`   ✅ Selected 8 fighters for IC season`);

    // Create random pairings for Round 1 (4 fights)
    const shuffledFighters = [...selectedFighters].sort(() => Math.random() - 0.5);
    const round1Fights = [];

    for (let i = 0; i < 4; i++) {
        const fighter1 = shuffledFighters[i * 2];
        const fighter2 = shuffledFighters[i * 2 + 1];
        const fightIdentifier = `IC-S${newICSeasonNumber}-R1-F${i + 1}`;

        round1Fights.push({
            fighter1,
            fighter2,
            winner: null,
            fightIdentifier,
            date: null,
            userDescription: null,
            genAIDescription: null,
            isSimulated: false,
            fighterStats: [],
            fightStatus: 'scheduled'
        });

        console.log(`   🥊 Fight ${i + 1}: ${fighter1.substring(0, 8)}... vs ${fighter2.substring(0, 8)}...`);
    }

    // Create IC season structure
    const icSeasonData = {
        // TODO: Get actual IC competition meta ID from MongoDB
        competitionMetaId: 'IC_COMPETITION_META_ID', // Placeholder
        competitionMeta: {
            competitionName: 'Invicta Cup',
            type: 'cup',
            logo: 'competitions/ic-logo.png'
        },
        isActive: true,
        seasonMeta: {
            seasonNumber: newICSeasonNumber,
            startDate: new Date().toISOString(),
            endDate: null,
            winners: [], // Will be populated when season ends
            leagueDivisions: null,
            cupParticipants: {
                fighters: selectedFighters
            }
        },
        leagueData: null,
        cupData: {
            fights: round1Fights,
            currentStage: 'Quarter-finals'
        },
        config: {
            leagueConfiguration: null,
            cupConfiguration: {
                knockoutRounds: 3,
                numberOfFighters: 8,
                perFightFeeInEur: 10000,
                winningFeeInEur: 100000,
                stages: ['Quarter-finals', 'Semi-finals', 'Finals']
            }
        },
        linkedLeagueSeason: {
            competitionId: leagueCompetitionId,
            seasonNumber: leagueSeasonNumber
        }
    };

    console.log('\n✨ IC Season created successfully!');
    console.log(`   🏆 Season: IC S${newICSeasonNumber}`);
    console.log(`   👥 Participants: 8 fighters`);
    console.log(`   🥊 Round 1 Fights: 4 (all scheduled)`);
    console.log(`   🔗 Linked to: League Competition ${leagueCompetitionId} S${leagueSeasonNumber}`);

    // TODO: Save to MongoDB (commented for now)
    // try {
    //     const newICCompetition = await Competition.create(icSeasonData);
    //     console.log(`✅ IC Season saved to MongoDB with ID: ${newICCompetition._id}`);
    //     return {
    //         success: true,
    //         icCompetitionId: newICCompetition._id,
    //         seasonNumber: newICSeasonNumber,
    //         participants: selectedFighters,
    //         fights: round1Fights
    //     };
    // } catch (error) {
    //     console.error('❌ Error saving IC season to MongoDB:', error);
    //     return null;
    // }

    // For now, just return the data structure
    console.log('\n📋 IC Season Data (not saved to DB yet):');
    console.log(JSON.stringify(icSeasonData, null, 2));

    return {
        success: true,
        icSeasonData,
        seasonNumber: newICSeasonNumber,
        participants: selectedFighters,
        fights: round1Fights,
        linkedLeagueSeason: {
            competitionId: leagueCompetitionId,
            seasonNumber: leagueSeasonNumber
        }
    };
};

// ==========================================
// CUP BRACKET PROGRESSION (IC & CC)
// ==========================================

/**
 * Prepare title update for cup champion
 * Updates fighter's competitionHistory.titles when they win IC or CC
 * 
 * @param fighter - Champion fighter document
 * @param competitionId - Competition ID (IC or CC)
 * @param competitionSeasonId - Full competition season document ID
 * @param seasonNumber - Season number won
 * @returns Title update payload
 */
const prepareTitleUpdate = (
    fighter: any,
    competitionId: string,
    competitionSeasonId: string,
    seasonNumber: number
) => {
    console.log(`   🏆 Preparing title update for champion ${fighter.firstName} ${fighter.lastName}`);

    // Find the competitionHistory entry for this competition
    const competitionHistory = fighter.competitionHistory?.find(
        (ch: any) => ch.competitionId === competitionId
    );

    if (!competitionHistory) {
        console.log('   ⚠️  No competition history found - title update will be skipped (should not happen)');
        return null;
    }

    const existingTitles = competitionHistory.titles;
    const hasExistingTitles = existingTitles && existingTitles.totalTitles > 0;

    if (hasExistingTitles) {
        // Add to existing titles
        console.log(`   ✓ Existing titles: ${existingTitles.totalTitles} → ${existingTitles.totalTitles + 1}`);
        
        return {
            competitionId,
            titleUpdate: {
                totalTitles: existingTitles.totalTitles + 1,
                newTitleDetail: {
                    competitionSeasonId,
                    seasonNumber
                    // No divisionNumber for cup competitions
                }
            }
        };
    } else {
        // Create new titles object
        console.log('   ✨ Creating first title for this competition');
        
        return {
            competitionId,
            titleUpdate: {
                totalTitles: 1,
                newTitleDetail: {
                    competitionSeasonId,
                    seasonNumber
                }
            }
        };
    }
};

/**
 * Handle cup tournament bracket progression
 * - Updates next round fights with winners
 * - Creates new round fights if needed
 * - Updates season winner when final completes
 * - Updates champion's title record
 * 
 * @param competition - Full competition document
 * @param completedFightIdentifier - e.g., "IC-S5-R1-F1"
 * @param winnerId - Winner's fighter ID
 * @param championFighter - Full champion fighter document (for title update)
 * @returns Update payload for cup progression
 */
export const prepareCupBracketProgression = (
    competition: any,
    completedFightIdentifier: string,
    winnerId: string,
    championFighter?: any
) => {
    console.log('\n🏆 Processing Cup Bracket Progression...');
    console.log(`   Fight: ${completedFightIdentifier}`);
    console.log(`   Winner: ${winnerId.substring(0, 8)}...`);

    // Parse fight identifier: "IC-S5-R1-F1" or "CC-S3-R2-F2"
    const parts = completedFightIdentifier.split('-');
    const competitionCode = parts[0]; // IC or CC
    const seasonNumber = parseInt(parts[1].substring(1)); // S5 → 5
    const roundNumber = parseInt(parts[2].substring(1)); // R1 → 1
    const fightNumber = parseInt(parts[3].substring(1)); // F1 → 1

    console.log(`   📊 Round ${roundNumber}, Fight ${fightNumber}`);

    const knockoutRounds = competition.config?.cupConfiguration?.knockoutRounds || 3;
    const isFinalRound = roundNumber === knockoutRounds;

    if (isFinalRound) {
        // This is the final fight - update season winner and champion's titles
        console.log('   🎉 FINAL FIGHT! Updating season winner and champion title...');
        
        // Prepare title update for the champion
        let championTitleUpdate = null;
        if (championFighter) {
            championTitleUpdate = prepareTitleUpdate(
                championFighter,
                competition.competitionMetaId,
                competition.id,
                seasonNumber
            );
        } else {
            console.log('   ⚠️  Champion fighter data not provided - title update will be skipped');
        }
        
        return {
            updateType: 'final' as const,
            seasonWinnerUpdate: {
                winner: winnerId
            },
            ...(championTitleUpdate && { championTitleUpdate })
        };
    }

    // Determine next round fight
    const nextRoundNumber = roundNumber + 1;
    
    // Calculate which next-round fight this winner goes to
    // R1 F1,F2 → R2 F1 (fighter1 from F1, fighter2 from F2)
    // R1 F3,F4 → R2 F2 (fighter1 from F3, fighter2 from F4)
    // R2 F1,F2 → R3 F1 (fighter1 from F1, fighter2 from F2)
    
    const nextRoundFightNumber = Math.ceil(fightNumber / 2);
    const isFirstFighterSlot = fightNumber % 2 === 1; // Odd fight numbers go to fighter1 slot
    
    const nextFightIdentifier = `${competitionCode}-S${seasonNumber}-R${nextRoundNumber}-F${nextRoundFightNumber}`;
    
    console.log(`   ➡️  Winner advances to: ${nextFightIdentifier} as ${isFirstFighterSlot ? 'Fighter 1' : 'Fighter 2'}`);

    // Check if next round fight already exists in cupData.fights
    const existingNextFight = competition.cupData?.fights?.find(
        (f: any) => f.fightIdentifier === nextFightIdentifier
    );

    if (existingNextFight) {
        // Update existing fight
        console.log('   ✓ Next round fight exists - updating fighter slot');
        
        return {
            updateType: 'update_existing' as const,
            nextFightUpdate: {
                fightIdentifier: nextFightIdentifier,
                [isFirstFighterSlot ? 'fighter1' : 'fighter2']: winnerId
            }
        };
    } else {
        // Create new fight for next round
        console.log('   ✨ Creating new fight for next round');
        
        const newFight = {
            fighter1: isFirstFighterSlot ? winnerId : null,
            fighter2: isFirstFighterSlot ? null : winnerId,
            winner: null,
            fightIdentifier: nextFightIdentifier,
            date: null,
            userDescription: null,
            genAIDescription: null,
            isSimulated: false,
            fighterStats: [],
            fightStatus: 'scheduled'
        };

        return {
            updateType: 'create_new' as const,
            newFight
        };
    }
};

// ==========================================
// UPCOMING FIGHTS (Homepage)
// ==========================================

/**
 * Get upcoming fights for homepage display
 * - For leagues: Returns next scheduled fight from each division (3 fights)
 * - For cups: Returns next scheduled fight where both fighters are determined
 * 
 * @param competitions - Array of active competition documents
 * @returns Array of upcoming fights for display
 */
export const getUpcomingFights = (competitions: Array<any>) => {
    console.log('\n📅 Getting Upcoming Fights...');

    const upcomingFights: Array<{
        fightId: string;
        fightIdentifier: string;
        competitionName: string;
        competitionLogo?: string;
        competitionType: 'league' | 'cup';
        seasonNumber: number;
        divisionNumber?: number;
        divisionName?: string;
        roundNumber?: number;
        roundName?: string;
        fighter1: {
            id: string;
            firstName?: string;
            lastName?: string;
            profileImage?: string;
        };
        fighter2: {
            id: string;
            firstName?: string;
            lastName?: string;
            profileImage?: string;
        };
        date?: string;
    }> = [];

    for (const competition of competitions) {
        // Skip inactive competitions
        if (!competition.isActive) {
            continue;
        }

        const competitionName = competition.competitionMeta?.competitionName || 'Unknown Competition';
        const competitionLogo = competition.competitionMeta?.logo;
        const seasonNumber = competition.seasonMeta?.seasonNumber || 0;

        // Check if it's a league or cup
        const isLeague = competition.leagueData !== null && competition.leagueData !== undefined;

        if (isLeague) {
            // LEAGUE: Get next fight from each division
            const divisions = competition.leagueData?.divisions || [];

            for (const division of divisions) {
                const divisionNumber = division.divisionNumber;
                const divisionName = division.divisionName || `Division ${divisionNumber}`;

                // Get fighter roster for this division from seasonMeta
                const divisionMeta = competition.seasonMeta?.leagueDivisions?.find(
                    (d: any) => d.divisionNumber === divisionNumber
                );
                const fighters = divisionMeta?.fighters || [];

                // Create fighter lookup map
                const fighterMap = new Map();
                fighters.forEach((fighter: any) => {
                    fighterMap.set(fighter.id, fighter);
                });

                // Find first fight without a winner
                let nextFight = null;

                for (const round of division.rounds || []) {
                    for (const fight of round.fights || []) {
                        if (fight.winner === null || fight.winner === undefined) {
                            nextFight = {
                                ...fight,
                                roundNumber: round.roundNumber,
                                divisionNumber,
                                divisionName
                            };
                            break;
                        }
                    }
                    if (nextFight) break;
                }

                if (nextFight) {
                    // Enrich fighter data
                    const fighter1Data = fighterMap.get(nextFight.fighter1) || { id: nextFight.fighter1 };
                    const fighter2Data = fighterMap.get(nextFight.fighter2) || { id: nextFight.fighter2 };

                    upcomingFights.push({
                        fightId: nextFight.fightIdentifier,
                        fightIdentifier: nextFight.fightIdentifier,
                        competitionName,
                        competitionLogo,
                        competitionType: 'league',
                        seasonNumber,
                        divisionNumber,
                        divisionName,
                        roundNumber: nextFight.roundNumber,
                        fighter1: {
                            id: fighter1Data.id,
                            firstName: fighter1Data.firstName,
                            lastName: fighter1Data.lastName,
                            profileImage: fighter1Data.profileImage
                        },
                        fighter2: {
                            id: fighter2Data.id,
                            firstName: fighter2Data.firstName,
                            lastName: fighter2Data.lastName,
                            profileImage: fighter2Data.profileImage
                        },
                        date: nextFight.date
                    });

                    console.log(`   🥊 ${competitionName} S${seasonNumber} D${divisionNumber}: ${nextFight.fightIdentifier}`);
                }
            }
        } else {
            // CUP: Get next fight where both fighters are determined
            const fights = competition.cupData?.fights || [];
            const currentStage = competition.cupData?.currentStage;
            
            // Get cup participants for fighter details
            const cupParticipants = competition.seasonMeta?.cupParticipants?.fighters || [];
            const fighterMap = new Map();
            cupParticipants.forEach((fighter: any) => {
                fighterMap.set(fighter.id, fighter);
            });

            for (const fight of fights) {
                // Check if fight has no winner and both fighters are set
                const hasNoWinner = fight.winner === null || fight.winner === undefined;
                const bothFightersSet = fight.fighter1 !== null && fight.fighter2 !== null;

                if (hasNoWinner && bothFightersSet) {
                    // Parse fight identifier to get round info
                    const parts = fight.fightIdentifier.split('-');
                    const roundNumber = parseInt(parts[2]?.substring(1) || '0');
                    
                    // Determine round name
                    let roundName = currentStage || 'Unknown';
                    if (fight.fightIdentifier.includes('R1')) {
                        roundName = 'Quarter-finals';
                    } else if (fight.fightIdentifier.includes('R2')) {
                        roundName = 'Semi-finals';
                    } else if (fight.fightIdentifier.includes('R3')) {
                        roundName = 'Finals';
                    }

                    // Enrich fighter data
                    const fighter1Data = fighterMap.get(fight.fighter1) || { id: fight.fighter1 };
                    const fighter2Data = fighterMap.get(fight.fighter2) || { id: fight.fighter2 };

                    upcomingFights.push({
                        fightId: fight.fightIdentifier,
                        fightIdentifier: fight.fightIdentifier,
                        competitionName,
                        competitionLogo,
                        competitionType: 'cup',
                        seasonNumber,
                        roundNumber,
                        roundName,
                        fighter1: {
                            id: fighter1Data.id,
                            firstName: fighter1Data.firstName,
                            lastName: fighter1Data.lastName,
                            profileImage: fighter1Data.profileImage
                        },
                        fighter2: {
                            id: fighter2Data.id,
                            firstName: fighter2Data.firstName,
                            lastName: fighter2Data.lastName,
                            profileImage: fighter2Data.profileImage
                        },
                        date: fight.date
                    });

                    console.log(`   🏆 ${competitionName} S${seasonNumber}: ${fight.fightIdentifier} (${roundName})`);
                    
                    // Only show one upcoming fight per cup competition
                    break;
                }
            }
        }
    }

    console.log(`✅ Found ${upcomingFights.length} upcoming fight(s)`);

    return upcomingFights;
};

// ==========================================
// CC SEASON CREATION (100% League Completion)
// ==========================================

/**
 * Create CC (Champions Cup) season when league season is 100% complete
 * Selects top-ranked fighters from each division:
 * - Top 3 from Division 1
 * - Top 3 from Division 2
 * - Top 2 from Division 3
 * 
 * @param competitionData - Full league competition document
 * @param leagueCompetitionId - League competition ID
 * @param leagueSeasonNumber - League season number
 * @param finalStandingsData - Final standings for all divisions
 * @returns CC season creation payload or null
 */
export const checkAndCreateCCSeasonIfNeeded = async (
    competitionData: any,
    leagueCompetitionId: string,
    leagueSeasonNumber: number,
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
    console.log('\n🏆 Checking if CC Season should be created...');

    const isLeague = competitionData.leagueData !== null && competitionData.leagueData !== undefined;

    if (!isLeague) {
        console.log('⏭️  Skipping: Not a league competition');
        return null;
    }

    // TODO: Query MongoDB to check if CC season already exists for this league season
    // const existingCCSeasons = await Competition.find({
    //     'linkedLeagueSeason.competitionId': leagueCompetitionId,
    //     'linkedLeagueSeason.seasonNumber': leagueSeasonNumber,
    //     'competitionMeta.competitionName': 'Champions Cup'
    // });
    // 
    // if (existingCCSeasons.length > 0) {
    //     console.log('⏭️  Skipping: CC season already exists for this league season');
    //     return null;
    // }

    console.log('📝 Creating new CC season from league champions...');

    // TODO: Query MongoDB for CC competition meta and latest season
    // const ccMeta = await CompetitionMeta.findOne({
    //     competitionName: 'Champions Cup',
    //     type: 'cup'
    // });
    // const CC_COMPETITION_META_ID = ccMeta._id;
    //
    // const latestCCSeason = await Competition.findOne({
    //     competitionMetaId: CC_COMPETITION_META_ID
    // }).sort({ 'seasonMeta.seasonNumber': -1 }).limit(1);
    // 
    // const newCCSeasonNumber = (latestCCSeason?.seasonMeta?.seasonNumber || 0) + 1;

    // For now, using placeholder
    const newCCSeasonNumber = 3; // TODO: Get from MongoDB

    // Select fighters from final standings
    const selectedFighters: string[] = [];

    // Get top 3 from Division 1
    const div1Standings = finalStandingsData.find(d => d.divisionNumber === 1);
    if (div1Standings && div1Standings.standings.length >= 3) {
        const top3Div1 = div1Standings.standings.slice(0, 3).map(s => s.fighterId);
        selectedFighters.push(...top3Div1);
        console.log(`   🥇 Division 1 - Top 3: ${top3Div1.map(id => id.substring(0, 8) + '...').join(', ')}`);
    } else {
        console.error('❌ Error: Division 1 does not have 3 fighters in standings');
        return null;
    }

    // Get top 3 from Division 2
    const div2Standings = finalStandingsData.find(d => d.divisionNumber === 2);
    if (div2Standings && div2Standings.standings.length >= 3) {
        const top3Div2 = div2Standings.standings.slice(0, 3).map(s => s.fighterId);
        selectedFighters.push(...top3Div2);
        console.log(`   🥈 Division 2 - Top 3: ${top3Div2.map(id => id.substring(0, 8) + '...').join(', ')}`);
    } else {
        console.error('❌ Error: Division 2 does not have 3 fighters in standings');
        return null;
    }

    // Get top 2 from Division 3
    const div3Standings = finalStandingsData.find(d => d.divisionNumber === 3);
    if (div3Standings && div3Standings.standings.length >= 2) {
        const top2Div3 = div3Standings.standings.slice(0, 2).map(s => s.fighterId);
        selectedFighters.push(...top2Div3);
        console.log(`   🥉 Division 3 - Top 2: ${top2Div3.map(id => id.substring(0, 8) + '...').join(', ')}`);
    } else {
        console.error('❌ Error: Division 3 does not have 2 fighters in standings');
        return null;
    }

    if (selectedFighters.length !== 8) {
        console.error(`❌ Error: Could not select exactly 8 fighters (got ${selectedFighters.length})`);
        return null;
    }

    console.log(`   ✅ Selected 8 fighters for CC season`);

    // Create random pairings for Round 1 (4 quarter-final fights)
    const shuffledFighters = [...selectedFighters].sort(() => Math.random() - 0.5);
    const round1Fights = [];

    for (let i = 0; i < 4; i++) {
        const fighter1 = shuffledFighters[i * 2];
        const fighter2 = shuffledFighters[i * 2 + 1];
        const fightIdentifier = `CC-S${newCCSeasonNumber}-R1-F${i + 1}`;

        round1Fights.push({
            fighter1,
            fighter2,
            winner: null,
            fightIdentifier,
            date: null,
            userDescription: null,
            genAIDescription: null,
            isSimulated: false,
            fighterStats: [],
            fightStatus: 'scheduled'
        });

        console.log(`   🥊 Fight ${i + 1}: ${fighter1.substring(0, 8)}... vs ${fighter2.substring(0, 8)}...`);
    }

    // Create CC season structure
    const ccSeasonData = {
        // TODO: Get actual CC competition meta ID from MongoDB
        competitionMetaId: 'CC_COMPETITION_META_ID', // Placeholder
        competitionMeta: {
            competitionName: 'Champions Cup',
            type: 'cup',
            logo: 'competitions/cc-logo.png'
        },
        isActive: true,
        seasonMeta: {
            seasonNumber: newCCSeasonNumber,
            startDate: new Date().toISOString(),
            endDate: null,
            winners: [], // Will be populated when season ends
            leagueDivisions: null,
            cupParticipants: {
                fighters: selectedFighters
            }
        },
        leagueData: null,
        cupData: {
            fights: round1Fights,
            currentStage: 'Quarter-finals'
        },
        config: {
            leagueConfiguration: null,
            cupConfiguration: {
                knockoutRounds: 3,
                numberOfFighters: 8,
                perFightFeeInEur: 15000,
                winningFeeInEur: 150000,
                stages: ['Quarter-finals', 'Semi-finals', 'Finals']
            }
        },
        linkedLeagueSeason: {
            competitionId: leagueCompetitionId,
            seasonNumber: leagueSeasonNumber
        }
    };

    console.log('\n✨ CC Season created successfully!');
    console.log(`   🏆 Season: CC S${newCCSeasonNumber}`);
    console.log(`   👥 Participants: 8 fighters (top-ranked from league)`);
    console.log(`   🥊 Round 1 Fights: 4 (all scheduled)`);
    console.log(`   🔗 Linked to: League Competition ${leagueCompetitionId} S${leagueSeasonNumber}`);

    // TODO: Save to MongoDB (commented for now)
    // try {
    //     const newCCCompetition = await Competition.create(ccSeasonData);
    //     console.log(`✅ CC Season saved to MongoDB with ID: ${newCCCompetition._id}`);
    //     return {
    //         success: true,
    //         ccCompetitionId: newCCCompetition._id,
    //         seasonNumber: newCCSeasonNumber,
    //         participants: selectedFighters,
    //         fights: round1Fights
    //     };
    // } catch (error) {
    //     console.error('❌ Error saving CC season to MongoDB:', error);
    //     return null;
    // }

    // For now, just return the data structure
    console.log('\n📋 CC Season Data (not saved to DB yet):');
    console.log(JSON.stringify(ccSeasonData, null, 2));

    return {
        success: true,
        ccSeasonData,
        seasonNumber: newCCSeasonNumber,
        participants: selectedFighters,
        fights: round1Fights,
        linkedLeagueSeason: {
            competitionId: leagueCompetitionId,
            seasonNumber: leagueSeasonNumber
        }
    };
};

