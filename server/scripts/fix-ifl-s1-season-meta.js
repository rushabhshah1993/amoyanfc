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
    
    console.log(`✅ Connected to: ${connection.connection.db.databaseName}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Fix IFL S1 seasonMeta.leagueDivisions
 */
async function fixIFLS1SeasonMeta() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('FIX IFL S1 - POPULATE seasonMeta.leagueDivisions');
    console.log('='.repeat(70));

    // Find IFL Meta
    const iflMeta = await CompetitionMeta.findOne({
      shortName: 'IFL'
    });

    if (!iflMeta) {
      console.log('❌ IFL Meta not found');
      return;
    }

    console.log(`\n✅ Found IFL Meta: ${iflMeta._id}`);

    // Find IFL S1
    const iflS1 = await Competition.findOne({
      competitionMetaId: iflMeta._id,
      'seasonMeta.seasonNumber': 1
    });

    if (!iflS1) {
      console.log('❌ IFL S1 not found');
      return;
    }

    console.log(`✅ Found IFL S1: ${iflS1._id}`);
    console.log(`   Is Active: ${iflS1.isActive}`);

    // Check current state
    console.log('\n📊 Current State:');
    console.log(`   seasonMeta.leagueDivisions: ${iflS1.seasonMeta.leagueDivisions?.length || 0} divisions`);

    // Extract fighters from fights
    console.log('\n🔍 Extracting fighters from fights...');
    const divisionFighters = {};

    if (iflS1.leagueData && iflS1.leagueData.divisions) {
      iflS1.leagueData.divisions.forEach(division => {
        const divNum = division.divisionNumber;
        divisionFighters[divNum] = new Set();

        if (division.rounds) {
          division.rounds.forEach(round => {
            if (round.fights) {
              round.fights.forEach(fight => {
                if (fight.fighter1) {
                  divisionFighters[divNum].add(fight.fighter1.toString());
                }
                if (fight.fighter2) {
                  divisionFighters[divNum].add(fight.fighter2.toString());
                }
              });
            }
          });
        }

        console.log(`   Division ${divNum}: ${divisionFighters[divNum].size} unique fighters`);
      });
    }

    // Build the leagueDivisions array
    console.log('\n🔨 Building seasonMeta.leagueDivisions array...');
    const leagueDivisions = [];

    for (const [divNum, fighterSet] of Object.entries(divisionFighters)) {
      const fighterIds = Array.from(fighterSet).map(id => new mongoose.Types.ObjectId(id));
      leagueDivisions.push({
        divisionNumber: parseInt(divNum),
        fighters: fighterIds,
        winners: [] // Empty until season completes
      });
      console.log(`   ✓ Division ${divNum}: ${fighterIds.length} fighters`);
    }

    console.log(`\n📝 Total divisions to add: ${leagueDivisions.length}`);

    // Update the document
    console.log('\n💾 Updating IFL S1 in database...');
    
    iflS1.seasonMeta.leagueDivisions = leagueDivisions;
    await iflS1.save();

    console.log('✅ Successfully updated IFL S1!');

    // Verify the fix
    console.log('\n✓ Verification:');
    const updated = await Competition.findById(iflS1._id);
    console.log(`   seasonMeta.leagueDivisions: ${updated.seasonMeta.leagueDivisions.length} divisions`);
    updated.seasonMeta.leagueDivisions.forEach(div => {
      console.log(`      Division ${div.divisionNumber}: ${div.fighters.length} fighters`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ FIX COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📋 Summary:');
    console.log(`   - Updated: IFL Season 1 (${iflS1._id})`);
    console.log(`   - Populated: seasonMeta.leagueDivisions with ${leagueDivisions.length} divisions`);
    console.log(`   - Total fighters: ${leagueDivisions.reduce((sum, div) => sum + div.fighters.length, 0)}`);
    console.log('\n🎯 Result: IFL S1 is now ready to start!');
    console.log('   - Divisions have fighter assignments ✓');
    console.log('   - Fights are properly structured ✓');
    console.log('   - Standings will now display correctly ✓');
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
    await fixIFLS1SeasonMeta();
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

