import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';

/**
 * Connect to Production MongoDB (gql-db)
 */
async function connectDB() {
  try {
    const baseUri = process.env.MONGODB_URI || '';
    const productionUri = baseUri.replace(/\/[^/?]+\?/, '/gql-db?');
    
    const connection = await mongoose.connect(productionUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(`✅ Connected to: ${connection.connection.db.databaseName}\n`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Fix IFL S1 fighters' numberOfSeasonAppearances
 */
async function fixIFLS1SeasonAppearances() {
  try {
    console.log('='.repeat(70));
    console.log('FIX IFL S1 - numberOfSeasonAppearances');
    console.log('='.repeat(70));

    // Find IFL Meta
    const iflMeta = await CompetitionMeta.findOne({ shortName: 'IFL' });
    if (!iflMeta) {
      console.log('❌ IFL Meta not found');
      return;
    }

    // Find IFL S1
    const iflS1 = await Competition.findOne({
      competitionMetaId: iflMeta._id,
      'seasonMeta.seasonNumber': 1
    });

    if (!iflS1) {
      console.log('❌ IFL S1 not found');
      return;
    }

    console.log(`\n✅ IFL Meta ID: ${iflMeta._id}`);
    console.log(`✅ IFL S1 ID: ${iflS1._id}`);

    // Get all fighter IDs from IFL S1
    const iflS1FighterIds = [];
    if (iflS1.seasonMeta.leagueDivisions) {
      iflS1.seasonMeta.leagueDivisions.forEach(div => {
        div.fighters.forEach(fId => {
          iflS1FighterIds.push(fId.toString());
        });
      });
    }

    console.log(`\n📊 Total fighters in IFL S1: ${iflS1FighterIds.length}`);

    // Check and fix each fighter
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let noHistoryCount = 0;

    console.log('\n🔧 Processing fighters...\n');

    for (const fighterId of iflS1FighterIds) {
      const fighter = await Fighter.findById(fighterId);
      
      if (!fighter) {
        console.log(`❌ Fighter ${fighterId} not found`);
        continue;
      }

      // Find IFL competition history
      const iflHistoryIndex = fighter.competitionHistory?.findIndex(
        h => h.competitionId?.toString() === iflMeta._id.toString()
      );

      if (iflHistoryIndex === undefined || iflHistoryIndex === -1) {
        console.log(`⚠️  ${fighter.firstName} ${fighter.lastName}: No IFL history`);
        noHistoryCount++;
        continue;
      }

      const iflHistory = fighter.competitionHistory[iflHistoryIndex];
      const currentValue = iflHistory.numberOfSeasonAppearances || 0;
      const seasonDetailsCount = iflHistory.seasonDetails?.length || 0;

      // Check if it needs fixing
      if (currentValue === 2 && seasonDetailsCount === 1) {
        // Fix: Set to 1
        fighter.competitionHistory[iflHistoryIndex].numberOfSeasonAppearances = 1;
        await fighter.save();
        
        console.log(`✅ ${fighter.firstName} ${fighter.lastName}: Fixed ${currentValue} → 1`);
        fixedCount++;
      } else if (currentValue === 1 && seasonDetailsCount === 1) {
        console.log(`✓  ${fighter.firstName} ${fighter.lastName}: Already correct (1)`);
        alreadyCorrectCount++;
      } else {
        console.log(`⚠️  ${fighter.firstName} ${fighter.lastName}: Unexpected state (${currentValue} appearances, ${seasonDetailsCount} seasons)`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('FIX SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Fixed: ${fixedCount} fighters (2 → 1)`);
    console.log(`✓  Already Correct: ${alreadyCorrectCount} fighters`);
    console.log(`⚠️  No IFL History: ${noHistoryCount} fighters`);
    console.log(`📊 Total Processed: ${iflS1FighterIds.length} fighters`);

    if (fixedCount > 0) {
      console.log('\n🎉 SUCCESS: Season appearances corrected!');
      console.log('   Fighter pages should now show "Season Appearances: 1"');
    } else if (alreadyCorrectCount === iflS1FighterIds.length - noHistoryCount) {
      console.log('\n✅ All fighters already have correct values!');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error during fix:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();
    await fixIFLS1SeasonAppearances();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

main();

