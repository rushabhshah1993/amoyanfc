/**
 * Import IFC Season 3 Round Standings to MongoDB
 * This script imports the calculated standings for every fight in Season 3
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
 * Load Season 3 standings from JSON file
 */
function loadSeason3Standings() {
  const dataPath = path.join(__dirname, '../../old-data/migrated-standings/season3-all-rounds-standings.json');
  
  console.log(`\n📂 Loading standings from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Standings file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const standingsData = JSON.parse(rawData);
  
  console.log(`✅ Loaded ${standingsData.length} standing snapshots for Season 3`);
  
  return standingsData;
}

/**
 * Import Season 3 standings to database
 */
async function importSeason3Standings() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 3 - STANDINGS IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load standings data
    const standingsData = loadSeason3Standings();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));

    // Check if Season 3 standings already exist
    const existingCount = await RoundStandings.countDocuments({
      seasonNumber: 3
    });

    if (existingCount > 0) {
      console.log(`\n⚠️  WARNING: Found ${existingCount} existing standings for Season 3!`);
      console.log('   This script will DELETE existing Season 3 standings and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season 3 standings...');
      const deleteResult = await RoundStandings.deleteMany({
        seasonNumber: 3
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing Season 3 standings`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    // Import all standings
    console.log(`\n📥 Importing ${standingsData.length} standing snapshots...`);
    
    // Insert in batches for better performance
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < standingsData.length; i += batchSize) {
      const batch = standingsData.slice(i, i + batchSize);
      await RoundStandings.insertMany(batch);
      importedCount += batch.length;
      console.log(`   Imported ${importedCount}/${standingsData.length} snapshots...`);
    }
    
    console.log('✅ Successfully imported all Season 3 standings!');

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifiedCount = await RoundStandings.countDocuments({
      seasonNumber: 3
    });

    console.log(`\n✅ Season 3 standings verified in database:`);
    console.log(`   - Total snapshots: ${verifiedCount}`);

    // Get statistics by round
    const roundStats = await RoundStandings.aggregate([
      { $match: { seasonNumber: 3 } },
      { $group: { 
          _id: '$roundNumber',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(`\n📊 Standings per Round:`);
    roundStats.forEach(stat => {
      console.log(`   Round ${stat._id}: ${stat.count} snapshots`);
    });

    // Show sample data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA');
    console.log('='.repeat(70));

    const firstStanding = await RoundStandings.findOne({
      seasonNumber: 3,
      roundNumber: 1
    }).sort({ fightIdentifier: 1 });

    if (firstStanding) {
      console.log('\nFirst Standing (Round 1, First Fight):');
      console.log(`  Fight: ${firstStanding.fightIdentifier}`);
      console.log(`  Division: ${firstStanding.divisionNumber}`);
      console.log(`  Standings count: ${firstStanding.standings.length}`);
      console.log(`  Top 3:`);
      firstStanding.standings.slice(0, 3).forEach((s, idx) => {
        console.log(`    ${idx + 1}. Fighter ${s.fighterId} - ${s.points} pts (${s.wins}W-${s.losses}L)`);
      });
    }

    const lastStanding = await RoundStandings.findOne({
      seasonNumber: 3,
      roundNumber: 9
    }).sort({ fightIdentifier: -1 });

    if (lastStanding) {
      console.log('\nFinal Standing (Round 9, Last Fight):');
      console.log(`  Fight: ${lastStanding.fightIdentifier}`);
      console.log(`  Division: ${lastStanding.divisionNumber}`);
      console.log(`  Standings count: ${lastStanding.standings.length}`);
      console.log(`  Final Top 3:`);
      lastStanding.standings.slice(0, 3).forEach((s, idx) => {
        console.log(`    ${idx + 1}. Fighter ${s.fighterId} - ${s.points} pts (${s.wins}W-${s.losses}L)`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 3 standings have been imported to MongoDB!');
    console.log('Frontend can now display standings after each fight.');
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
importSeason3Standings();

