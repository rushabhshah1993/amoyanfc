/**
 * Verify IC Streaks Updates
 * Checks that IC streaks were correctly calculated and added
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { Fighter } from '../models/fighter.model.js';

const IC_COMPETITION_META_ID = '6778103309a4c4b25127f8fc';

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

async function verifyICStreaks() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING IC STREAKS');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Check specific fighters with known records
    const sampleFighters = [
      { name: 'Sayali Raut', expected: '6W-0L' },      // Perfect record, should be 1 win streak
      { name: 'Ishita Shah', expected: '5W-1L' },      // Multiple streaks
      { name: 'Kriti Kapoor', expected: '1W-3L' },     // Multiple short streaks
      { name: 'Roopanshi Bhatt', expected: '0W-1L' }   // Single loss
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

      // Get IC streaks
      const icStreaks = fighter.streaks?.filter(
        s => s.competitionId?.toString() === IC_COMPETITION_META_ID
      ) || [];

      console.log(`IC Streaks: ${icStreaks.length}`);

      if (icStreaks.length > 0) {
        icStreaks.forEach((streak, idx) => {
          const status = streak.active ? '🔥 ACTIVE' : '⏹️  ENDED';
          console.log(`\n  Streak ${idx + 1}: ${status}`);
          console.log(`    Type: ${streak.type === 'win' ? '✅ WIN' : '❌ LOSE'}`);
          console.log(`    Count: ${streak.count} fight(s)`);
          console.log(`    Start: Season ${streak.start.season}, Round ${streak.start.round}`);
          console.log(`    End: Season ${streak.end?.season || streak.start.season}, Round ${streak.end?.round || streak.start.round}`);
          console.log(`    Opponents: ${streak.opponents?.length || 0}`);
        });
      } else {
        console.log('  ⚠️  No IC streaks found');
      }

      // Verify against competition history
      const icHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
      );

      if (icHistory) {
        console.log(`\n  Competition History: ${icHistory.totalWins}W-${icHistory.totalLosses}L`);
        
        // Count total fights in streaks
        const totalStreakFights = icStreaks.reduce((sum, s) => sum + s.count, 0);
        const match = totalStreakFights === icHistory.totalFights;
        console.log(`  ${match ? '✅' : '❌'} Streak fights match total: ${totalStreakFights} vs ${icHistory.totalFights}`);
      }
      
      console.log('');
    }

    // Overall statistics
    console.log('='.repeat(70));
    console.log('📊 OVERALL STATISTICS');
    console.log('='.repeat(70));

    const allFighters = await Fighter.find({
      'competitionHistory.competitionId': IC_COMPETITION_META_ID
    }).lean();

    console.log(`\nTotal IC fighters: ${allFighters.length}`);

    let fightersWithStreaks = 0;
    let totalStreaks = 0;
    let winStreaks = 0;
    let loseStreaks = 0;
    let activeStreaks = 0;
    let mismatchCount = 0;
    let longestWinStreak = 0;
    let longestLoseStreak = 0;

    allFighters.forEach(fighter => {
      const icStreaks = fighter.streaks?.filter(
        s => s.competitionId?.toString() === IC_COMPETITION_META_ID
      ) || [];

      if (icStreaks.length > 0) {
        fightersWithStreaks++;
        totalStreaks += icStreaks.length;

        icStreaks.forEach(streak => {
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
        const icHistory = fighter.competitionHistory?.find(
          ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
        );

        if (icHistory) {
          const totalStreakFights = icStreaks.reduce((sum, s) => sum + s.count, 0);
          if (totalStreakFights !== icHistory.totalFights) {
            mismatchCount++;
            console.log(`  ⚠️  Mismatch for ${fighter.firstName} ${fighter.lastName}: ${totalStreakFights} vs ${icHistory.totalFights}`);
          }
        }
      }
    });

    console.log(`Fighters with IC streaks: ${fightersWithStreaks}`);
    console.log(`Total IC streaks: ${totalStreaks}`);
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

verifyICStreaks();

