/**
 * Verify IC Opponent History Updates
 * Checks that IC opponent history was correctly added
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

async function verifyICOpponentHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING IC OPPONENT HISTORY');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Check a few sample fighters with different participation levels
    const sampleFighters = [
      'Sayali Raut',    // Champion with 2 titles (6 IC fights)
      'Ishita Shah',    // Champion with 1 title (6 IC fights)
      'Kriti Kapoor',   // 3 seasons (4 IC fights)
      'Roopanshi Bhatt' // 1 season (1 IC fight)
    ];
    
    console.log('\n📋 Checking Sample Fighters:\n');

    for (const name of sampleFighters) {
      const [firstName, lastName] = name.split(' ');
      const fighter = await Fighter.findOne({ firstName, lastName }).lean();
      
      if (!fighter) {
        console.log(`❌ ${name} not found\n`);
        continue;
      }

      console.log(`${'─'.repeat(70)}`);
      console.log(`👤 ${name}`);
      console.log(`${'─'.repeat(70)}`);

      // Count IC fights in opponent history
      let totalICOpponents = 0;
      let totalICFights = 0;

      if (fighter.opponentsHistory) {
        fighter.opponentsHistory.forEach(opponent => {
          const icFights = opponent.details?.filter(
            d => d.competitionId.toString() === IC_COMPETITION_META_ID
          ) || [];
          
          if (icFights.length > 0) {
            totalICOpponents++;
            totalICFights += icFights.length;
          }
        });
      }

      console.log(`IC Opponents: ${totalICOpponents}`);
      console.log(`IC Fights recorded: ${totalICFights}`);

      // Get IC competition history for comparison
      const icHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
      );

      if (icHistory) {
        console.log(`IC Fights (from competitionHistory): ${icHistory.totalFights}`);
        const match = totalICFights === icHistory.totalFights;
        console.log(`${match ? '✅' : '❌'} Opponent history matches competition history: ${match ? 'YES' : 'NO'}`);
      }

      // Show some opponent details
      if (fighter.opponentsHistory) {
        const icOpponents = fighter.opponentsHistory.filter(opponent => {
          return opponent.details?.some(
            d => d.competitionId.toString() === IC_COMPETITION_META_ID
          );
        });

        if (icOpponents.length > 0) {
          console.log(`\nSample IC Opponents:`);
          icOpponents.slice(0, 3).forEach(opponent => {
            const icFights = opponent.details.filter(
              d => d.competitionId.toString() === IC_COMPETITION_META_ID
            );
            console.log(`  - Opponent ${opponent.opponentId}: ${icFights.length} IC fight(s)`);
            icFights.forEach(fight => {
              console.log(`    Season ${fight.season}, Round ${fight.roundId}, ${fight.isWinner ? 'Won' : 'Lost'}`);
            });
          });
        }
      }
      
      console.log('');
    }

    // Get overall statistics
    console.log('='.repeat(70));
    console.log('📊 OVERALL STATISTICS');
    console.log('='.repeat(70));

    const allFighters = await Fighter.find({
      'competitionHistory.competitionId': IC_COMPETITION_META_ID
    }).lean();

    console.log(`\nTotal IC fighters: ${allFighters.length}`);

    let fightersWithICOpponentHistory = 0;
    let totalICFightRecords = 0;
    let mismatchCount = 0;

    allFighters.forEach(fighter => {
      const icHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
      );

      if (!icHistory) return;

      let fighterICFights = 0;
      if (fighter.opponentsHistory) {
        fighter.opponentsHistory.forEach(opponent => {
          const icFights = opponent.details?.filter(
            d => d.competitionId.toString() === IC_COMPETITION_META_ID
          ) || [];
          fighterICFights += icFights.length;
        });
      }

      if (fighterICFights > 0) {
        fightersWithICOpponentHistory++;
        totalICFightRecords += fighterICFights;
      }

      if (fighterICFights !== icHistory.totalFights) {
        mismatchCount++;
        console.log(`  ⚠️  Mismatch for ${fighter.firstName} ${fighter.lastName}: ${fighterICFights} vs ${icHistory.totalFights}`);
      }
    });

    console.log(`Fighters with IC opponent history: ${fightersWithICOpponentHistory}`);
    console.log(`Total IC fight records: ${totalICFightRecords}`);
    console.log(`${mismatchCount === 0 ? '✅' : '❌'} Data consistency: ${mismatchCount === 0 ? 'PERFECT' : `${mismatchCount} mismatches`}`);

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

verifyICOpponentHistory();

