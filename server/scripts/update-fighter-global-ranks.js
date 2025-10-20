/**
 * Update Fighter Global Ranks
 * Updates each fighter's globalRank field with their current global ranking data
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';
import { GlobalRank } from '../models/global-rank.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Update all fighters with their global rank
 */
async function updateFighterGlobalRanks() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 UPDATING FIGHTER GLOBAL RANKS');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Fetch current global rank
    console.log('\n📥 Fetching current global rankings...');
    const globalRank = await GlobalRank.findOne({ isCurrent: true }).lean();

    if (!globalRank) {
      console.log('\n⚠️  No current global rankings found in database.');
      console.log('   Please run calculate-global-rankings.js first.');
      return;
    }

    console.log(`✅ Found global rankings (ID: ${globalRank._id})`);
    console.log(`   Total fighters in rankings: ${globalRank.fighters.length}`);

    // Create a map of fighterId to rank data
    const rankMap = new Map(
      globalRank.fighters.map(rf => [
        rf.fighterId.toString(),
        {
          rank: rf.rank,
          score: rf.score,
          globalRankId: globalRank._id
        }
      ])
    );

    console.log('\n🔄 Updating fighters...');
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Update each fighter
    for (const [fighterId, rankData] of rankMap.entries()) {
      try {
        // Fetch fighter
        const fighter = await Fighter.findById(fighterId);
        
        if (!fighter) {
          skippedCount++;
          console.log(`   ⚠️  Fighter ${fighterId} not found, skipping...`);
          continue;
        }

        // Update globalRank field
        fighter.globalRank = {
          rank: rankData.rank,
          score: rankData.score,
          globalRankId: rankData.globalRankId
        };

        await fighter.save();
        updatedCount++;

        // Log progress every 10 fighters
        if (updatedCount % 10 === 0) {
          console.log(`   ✓ Updated ${updatedCount} fighters...`);
        }

      } catch (error) {
        errors.push({
          fighterId,
          error: error.message
        });
        console.log(`   ❌ Error updating fighter ${fighterId}: ${error.message}`);
      }
    }

    console.log('\n📊 UPDATE SUMMARY:');
    console.log('='.repeat(70));
    console.log(`✅ Successfully updated: ${updatedCount} fighters`);
    console.log(`⚠️  Skipped: ${skippedCount} fighters`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(({ fighterId, error }) => {
        console.log(`   - Fighter ${fighterId}: ${error}`);
      });
    }

    // Verify a few fighters
    console.log('\n🔍 VERIFICATION - Top 5 Fighters:');
    console.log('='.repeat(70));
    
    const topFighters = globalRank.fighters.slice(0, 5);
    for (const rf of topFighters) {
      const fighter = await Fighter.findById(rf.fighterId).lean();
      if (fighter) {
        console.log(`${rf.rank}. ${fighter.firstName} ${fighter.lastName}`);
        console.log(`   Global Rank: ${JSON.stringify(fighter.globalRank, null, 2)}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ FIGHTER GLOBAL RANKS UPDATE COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n❌ Update failed:', error);
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

// Run the update
updateFighterGlobalRanks();

