/**
 * Verify CC Opponent History Updates
 * Checks that CC opponent history was correctly added
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

async function verifyCCOpponentHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING CC OPPONENT HISTORY');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Check a few sample fighters with different participation levels
    const sampleFighters = [
      'Unnati Vora',    // Champion with 5 titles (15 CC fights)
      'Sayali Raut',    // 2 seasons (6 CC fights)
      'Mahima Thakur',  // 3 seasons (5 CC fights)
      'Anika Beri'      // 1 season (1 CC fight)
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

      // Count CC fights in opponent history
      let totalCCOpponents = 0;
      let totalCCFights = 0;

      if (fighter.opponentsHistory) {
        fighter.opponentsHistory.forEach(opponent => {
          const ccFights = opponent.details?.filter(
            d => d.competitionId.toString() === CC_COMPETITION_META_ID
          ) || [];
          
          if (ccFights.length > 0) {
            totalCCOpponents++;
            totalCCFights += ccFights.length;
          }
        });
      }

      console.log(`CC Opponents: ${totalCCOpponents}`);
      console.log(`CC Fights recorded: ${totalCCFights}`);

      // Get CC competition history for comparison
      const ccHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === CC_COMPETITION_META_ID
      );

      if (ccHistory) {
        console.log(`CC Fights (from competitionHistory): ${ccHistory.totalFights}`);
        const match = totalCCFights === ccHistory.totalFights;
        console.log(`${match ? '✅' : '❌'} Opponent history matches competition history: ${match ? 'YES' : 'NO'}`);
      }

      console.log('');
    }

    // Overall statistics
    console.log('='.repeat(70));
    console.log('📊 OVERALL STATISTICS');
    console.log('='.repeat(70));

    const allCCFighters = await Fighter.find({
      'competitionHistory.competitionId': CC_COMPETITION_META_ID
    }).lean();

    console.log(`\nTotal fighters with CC participation: ${allCCFighters.length}`);

    let totalOpponentRecords = 0;
    allCCFighters.forEach(fighter => {
      if (fighter.opponentsHistory) {
        const ccOpponentRecords = fighter.opponentsHistory.filter(opponent => {
          return opponent.details?.some(
            d => d.competitionId.toString() === CC_COMPETITION_META_ID
          );
        });
        totalOpponentRecords += ccOpponentRecords.length;
      }
    });

    console.log(`Total CC opponent records: ${totalOpponentRecords}`);
    console.log(`Expected: ~70 records (35 fights × 2 sides)`);
    
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

verifyCCOpponentHistory();

