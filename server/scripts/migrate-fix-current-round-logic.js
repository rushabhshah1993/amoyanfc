import mongoose from 'mongoose';
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.staging' });

/**
 * Migration script to fix currentRound logic
 * 
 * New logic:
 * - currentRound represents "next round to play"
 * - Only increment when ALL fights in a round are complete
 * - If final round is complete, keep currentRound at totalRounds
 */

async function fixCurrentRoundLogic() {
    try {
        console.log('🚀 Starting currentRound Logic Migration...\n');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Find all active competitions with league data
        const leagueCompetitions = await Competition.find({
            isActive: true,
            'leagueData.divisions': { $exists: true, $ne: [] }
        }).populate('competitionMetaId');
        
        console.log(`📊 Found ${leagueCompetitions.length} active league competition(s)\n`);
        
        for (const competition of leagueCompetitions) {
            const competitionName = competition.competitionMetaId?.name || 'Unknown';
            const seasonNumber = competition.seasonMeta?.seasonNumber || 0;
            
            console.log(`\n${'='.repeat(80)}`);
            console.log(`📋 Processing: ${competitionName} - Season ${seasonNumber}`);
            console.log(`${'='.repeat(80)}\n`);
            
            if (!competition.leagueData?.divisions) {
                console.log('   ⚠️  No divisions found, skipping...\n');
                continue;
            }
            
            let needsSave = false;
            
            for (const division of competition.leagueData.divisions) {
                console.log(`\n   🔍 Division ${division.divisionNumber} (${division.divisionName})`);
                console.log(`      Total Rounds: ${division.totalRounds}`);
                console.log(`      Current Round (OLD): ${division.currentRound || 0}`);
                
                if (!division.rounds || division.rounds.length === 0) {
                    console.log('      ⚠️  No rounds found, setting currentRound to 1');
                    division.currentRound = 1;
                    needsSave = true;
                    continue;
                }
                
                // Find the highest round where ALL fights are complete
                let highestCompleteRound = 0;
                
                for (const round of division.rounds) {
                    const totalFights = round.fights?.length || 0;
                    const completedFights = round.fights?.filter(f => f.winner).length || 0;
                    
                    console.log(`      Round ${round.roundNumber}: ${completedFights}/${totalFights} fights complete`);
                    
                    if (totalFights > 0 && completedFights === totalFights) {
                        highestCompleteRound = round.roundNumber;
                    }
                }
                
                // Calculate new currentRound
                let newCurrentRound;
                if (highestCompleteRound === 0) {
                    // No rounds complete - currently on Round 1
                    newCurrentRound = 1;
                } else if (highestCompleteRound >= division.totalRounds) {
                    // All rounds complete
                    newCurrentRound = division.totalRounds;
                } else {
                    // Move to next round
                    newCurrentRound = highestCompleteRound + 1;
                }
                
                const oldCurrentRound = division.currentRound || 0;
                
                if (newCurrentRound !== oldCurrentRound) {
                    console.log(`      ✅ Updating currentRound: ${oldCurrentRound} → ${newCurrentRound}`);
                    division.currentRound = newCurrentRound;
                    needsSave = true;
                } else {
                    console.log(`      ℹ️  currentRound unchanged: ${oldCurrentRound}`);
                }
            }
            
            if (needsSave) {
                await competition.save();
                console.log(`\n   💾 Saved changes to ${competitionName} - Season ${seasonNumber}`);
            } else {
                console.log(`\n   ℹ️  No changes needed for ${competitionName} - Season ${seasonNumber}`);
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Migration Complete!');
        console.log('='.repeat(80) + '\n');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB\n');
    }
}

// Run the migration
fixCurrentRoundLogic()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

