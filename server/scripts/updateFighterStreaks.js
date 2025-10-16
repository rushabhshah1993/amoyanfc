import mongoose from 'mongoose';
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { connectDB } from '../db/connectDB.js';

/**
 * Updates fighter streaks by processing all fights chronologically
 * This function processes fights from Season 1 onwards and updates streak data
 * for all fighters based on their win/loss records
 */
async function updateFighterStreaks() {
    try {
        console.log('Starting fighter streak update process...');
        
        // Connect to database
        await connectDB();
        console.log('Connected to database');

        // Get all competitions ordered by season
        const competitions = await Competition.find({})
            .populate('competitionMetaId')
            .sort({ 'seasonMeta.seasonNumber': 1 });
        
        console.log(`Found ${competitions.length} competitions to process`);

        // Get all fighters to initialize streak tracking
        const allFighters = await Fighter.find({});
        const fighterMap = new Map();
        
        // Initialize fighter streak tracking
        allFighters.forEach(fighter => {
            fighterMap.set(fighter._id.toString(), {
                id: fighter._id,
                activeWinStreak: null,
                activeLoseStreak: null,
                streaks: fighter.streaks || []
            });
        });

        console.log(`Initialized tracking for ${allFighters.length} fighters`);

        // Process each competition chronologically
        for (const competition of competitions) {
            console.log(`\nProcessing Season ${competition.seasonMeta.seasonNumber}...`);
            
            const seasonNumber = competition.seasonMeta.seasonNumber;
            const competitionId = competition.competitionMetaId._id;

            // Process league data (divisions and rounds)
            if (competition.leagueData && competition.leagueData.divisions) {
                for (const division of competition.leagueData.divisions) {
                    console.log(`  Processing Division ${division.divisionNumber}...`);
                    
                    // Sort rounds by round number to ensure chronological order
                    const sortedRounds = division.rounds.sort((a, b) => a.roundNumber - b.roundNumber);
                    
                    for (const round of sortedRounds) {
                        console.log(`    Processing Round ${round.roundNumber}...`);
                        
                        // Process each fight in the round
                        for (const fight of round.fights) {
                            // Only process completed fights with a winner
                            if (fight && fight.winner && fight.fighter1 && fight.fighter2) {
                                await processFight(
                                    fight,
                                    seasonNumber,
                                    division.divisionNumber,
                                    round.roundNumber,
                                    competitionId,
                                    fighterMap
                                );
                            }
                        }
                    }
                }
            }

            // Process cup data if it exists
            if (competition.cupData && competition.cupData.fights) {
                console.log(`  Processing Cup fights...`);
                
                for (const fight of competition.cupData.fights) {
                    if (fight && fight.winner && fight.fighter1 && fight.fighter2) {
                        await processFight(
                            fight,
                            seasonNumber,
                            0, // Cup competitions don't have divisions
                            0, // Cup fights don't have rounds in the same way
                            competitionId,
                            fighterMap
                        );
                    }
                }
            }
        }

        // Save all updated fighter streaks to database
        console.log('\nSaving updated streaks to database...');
        let updatedCount = 0;
        
        for (const [fighterId, fighterData] of fighterMap) {
            try {
                await Fighter.findByIdAndUpdate(
                    fighterData.id,
                    { streaks: fighterData.streaks },
                    { new: true }
                );
                updatedCount++;
                
                if (updatedCount % 10 === 0) {
                    console.log(`  Updated ${updatedCount} fighters...`);
                }
            } catch (error) {
                console.error(`Error updating fighter ${fighterId}:`, error.message);
            }
        }

        console.log(`\n✅ Successfully updated streaks for ${updatedCount} fighters`);
        console.log('Fighter streak update process completed!');

    } catch (error) {
        console.error('Error in updateFighterStreaks:', error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

/**
 * Processes a single fight and updates streak data for both fighters
 * @param {Object} fight - The fight object containing fighter1, fighter2, winner
 * @param {Number} seasonNumber - The season number
 * @param {Number} divisionNumber - The division number
 * @param {Number} roundNumber - The round number
 * @param {ObjectId} competitionId - The competition ID
 * @param {Map} fighterMap - Map containing fighter streak data
 */
async function processFight(fight, seasonNumber, divisionNumber, roundNumber, competitionId, fighterMap) {
    const fighter1Id = fight.fighter1.toString();
    const fighter2Id = fight.fighter2.toString();
    const winnerId = fight.winner.toString();

    const fighter1Data = fighterMap.get(fighter1Id);
    const fighter2Data = fighterMap.get(fighter2Id);

    if (!fighter1Data || !fighter2Data) {
        console.warn(`Fighter not found in map: ${fighter1Id} or ${fighter2Id}`);
        return;
    }

    const fightContext = {
        season: seasonNumber,
        division: divisionNumber,
        round: roundNumber
    };

    // Determine winner and loser
    const isFighter1Winner = winnerId === fighter1Id;
    const winnerData = isFighter1Winner ? fighter1Data : fighter2Data;
    const loserData = isFighter1Winner ? fighter2Data : fighter1Data;
    const winnerId_str = isFighter1Winner ? fighter1Id : fighter2Id;
    const loserId_str = isFighter1Winner ? fighter2Id : fighter1Id;

    // Update winner's streak
    await updateWinnerStreak(winnerData, loserId_str, fightContext, competitionId);
    
    // Update loser's streak
    await updateLoserStreak(loserData, winnerId_str, fightContext, competitionId);
}

/**
 * Updates streak data for the winning fighter
 * @param {Object} winnerData - Winner's fighter data from the map
 * @param {String} loserId - Loser's fighter ID
 * @param {Object} fightContext - Context of the fight (season, division, round)
 * @param {ObjectId} competitionId - Competition ID
 */
async function updateWinnerStreak(winnerData, loserId, fightContext, competitionId) {
    // If winner has an active win streak, extend it
    if (winnerData.activeWinStreak !== null) {
        const winStreak = winnerData.streaks[winnerData.activeWinStreak];
        winStreak.count++;
        winStreak.opponents.push(new mongoose.Types.ObjectId(loserId));
    } else {
        // End any active lose streak first
        if (winnerData.activeLoseStreak !== null) {
            const loseStreak = winnerData.streaks[winnerData.activeLoseStreak];
            loseStreak.active = false;
            loseStreak.end = fightContext;
            winnerData.activeLoseStreak = null;
        }

        // Start new win streak
        const newWinStreak = {
            competitionId: competitionId,
            type: 'win',
            start: fightContext,
            end: null,
            count: 1,
            active: true,
            opponents: [new mongoose.Types.ObjectId(loserId)]
        };

        winnerData.streaks.push(newWinStreak);
        winnerData.activeWinStreak = winnerData.streaks.length - 1;
    }
}

/**
 * Updates streak data for the losing fighter
 * @param {Object} loserData - Loser's fighter data from the map
 * @param {String} winnerId - Winner's fighter ID
 * @param {Object} fightContext - Context of the fight (season, division, round)
 * @param {ObjectId} competitionId - Competition ID
 */
async function updateLoserStreak(loserData, winnerId, fightContext, competitionId) {
    // If loser has an active lose streak, extend it
    if (loserData.activeLoseStreak !== null) {
        const loseStreak = loserData.streaks[loserData.activeLoseStreak];
        loseStreak.count++;
        loseStreak.opponents.push(new mongoose.Types.ObjectId(winnerId));
    } else {
        // End any active win streak first
        if (loserData.activeWinStreak !== null) {
            const winStreak = loserData.streaks[loserData.activeWinStreak];
            winStreak.active = false;
            winStreak.end = fightContext;
            loserData.activeWinStreak = null;
        }

        // Start new lose streak
        const newLoseStreak = {
            competitionId: competitionId,
            type: 'lose',
            start: fightContext,
            end: null,
            count: 1,
            active: true,
            opponents: [new mongoose.Types.ObjectId(winnerId)]
        };

        loserData.streaks.push(newLoseStreak);
        loserData.activeLoseStreak = loserData.streaks.length - 1;
    }
}

/**
 * Utility function to reset all fighter streaks (use with caution)
 * This function clears all streak data from all fighters
 */
async function resetAllFighterStreaks() {
    try {
        console.log('Resetting all fighter streaks...');
        
        await connectDB();
        
        const result = await Fighter.updateMany(
            {},
            { $set: { streaks: [] } }
        );
        
        console.log(`✅ Reset streaks for ${result.modifiedCount} fighters`);
        
    } catch (error) {
        console.error('Error resetting fighter streaks:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
    }
}

// Export functions for use in other scripts
export { updateFighterStreaks, resetAllFighterStreaks };

// Run the function if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1]) ||
                     process.argv[1].includes('updateFighterStreaks.js');

if (isMainModule) {
    const command = process.argv[2];
    
    if (command === 'reset') {
        resetAllFighterStreaks()
            .then(() => {
                console.log('✅ Reset completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Script failed:', error);
                process.exit(1);
            });
    } else {
        updateFighterStreaks()
            .then(() => {
                console.log('✅ Update completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Script failed:', error);
                process.exit(1);
            });
    }
}
