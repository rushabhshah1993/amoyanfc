/**
 * SAFE Import IFC Season 2 Round Standings to MongoDB
 * This script ONLY imports Season 2 standings if they don't exist
 * It will NEVER delete existing data
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { RoundStandings } from '../models/round-standings.model.js';

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
 * Load Season 2 standings from JSON file
 */
function loadSeason2Standings() {
  const dataPath = path.join(__dirname, '../../old-data/migrated-standings/season2-all-rounds-standings.json');
  
  console.log(`\n📂 Loading standings from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Standings file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const standingsData = JSON.parse(rawData);
  
  console.log(`✅ Loaded ${standingsData.length} standing snapshots for Season 2`);
  
  return standingsData;
}

/**
 * SAFE Import Season 2 standings to database
 * This function will ONLY add missing standings, never delete existing data
 */
async function importSeason2StandingsSafe() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 2 - SAFE STANDINGS IMPORT TO MONGODB');
  console.log('🛡️  PROTECTION MODE: Will NOT delete any existing data');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load standings data
    const standingsData = loadSeason2Standings();

    console.log('\n' + '='.repeat(70));
    console.log('CHECKING EXISTING DATA');
    console.log('='.repeat(70));

    // Check if Season 2 standings already exist
    const existingCount = await RoundStandings.countDocuments({
      seasonNumber: 2
    });

    console.log(`\n📊 Existing Season 2 standings: ${existingCount}`);
    console.log(`📊 Standings in file: ${standingsData.length}`);

    if (existingCount >= standingsData.length) {
      console.log('\n✅ Season 2 standings are already complete in the database!');
      console.log('   No import needed. Exiting safely...');
      return;
    }

    // Find which standings are missing
    console.log('\n📋 Checking which standings are missing...');
    const existingIdentifiers = await RoundStandings.distinct('fightIdentifier', {
      seasonNumber: 2
    });

    const missingStandings = standingsData.filter(
      standing => !existingIdentifiers.includes(standing.fightIdentifier)
    );

    console.log(`\n📊 Missing standings: ${missingStandings.length}`);

    if (missingStandings.length === 0) {
      console.log('✅ All Season 2 standings are already in the database!');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING MISSING DATA');
    console.log('='.repeat(70));

    // Import only missing standings
    console.log(`\n📥 Importing ${missingStandings.length} missing standing snapshots...`);
    
    // Insert in batches for better performance
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < missingStandings.length; i += batchSize) {
      const batch = missingStandings.slice(i, i + batchSize);
      try {
        await RoundStandings.insertMany(batch, { ordered: false });
        importedCount += batch.length;
        console.log(`   Imported ${importedCount}/${missingStandings.length} snapshots...`);
      } catch (error) {
        // Some might already exist due to unique index, that's okay
        console.log(`   Batch ${Math.floor(i/batchSize) + 1}: ${error.writeErrors?.length || 0} duplicates skipped`);
        importedCount += batch.length - (error.writeErrors?.length || 0);
      }
    }
    
    console.log(`✅ Successfully imported ${importedCount} missing Season 2 standings!`);

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifiedCount = await RoundStandings.countDocuments({
      seasonNumber: 2
    });

    console.log(`\n✅ Season 2 standings verified in database:`);
    console.log(`   - Total snapshots: ${verifiedCount}/${standingsData.length}`);
    console.log(`   - Newly imported: ${importedCount}`);

    if (verifiedCount === standingsData.length) {
      console.log('\n🎉 Season 2 standings are now COMPLETE!');
    } else {
      console.log(`\n⚠️  Still missing ${standingsData.length - verifiedCount} standings`);
    }

    // Get statistics by round
    const roundStats = await RoundStandings.aggregate([
      { $match: { seasonNumber: 2 } },
      { $group: { 
          _id: { division: '$divisionNumber', round: '$roundNumber' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.division': 1, '_id.round': 1 } }
    ]);

    console.log(`\n📊 Standings per Division/Round:`);
    let currentDiv = null;
    roundStats.forEach(stat => {
      if (currentDiv !== stat._id.division) {
        currentDiv = stat._id.division;
        console.log(`\n  Division ${currentDiv}:`);
      }
      console.log(`    Round ${stat._id.round}: ${stat.count} snapshots`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✨ SAFE IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\n🛡️  Season 2 standings have been safely imported!');
    console.log('   - No existing data was deleted');
    console.log('   - Only missing data was added');
    console.log('');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the import
importSeason2StandingsSafe();

