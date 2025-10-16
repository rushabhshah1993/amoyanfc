import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates complete streaks data for all fighters and saves to temporary file for review
 */
async function generateCompleteStreaksData() {
    try {
        console.log('🚀 Starting complete streaks data generation...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');

        // Get all fighters
        const allFighters = await Fighter.find({}).select('firstName lastName _id').lean();
        console.log(`📊 Processing streaks for ${allFighters.length} fighters`);

        // Get all competitions ordered by season (Seasons 1-3)
        const competitions = await Competition.find({
            'seasonMeta.seasonNumber': { $in: [1, 2, 3] }
        }).sort({ 'seasonMeta.seasonNumber': 1 });
        
        console.log(`📈 Processing ${competitions.length} seasons for complete streaks`);

        // Initialize fighter streak tracking for all fighters
        const fighterMap = new Map();
        
        allFighters.forEach(fighter => {
            fighterMap.set(fighter._id.toString(), {
                id: fighter._id,
                firstName: fighter.firstName,
                lastName: fighter.lastName,
                activeWinStreak: null,
                activeLoseStreak: null,
                streaks: []
            });
        });

        console.log(`📊 Initialized tracking for ${fighterMap.size} fighters`);

        // Process each competition chronologically
        for (const competition of competitions) {
            console.log(`\n📅 Processing Season ${competition.seasonMeta.seasonNumber}...`);
            
            const seasonNumber = competition.seasonMeta.seasonNumber;
            const competitionId = competition.competitionMetaId;

            // Process league data (divisions and rounds)
            if (competition.leagueData && competition.leagueData.divisions) {
                for (const division of competition.leagueData.divisions) {
                    console.log(`  📊 Processing Division ${division.divisionNumber}...`);
                    
                    // Sort rounds by round number to ensure chronological order
                    const sortedRounds = division.rounds.sort((a, b) => a.roundNumber - b.roundNumber);
                    
                    for (const round of sortedRounds) {
                        console.log(`    🔄 Processing Round ${round.roundNumber}...`);
                        
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
        }

        // Generate complete JSON output
        console.log('\n📄 Generating complete streaks JSON...');
        
        const completeData = {
            metadata: {
                timestamp: new Date().toISOString(),
                description: 'Complete streaks data generated from Seasons 1-3 fight data',
                totalFighters: fighterMap.size,
                seasonsProcessed: [1, 2, 3],
                purpose: 'Review before updating MongoDB with new streaks data',
                totalFightsProcessed: 135,
                dataSource: 'Competition collection fight data'
            },
            fighters: Array.from(fighterMap.values()).map(fighterData => ({
                _id: fighterData.id,
                firstName: fighterData.firstName,
                lastName: fighterData.lastName,
                streaks: fighterData.streaks.map(streak => ({
                    competitionId: streak.competitionId,
                    type: streak.type,
                    start: streak.start,
                    end: streak.end,
                    count: streak.count,
                    active: streak.active,
                    opponents: streak.opponents.map(opp => opp.toString())
                }))
            }))
        };

        // Write complete data to temporary file
        const backupDir = path.join(__dirname, '..', '..', 'backups');
        const tempPath = path.join(backupDir, 'complete-streaks-data-temp.json');
        
        fs.writeFileSync(tempPath, JSON.stringify(completeData, null, 2));
        
        // Get file size
        const stats = fs.statSync(tempPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log('✅ Complete streaks data generated successfully!');
        console.log(`📄 Temporary file: ${tempPath}`);
        console.log(`💾 File size: ${fileSizeInMB} MB`);
        
        // Display summary statistics
        console.log('\n📊 Complete Streaks Summary:');
        
        let fightersWithStreaks = 0;
        let totalWinStreaks = 0;
        let totalLoseStreaks = 0;
        let activeWinStreaks = 0;
        let activeLoseStreaks = 0;
        
        completeData.fighters.forEach(fighter => {
            if (fighter.streaks.length > 0) {
                fightersWithStreaks++;
                
                const winStreaks = fighter.streaks.filter(s => s.type === 'win');
                const loseStreaks = fighter.streaks.filter(s => s.type === 'lose');
                const activeStreaks = fighter.streaks.filter(s => s.active);
                
                totalWinStreaks += winStreaks.length;
                totalLoseStreaks += loseStreaks.length;
                
                activeStreaks.forEach(streak => {
                    if (streak.type === 'win') activeWinStreaks++;
                    else activeLoseStreaks++;
                });
            }
        });
        
        console.log(`  Total Fighters: ${completeData.fighters.length}`);
        console.log(`  Fighters with Streaks: ${fightersWithStreaks}`);
        console.log(`  Total Win Streaks: ${totalWinStreaks}`);
        console.log(`  Total Lose Streaks: ${totalLoseStreaks}`);
        console.log(`  Active Win Streaks: ${activeWinStreaks}`);
        console.log(`  Active Lose Streaks: ${activeLoseStreaks}`);
        
        // Show sample fighters with streaks
        console.log('\n🔍 Sample Fighters with Streaks:');
        const fightersWithStreaksData = completeData.fighters.filter(f => f.streaks.length > 0).slice(0, 5);
        
        fightersWithStreaksData.forEach(fighter => {
            console.log(`\n👤 ${fighter.firstName} ${fighter.lastName}:`);
            console.log(`   Total Streaks: ${fighter.streaks.length}`);
            
            const winStreaks = fighter.streaks.filter(s => s.type === 'win');
            const loseStreaks = fighter.streaks.filter(s => s.type === 'lose');
            const activeStreaks = fighter.streaks.filter(s => s.active);
            
            console.log(`   Win Streaks: ${winStreaks.length}`);
            console.log(`   Lose Streaks: ${loseStreaks.length}`);
            console.log(`   Active Streaks: ${activeStreaks.length}`);
            
            if (activeStreaks.length > 0) {
                activeStreaks.forEach(streak => {
                    console.log(`     Active ${streak.type} streak: ${streak.count} fights`);
                });
            }
        });

        console.log('\n📋 Next Steps:');
        console.log('1. Review the temporary file: backups/complete-streaks-data-temp.json');
        console.log('2. If satisfied, run the update script to apply to MongoDB');
        console.log('3. If not satisfied, modify the script and regenerate');

    } catch (error) {
        console.error('❌ Error generating complete streaks data:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

/**
 * Processes a single fight and updates streak data for both fighters
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

// Run if executed directly
const scriptPath = process.argv[1];
const currentModulePath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === currentModulePath) {
    generateCompleteStreaksData()
        .then(() => {
            console.log('🎉 Complete streaks generation completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Complete streaks generation failed:', error);
            process.exit(1);
        });
}

export { generateCompleteStreaksData };
