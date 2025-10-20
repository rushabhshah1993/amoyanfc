/**
 * Verify Champions Cup Competition History Updates
 * This script checks a few sample fighters to verify the CC competition history was updated correctly
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const CC_COMPETITION_META_ID = '6778100309a4c4b25127f8fa'; // Champions Cup

// Sample fighter IDs to check (from the update log)
const SAMPLE_FIGHTERS = [
  '676d7613eb38b2b97c6da9a9', // Unnati Vora - 5 seasons, 15W-0L (Champion in 5 seasons)
  '676d6ecceb38b2b97c6da945', // Sayali Raut - 2 seasons, 4W-2L
  '676d70faeb38b2b97c6da959', // Mahima Thakur - 3 seasons, 2W-3L
  '676d7276eb38b2b97c6da96d'  // Hetal Boricha - 3 seasons, 2W-3L
];

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log(`✅ Connected to MongoDB at ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Verify CC competition history for sample fighters
 */
async function verifyCCCompetitionHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING CHAMPIONS CUP COMPETITION HISTORY');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    console.log(`\n📋 Checking ${SAMPLE_FIGHTERS.length} sample fighters...\n`);

    for (const fighterId of SAMPLE_FIGHTERS) {
      const fighter = await Fighter.findById(fighterId).lean();
      
      if (!fighter) {
        console.log(`❌ Fighter ${fighterId} not found\n`);
        continue;
      }

      const fighterName = `${fighter.firstName} ${fighter.lastName}`;
      console.log(`${'─'.repeat(70)}`);
      console.log(`👤 ${fighterName}`);
      console.log(`${'─'.repeat(70)}`);

      // Find CC competition history
      const ccHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === CC_COMPETITION_META_ID
      );

      if (!ccHistory) {
        console.log(`  ⚠️  No CC competition history found\n`);
        continue;
      }

      console.log(`  📊 Overall Stats:`);
      console.log(`     - Seasons: ${ccHistory.numberOfSeasonAppearances}`);
      console.log(`     - Total Fights: ${ccHistory.totalFights}`);
      console.log(`     - Record: ${ccHistory.totalWins}W-${ccHistory.totalLosses}L`);
      console.log(`     - Win %: ${ccHistory.winPercentage.toFixed(2)}%`);
      console.log(`     - Titles: ${ccHistory.titles?.totalTitles || 0}`);

      if (ccHistory.seasonDetails && ccHistory.seasonDetails.length > 0) {
        console.log(`\n  📋 Season Details:`);
        ccHistory.seasonDetails.forEach(season => {
          console.log(`     Season ${season.seasonNumber}:`);
          console.log(`       - Division: ${season.divisionNumber === null ? 'N/A (Cup)' : season.divisionNumber}`);
          console.log(`       - Fights: ${season.fights}`);
          console.log(`       - Record: ${season.wins}W-${season.losses}L`);
          console.log(`       - Win %: ${season.winPercentage.toFixed(2)}%`);
          console.log(`       - Points: ${season.points === null ? 'N/A (Cup)' : season.points}`);
          console.log(`       - Final Position: ${season.finalPosition || 'N/A'}`);
          console.log(`       - Final Cup Position: ${season.finalCupPosition || 'N/A'}`);
        });
      }

      console.log('');
    }

    // Get summary of all CC fighters
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY OF ALL CC FIGHTERS');
    console.log('='.repeat(70));

    const allCCFighters = await Fighter.find({
      'competitionHistory.competitionId': CC_COMPETITION_META_ID
    }).lean();

    console.log(`\nTotal fighters with CC history: ${allCCFighters.length}\n`);

    // Count by number of seasons
    const seasonCounts = {};
    const championCounts = {};

    allCCFighters.forEach(fighter => {
      const ccHistory = fighter.competitionHistory.find(
        ch => ch.competitionId?.toString() === CC_COMPETITION_META_ID
      );
      
      if (ccHistory) {
        const seasons = ccHistory.numberOfSeasonAppearances;
        seasonCounts[seasons] = (seasonCounts[seasons] || 0) + 1;

        // Count champions
        const championSeasons = ccHistory.seasonDetails?.filter(
          s => s.finalCupPosition === 'Champion'
        ).length || 0;
        
        if (championSeasons > 0) {
          const fighterName = `${fighter.firstName} ${fighter.lastName}`;
          championCounts[fighterName] = championSeasons;
        }
      }
    });

    console.log('Fighters by Season Appearances:');
    Object.keys(seasonCounts).sort().forEach(seasons => {
      console.log(`  - ${seasons} season(s): ${seasonCounts[seasons]} fighter(s)`);
    });

    if (Object.keys(championCounts).length > 0) {
      console.log('\nCC Champions:');
      Object.entries(championCounts).sort((a, b) => b[1] - a[1]).forEach(([name, titles]) => {
        console.log(`  - ${name}: ${titles} title(s)`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the verification
verifyCCCompetitionHistory();

