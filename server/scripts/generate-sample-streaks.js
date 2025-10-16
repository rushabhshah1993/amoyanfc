import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';

// Load environment variables
dotenv.config();

/**
 * Generates sample streaks data for a few fighters to review before full update
 */
async function generateSampleStreaks() {
    try {
        console.log('🚀 Starting sample streaks generation...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');

        // Get fighters who actually participated in Seasons 1-3
        const seasons123 = await Competition.find({
            'seasonMeta.seasonNumber': { $in: [1, 2, 3] }
        });
        
        const activeFighterIds = new Set();
        seasons123.forEach(season => {
            if (season.leagueData && season.leagueData.divisions) {
                season.leagueData.divisions.forEach(div => {
                    if (div.rounds) {
                        div.rounds.forEach(round => {
                            if (round.fights) {
                                round.fights.forEach(fight => {
                                    if (fight && fight.fighter1 && fight.fighter2) {
                                        activeFighterIds.add(fight.fighter1.toString());
                                        activeFighterIds.add(fight.fighter2.toString());
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
        
        const sampleFighters = await Fighter.find({
            _id: { $in: Array.from(activeFighterIds) }
        }).limit(3).select('firstName lastName _id').lean();
        console.log(`📊 Generating sample streaks for ${sampleFighters.length} fighters:`);
        sampleFighters.forEach(fighter => {
            console.log(`  - ${fighter.firstName} ${fighter.lastName} (${fighter._id})`);
        });

        // Get all competitions ordered by season (Seasons 1-3)
        const competitions = await Competition.find({
            'seasonMeta.seasonNumber': { $in: [1, 2, 3] }
        }).sort({ 'seasonMeta.seasonNumber': 1 });
        
        console.log(`📈 Processing ${competitions.length} seasons for sample`);

        // Initialize fighter streak tracking for sample fighters only
        const fighterMap = new Map();
        const sampleFighterIds = sampleFighters.map(f => f._id.toString());
        
        sampleFighters.forEach(fighter => {
            fighterMap.set(fighter._id.toString(), {
                id: fighter._id,
                firstName: fighter.firstName,
                lastName: fighter.lastName,
                activeWinStreak: null,
                activeLoseStreak: null,
                streaks: []
            });
        });

        console.log(`📊 Initialized tracking for ${fighterMap.size} sample fighters`);

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
                            // Only process fights involving our sample fighters
                            const fighter1Id = fight.fighter1?.toString();
                            const fighter2Id = fight.fighter2?.toString();
                            
                            if (fight && fight.winner && 
                                (sampleFighterIds.includes(fighter1Id) || sampleFighterIds.includes(fighter2Id))) {
                                
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

        // Generate sample JSON output
        console.log('\n📄 Generating sample streaks JSON...');
        
        const sampleData = {
            metadata: {
                timestamp: new Date().toISOString(),
                description: 'Sample streaks data generated from Seasons 1-3 fight data',
                totalSampleFighters: fighterMap.size,
                seasonsProcessed: [1, 2, 3],
                purpose: 'Review before full streaks update'
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

        // Write sample to file
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        const backupDir = path.join(__dirname, '..', '..', 'backups');
        const samplePath = path.join(backupDir, 'sample-streaks-data.json');
        
        fs.writeFileSync(samplePath, JSON.stringify(sampleData, null, 2));
        
        console.log('✅ Sample streaks data generated successfully!');
        console.log(`📄 Sample file: ${samplePath}`);
        
        // Display summary
        console.log('\n📊 Sample Streaks Summary:');
        sampleData.fighters.forEach(fighter => {
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

    } catch (error) {
        console.error('❌ Error generating sample streaks:', error);
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
        return; // Skip if not in our sample
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
import { fileURLToPath } from 'url';
const scriptPath = process.argv[1];
const currentModulePath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === currentModulePath) {
    generateSampleStreaks()
        .then(() => {
            console.log('🎉 Sample generation completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Sample generation failed:', error);
            process.exit(1);
        });
}

export { generateSampleStreaks };
