/**
 * Verify CC Streaks Updates
 * Checks that CC streaks were correctly calculated and added
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { Fighter } from '../models/fighter.model.js';

const CC_COMPETITION_META_ID = '6778100309a4c4b25127f8fa';

async function connectDB() {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log(`✅ Connected to MongoDB`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

async function verifyCCStreaks() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING CC STREAKS');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Check specific fighters with known records
    const sampleFighters = [
      { name: 'Unnati Vora', expected: '15W-0L' },      // Perfect record, should be 1 win streak
      { name: 'Sayali Raut', expected: '4W-2L' },       // Multiple streaks
      { name: 'Mahima Thakur', expected: '2W-3L' },     // Multiple short streaks
      { name: 'Anika Beri', expected: '0W-1L' }         // Single loss
    ];
    
    console.log('\n📋 Sample Fighter Verification:\n');

    for (const { name, expected } of sampleFighters) {
      const [firstName, lastName] = name.split(' ');
      const fighter = await Fighter.findOne({ firstName, lastName }).lean();
      
      if (!fighter) {
        console.log(`❌ ${name} not found\n`);
        continue;
      }

      console.log(`${'─'.repeat(70)}`);
      console.log(`👤 ${name} (${expected})`);
      console.log(`${'─'.repeat(70)}`);

      // Get CC streaks
      const ccStreaks = fighter.streaks?.filter(
        s => s.competitionId?.toString() === CC_COMPETITION_META_ID
      ) || [];

      console.log(`CC Streaks: ${ccStreaks.length}`);

      if (ccStreaks.length > 0) {
        ccStreaks.forEach((streak, idx) => {
          const status = streak.active ? '🔥 ACTIVE' : '⏹️  ENDED';
          console.log(`\n  Streak ${idx + 1}: ${status}`);
          console.log(`    Type: ${streak.type === 'win' ? '✅ WIN' : '❌ LOSE'}`);
          console.log(`    Count: ${streak.count} fight(s)`);
          console.log(`    Start: Season ${streak.start.season}, Round ${streak.start.round}`);
          console.log(`    End: Season ${streak.end?.season || streak.start.season}, Round ${streak.end?.round || streak.start.round}`);
          console.log(`    Opponents: ${streak.opponents?.length || 0}`);
        });
      } else {
        console.log('  ⚠️  No CC streaks found');
      }

      // Verify against competition history
      const ccHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === CC_COMPETITION_META_ID
      );

      if (ccHistory) {
        console.log(`\n  Competition History: ${ccHistory.totalWins}W-${ccHistory.totalLosses}L`);
        
        // Count total fights in streaks
        const totalStreakFights = ccStreaks.reduce((sum, s) => sum + s.count, 0);
        const match = totalStreakFights === ccHistory.totalFights;
        console.log(`  ${match ? '✅' : '❌'} Streak fights match total: ${totalStreakFights} vs ${ccHistory.totalFights}`);
      }
      
      console.log('');
    }

    // Overall statistics
    console.log('='.repeat(70));
    console.log('📊 OVERALL STATISTICS');
    console.log('='.repeat(70));

    const allFighters = await Fighter.find({
      'competitionHistory.competitionId': CC_COMPETITION_META_ID
    }).lean();

    console.log(`\nTotal CC fighters: ${allFighters.length}`);

    let fightersWithStreaks = 0;
    let totalStreaks = 0;
    let winStreaks = 0;
    let loseStreaks = 0;
    let activeStreaks = 0;
    let mismatchCount = 0;
    let longestWinStreak = 0;
    let longestLoseStreak = 0;

    allFighters.forEach(fighter => {
      const ccStreaks = fighter.streaks?.filter(
        s => s.competitionId?.toString() === CC_COMPETITION_META_ID
      ) || [];

      if (ccStreaks.length > 0) {
        fightersWithStreaks++;
        totalStreaks += ccStreaks.length;

        ccStreaks.forEach(streak => {
          if (streak.type === 'win') {
            winStreaks++;
            longestWinStreak = Math.max(longestWinStreak, streak.count);
          } else {
            loseStreaks++;
            longestLoseStreak = Math.max(longestLoseStreak, streak.count);
          }
          if (streak.active) activeStreaks++;
        });

        // Verify total fights in streaks match competition history
        const ccHistory = fighter.competitionHistory?.find(
          ch => ch.competitionId?.toString() === CC_COMPETITION_META_ID
        );

        if (ccHistory) {
          const totalStreakFights = ccStreaks.reduce((sum, s) => sum + s.count, 0);
          if (totalStreakFights !== ccHistory.totalFights) {
            mismatchCount++;
            console.log(`  ⚠️  Mismatch for ${fighter.firstName} ${fighter.lastName}: ${totalStreakFights} vs ${ccHistory.totalFights}`);
          }
        }
      }
    });

    console.log(`Fighters with CC streaks: ${fightersWithStreaks}`);
    console.log(`Total CC streaks: ${totalStreaks}`);
    console.log(`  - Win streaks: ${winStreaks}`);
    console.log(`  - Lose streaks: ${loseStreaks}`);
    console.log(`  - Active streaks: ${activeStreaks}`);
    console.log(`\nLongest win streak: ${longestWinStreak} fight(s)`);
    console.log(`Longest lose streak: ${longestLoseStreak} fight(s)`);
    console.log(`\n${mismatchCount === 0 ? '✅' : '❌'} Data consistency: ${mismatchCount === 0 ? 'PERFECT' : `${mismatchCount} mismatches`}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

verifyCCStreaks();

