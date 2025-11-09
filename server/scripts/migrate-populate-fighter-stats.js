import mongoose from 'mongoose';
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.staging' });

/**
 * Migration script to populate fightStats for all fighters based on their completed fights
 */

async function populateFighterStats() {
    try {
        console.log('🚀 Starting Fighter Stats Population Migration...\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Get all competitions
        const competitions = await Competition.find({}).populate('competitionMetaId');
        
        // Build a map of fighter ID -> all their fight stats
        const fighterStatsMap = new Map();
        
        console.log('📊 Collecting fight data from all competitions...\n');
        
        for (const competition of competitions) {
            if (competition.leagueData?.divisions) {
                for (const division of competition.leagueData.divisions) {
                    if (division.rounds) {
                        for (const round of division.rounds) {
                            if (round.fights) {
                                for (const fight of round.fights) {
                                    if (fight.winner && fight.fighterStats) {
                                        // Process both fighters' stats
                                        for (const fighterStat of fight.fighterStats) {
                                            const fighterId = fighterStat.fighterId.toString();
                                            
                                            if (!fighterStatsMap.has(fighterId)) {
                                                fighterStatsMap.set(fighterId, []);
                                            }
                                            
                                            fighterStatsMap.get(fighterId).push(fighterStat.stats);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`Found ${fighterStatsMap.size} fighter(s) with completed fights\n`);
        
        // Now calculate aggregated stats for each fighter
        let updatedCount = 0;
        
        for (const [fighterId, allStats] of fighterStatsMap.entries()) {
            const fighter = await Fighter.findById(fighterId);
            
            if (!fighter) {
                console.warn(`⚠️  Fighter ${fighterId} not found, skipping...`);
                continue;
            }
            
            console.log(`\n${'='.repeat(80)}`);
            console.log(`👤 ${fighter.firstName} ${fighter.lastName}`);
            console.log(`${'='.repeat(80)}`);
            console.log(`   Total Fights: ${allStats.length}`);
            
            const fightsCount = allStats.length;
            
            // Helper to calculate average
            const avg = (values) => {
                const validValues = values.filter(v => v != null && !isNaN(v));
                if (validValues.length === 0) return 0;
                return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
            };
            
            // Collect finishing moves (only from wins where finishing move exists)
            const finishingMoves = [];
            allStats.forEach(stats => {
                if (stats.finishingMove && !finishingMoves.includes(stats.finishingMove)) {
                    finishingMoves.push(stats.finishingMove);
                }
            });
            
            console.log(`   Finishing Moves: ${finishingMoves.length > 0 ? finishingMoves.join(', ') : 'None (all losses)'}`);
            
            // Calculate averages for all stats
            fighter.fightStats = {
                fightsCount,
                avgFightTime: avg(allStats.map(s => s.fightTime)),
                finishingMoves,
                grappling: {
                    accuracy: avg(allStats.map(s => s.grappling?.accuracy)),
                    defence: avg(allStats.map(s => s.grappling?.defence))
                },
                significantStrikes: {
                    accuracy: avg(allStats.map(s => s.significantStrikes?.accuracy)),
                    attempted: avg(allStats.map(s => s.significantStrikes?.attempted)),
                    defence: avg(allStats.map(s => s.significantStrikes?.defence)),
                    landed: avg(allStats.map(s => s.significantStrikes?.landed)),
                    landedPerMinute: avg(allStats.map(s => s.significantStrikes?.landedPerMinute)),
                    positions: {
                        clinching: avg(allStats.map(s => s.significantStrikes?.positions?.clinching)),
                        ground: avg(allStats.map(s => s.significantStrikes?.positions?.ground)),
                        standing: avg(allStats.map(s => s.significantStrikes?.positions?.standing))
                    }
                },
                strikeMap: {
                    head: {
                        absorb: avg(allStats.map(s => s.strikeMap?.head?.absorb)),
                        strike: avg(allStats.map(s => s.strikeMap?.head?.strike))
                    },
                    torso: {
                        absorb: avg(allStats.map(s => s.strikeMap?.torso?.absorb)),
                        strike: avg(allStats.map(s => s.strikeMap?.torso?.strike))
                    },
                    leg: {
                        absorb: avg(allStats.map(s => s.strikeMap?.leg?.absorb)),
                        strike: avg(allStats.map(s => s.strikeMap?.leg?.strike))
                    }
                },
                submissions: {
                    attemptsPer15Mins: avg(allStats.map(s => s.submissions?.attemptsPer15Mins)),
                    average: avg(allStats.map(s => s.submissions?.average))
                },
                takedowns: {
                    accuracy: avg(allStats.map(s => s.takedowns?.accuracy)),
                    attempted: avg(allStats.map(s => s.takedowns?.attempted)),
                    avgTakedownsLandedPerMin: avg(allStats.map(s => s.takedowns?.avgTakedownsLandedPerMin)),
                    defence: avg(allStats.map(s => s.takedowns?.defence)),
                    landed: avg(allStats.map(s => s.takedowns?.landed))
                }
            };
            
            console.log(`   ✅ Calculated stats:`);
            console.log(`      - Avg Fight Time: ${fighter.fightStats.avgFightTime.toFixed(1)} minutes`);
            console.log(`      - Finishing Moves: ${fighter.fightStats.finishingMoves.length}`);
            console.log(`      - Significant Strikes Accuracy: ${fighter.fightStats.significantStrikes.accuracy.toFixed(1)}%`);
            
            await fighter.save();
            updatedCount++;
            console.log(`   💾 Saved fighter stats`);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log(`✅ Migration Complete!`);
        console.log(`   Updated ${updatedCount} fighter(s)`);
        console.log('='.repeat(80) + '\n');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB\n');
    }
}

populateFighterStats()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

