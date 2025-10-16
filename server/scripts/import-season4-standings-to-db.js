/**
 * Import IFC Season 4 Round Standings to MongoDB
 * This script imports the calculated standings for every fight in Season 4
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
 * Load Season 4 standings from JSON file
 */
function loadSeason4Standings() {
  const dataPath = path.join(__dirname, '../../old-data/migrated-standings/season4-all-rounds-standings.json');
  
  console.log(`\n📂 Loading standings from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Standings file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const standingsData = JSON.parse(rawData);
  
  console.log(`✅ Loaded ${standingsData.length} standing snapshots for Season 4`);
  
  return standingsData;
}

/**
 * Import Season 4 standings to database
 */
async function importSeason4Standings() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 4 - STANDINGS IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load standings data
    const standingsData = loadSeason4Standings();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));

    // Check if Season 4 standings already exist
    const existingCount = await RoundStandings.countDocuments({
      seasonNumber: 4
    });

    if (existingCount > 0) {
      console.log(`\n⚠️  WARNING: Found ${existingCount} existing standings for Season 4!`);
      console.log('   This script will DELETE existing Season 4 standings and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season 4 standings...');
      const deleteResult = await RoundStandings.deleteMany({
        seasonNumber: 4
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing Season 4 standings`);
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
    
    console.log('✅ Successfully imported all Season 4 standings!');

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifiedCount = await RoundStandings.countDocuments({
      seasonNumber: 4
    });

    console.log(`\n✅ Season 4 standings verified in database:`);
    console.log(`   - Total snapshots: ${verifiedCount}`);

    // Get statistics by division
    const divisionStats = await RoundStandings.aggregate([
      { $match: { seasonNumber: 4 } },
      { $group: { 
          _id: '$divisionNumber',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(`\n📊 Standings per Division:`);
    divisionStats.forEach(stat => {
      console.log(`   Division ${stat._id}: ${stat.count} snapshots`);
    });

    // Get statistics by round for each division
    const roundStats = await RoundStandings.aggregate([
      { $match: { seasonNumber: 4 } },
      { $group: { 
          _id: { division: '$divisionNumber', round: '$roundNumber' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.division': 1, '_id.round': 1 } }
    ]);

    console.log(`\n📊 Standings per Division/Round:`);
    let currentDivision = null;
    roundStats.forEach(stat => {
      if (currentDivision !== stat._id.division) {
        currentDivision = stat._id.division;
        console.log(`   Division ${currentDivision}:`);
      }
      console.log(`     Round ${stat._id.round}: ${stat.count} snapshots`);
    });

    // Show sample data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA');
    console.log('='.repeat(70));

    const firstStanding = await RoundStandings.findOne({
      seasonNumber: 4,
      divisionNumber: 1,
      roundNumber: 1
    }).sort({ fightIdentifier: 1 });

    if (firstStanding) {
      console.log('\nFirst Standing (Division 1, Round 1, First Fight):');
      console.log(`  Fight: ${firstStanding.fightIdentifier}`);
      console.log(`  Division: ${firstStanding.divisionNumber}`);
      console.log(`  Standings count: ${firstStanding.standings.length}`);
      console.log(`  Top 3:`);
      firstStanding.standings.slice(0, 3).forEach((s, idx) => {
        console.log(`    ${idx + 1}. Fighter ${s.fighterId} - ${s.points} pts (${s.wins}W-${s.fightsCount - s.wins}L)`);
      });
    }

    const lastStanding = await RoundStandings.findOne({
      seasonNumber: 4,
      divisionNumber: 3,
      roundNumber: 15
    }).sort({ fightIdentifier: -1 });

    if (lastStanding) {
      console.log('\nFinal Standing (Division 3, Round 15, Last Fight):');
      console.log(`  Fight: ${lastStanding.fightIdentifier}`);
      console.log(`  Division: ${lastStanding.divisionNumber}`);
      console.log(`  Standings count: ${lastStanding.standings.length}`);
      console.log(`  Final Top 3:`);
      lastStanding.standings.slice(0, 3).forEach((s, idx) => {
        console.log(`    ${idx + 1}. Fighter ${s.fighterId} - ${s.points} pts (${s.wins}W-${s.fightsCount - s.wins}L)`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 4 standings have been imported to MongoDB!');
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
importSeason4Standings();
