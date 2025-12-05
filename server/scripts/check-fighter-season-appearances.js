import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';

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
 * Check fighter season appearances
 */
async function checkFighterSeasonAppearances() {
  try {
    console.log('='.repeat(70));
    console.log('CHECKING FIGHTER SEASON APPEARANCES FOR IFL S1');
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
    const iflS1FighterIds = new Set();
    if (iflS1.seasonMeta.leagueDivisions) {
      iflS1.seasonMeta.leagueDivisions.forEach(div => {
        div.fighters.forEach(fId => {
          iflS1FighterIds.add(fId.toString());
        });
      });
    }

    console.log(`\nTotal fighters in IFL S1: ${iflS1FighterIds.size}`);

    // Check a few sample fighters
    const sampleFighterIds = Array.from(iflS1FighterIds).slice(0, 5);
    
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE FIGHTERS - SEASON APPEARANCES');
    console.log('='.repeat(70));

    for (const fighterId of sampleFighterIds) {
      const fighter = await Fighter.findById(fighterId);
      
      if (!fighter) {
        console.log(`\n❌ Fighter ${fighterId} not found`);
        continue;
      }

      console.log(`\n👤 ${fighter.name} (${fighter._id})`);
      console.log(`   seasonAppearances: ${fighter.seasonAppearances || 0}`);
      
      // Check competitionHistory
      if (fighter.competitionHistory && fighter.competitionHistory.length > 0) {
        console.log(`   competitionHistory entries: ${fighter.competitionHistory.length}`);
        
        fighter.competitionHistory.forEach((entry, idx) => {
          console.log(`      [${idx + 1}] Competition: ${entry.competitionId}, Season: ${entry.seasonNumber}`);
        });

        // Check for duplicates
        const historyMap = {};
        fighter.competitionHistory.forEach(entry => {
          const key = `${entry.competitionId}-${entry.seasonNumber}`;
          if (!historyMap[key]) {
            historyMap[key] = 0;
          }
          historyMap[key]++;
        });

        const duplicates = Object.entries(historyMap).filter(([key, count]) => count > 1);
        if (duplicates.length > 0) {
          console.log(`   ⚠️  DUPLICATES FOUND:`);
          duplicates.forEach(([key, count]) => {
            console.log(`      ${key}: appears ${count} times`);
          });
        }
      } else {
        console.log(`   competitionHistory: empty or not set`);
      }
    }

    // Check if there are fighters with seasonAppearances = 2
    console.log('\n' + '='.repeat(70));
    console.log('CHECKING ALL IFL S1 FIGHTERS FOR INCORRECT COUNTS');
    console.log('='.repeat(70));

    const fightersWithIssues = [];

    for (const fighterId of iflS1FighterIds) {
      const fighter = await Fighter.findById(fighterId);
      
      if (!fighter) continue;

      // Count actual unique season appearances
      const uniqueSeasons = new Set();
      if (fighter.competitionHistory) {
        fighter.competitionHistory.forEach(entry => {
          const key = `${entry.competitionId}-${entry.seasonNumber}`;
          uniqueSeasons.add(key);
        });
      }

      const actualCount = uniqueSeasons.size;
      const storedCount = fighter.seasonAppearances || 0;

      if (actualCount !== storedCount) {
        fightersWithIssues.push({
          name: fighter.name,
          id: fighter._id,
          storedCount,
          actualCount,
          historyLength: fighter.competitionHistory?.length || 0
        });
      }
    }

    if (fightersWithIssues.length > 0) {
      console.log(`\n⚠️  Found ${fightersWithIssues.length} fighters with incorrect seasonAppearances:\n`);
      fightersWithIssues.forEach(f => {
        console.log(`   ${f.name}`);
        console.log(`      Stored: ${f.storedCount}, Actual unique: ${f.actualCount}`);
        console.log(`      competitionHistory length: ${f.historyLength}`);
      });
    } else {
      console.log(`\n✅ All fighters have correct seasonAppearances count!`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('ROOT CAUSE ANALYSIS');
    console.log('='.repeat(70));

    if (fightersWithIssues.length > 0 && fightersWithIssues[0].storedCount === 2) {
      console.log('\n❌ ISSUE: seasonAppearances shows 2 instead of 1');
      console.log('\nPossible causes:');
      console.log('   1. Duplicate entries in competitionHistory');
      console.log('   2. seasonAppearances incremented twice during season creation');
      console.log('   3. Fighter was added to IFL S1 twice somehow');
      
      // Check the first fighter with issues
      const sample = fightersWithIssues[0];
      const fighter = await Fighter.findById(sample.id);
      
      if (fighter && fighter.competitionHistory) {
        console.log(`\n🔍 Detailed check for ${fighter.name}:`);
        console.log(`   competitionHistory:`);
        fighter.competitionHistory.forEach((entry, idx) => {
          console.log(`      [${idx}] ${entry.competitionId} - Season ${entry.seasonNumber}`);
        });
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();
    await checkFighterSeasonAppearances();
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

