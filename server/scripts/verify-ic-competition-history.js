/**
 * Verify Invicta Cup Competition History Updates
 * This script checks a few sample fighters to verify the IC competition history was updated correctly
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
const IC_COMPETITION_META_ID = '6778103309a4c4b25127f8fc'; // Invicta Cup

// Sample fighter IDs to check (from the update log)
const SAMPLE_FIGHTERS = [
  '676d6ecceb38b2b97c6da945', // Sayali Raut - 2 seasons, 6W-0L (Champion in 2 seasons)
  '676d72c5eb38b2b97c6da969', // Ishita Shah - 2 seasons, 5W-1L (Champion in 1)
  '676d75dfeb38b2b97c6da9a5', // Tanvi Shah - 2 seasons, 3W-1L (Champion in 1)
  '676d742deb38b2b97c6da97d'  // Kriti Kapoor - 3 seasons, 1W-3L
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
 * Verify IC competition history for sample fighters
 */
async function verifyICCompetitionHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING INVICTA CUP COMPETITION HISTORY');
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

      // Find IC competition history
      const icHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
      );

      if (!icHistory) {
        console.log(`  ⚠️  No IC competition history found\n`);
        continue;
      }

      console.log(`  📊 Overall Stats:`);
      console.log(`     - Seasons: ${icHistory.numberOfSeasonAppearances}`);
      console.log(`     - Total Fights: ${icHistory.totalFights}`);
      console.log(`     - Record: ${icHistory.totalWins}W-${icHistory.totalLosses}L`);
      console.log(`     - Win %: ${icHistory.winPercentage.toFixed(2)}%`);
      console.log(`     - Titles: ${icHistory.titles?.totalTitles || 0}`);

      if (icHistory.seasonDetails && icHistory.seasonDetails.length > 0) {
        console.log(`\n  📋 Season Details:`);
        icHistory.seasonDetails.forEach(season => {
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

    // Get summary of all IC fighters
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY OF ALL IC FIGHTERS');
    console.log('='.repeat(70));

    const allICFighters = await Fighter.find({
      'competitionHistory.competitionId': IC_COMPETITION_META_ID
    }).lean();

    console.log(`\nTotal fighters with IC history: ${allICFighters.length}\n`);

    // Count by number of seasons
    const seasonCounts = {};
    const championCounts = {};

    allICFighters.forEach(fighter => {
      const icHistory = fighter.competitionHistory.find(
        ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
      );
      
      if (icHistory) {
        const seasons = icHistory.numberOfSeasonAppearances;
        seasonCounts[seasons] = (seasonCounts[seasons] || 0) + 1;

        // Count champions
        const championSeasons = icHistory.seasonDetails?.filter(
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
      console.log('\nIC Champions:');
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
verifyICCompetitionHistory();

