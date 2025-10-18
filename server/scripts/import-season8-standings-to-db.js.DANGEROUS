/**
 * Import Season 8 Standings to MongoDB
 * This script imports all standing snapshots for Season 8 into the database
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import RoundStandings model
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
 * Load Season 8 standings from JSON file
 */
function loadSeason8Standings() {
  const dataPath = path.join(__dirname, '../../old-data/migrated-standings/season8-all-rounds-standings.json');
  
  console.log(`\n📂 Loading standings from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Standings file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const standings = JSON.parse(rawData);
  
  console.log(`✅ Loaded ${standings.length} standing snapshots`);
  
  return standings;
}

/**
 * Import Season 8 standings to database
 */
async function importSeason8Standings() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 8 - STANDINGS IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load Season 8 standings
    const standings = loadSeason8Standings();

    console.log('\n' + '='.repeat(70));
    console.log('CHECKING EXISTING DATA');
    console.log('='.repeat(70));

    // Check if Season 8 standings already exist
    const existingCount = await RoundStandings.countDocuments({ seasonNumber: 8 });

    if (existingCount > 0) {
      console.log(`\n⚠️  WARNING: Found ${existingCount} existing standings for Season 8!`);
      console.log('   This script will DELETE all existing Season 8 standings and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season 8 standings...');
      const deleteResult = await RoundStandings.deleteMany({ seasonNumber: 8 });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing standings`);
    } else {
      console.log('\n✅ No existing Season 8 standings found. Proceeding with fresh import...');
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING STANDINGS');
    console.log('='.repeat(70));

    // Import in batches to avoid memory issues
    const BATCH_SIZE = 50;
    let importedCount = 0;
    
    console.log(`\n📥 Importing ${standings.length} standings in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < standings.length; i += BATCH_SIZE) {
      const batch = standings.slice(i, i + BATCH_SIZE);
      await RoundStandings.insertMany(batch, { ordered: false });
      importedCount += batch.length;
      
      const progress = Math.round((importedCount / standings.length) * 100);
      process.stdout.write(`\r   Progress: ${importedCount}/${standings.length} (${progress}%)`);
    }
    
    console.log('\n✅ All standings imported successfully!');

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifyCount = await RoundStandings.countDocuments({ seasonNumber: 8 });
    console.log(`\n✅ Verified ${verifyCount} standings in database`);

    // Get statistics per division
    console.log('\n📊 Standings per Division:');
    
    for (let divisionNumber = 1; divisionNumber <= 3; divisionNumber++) {
      const divisionCount = await RoundStandings.countDocuments({ 
        seasonNumber: 8, 
        divisionNumber 
      });
      console.log(`   Division ${divisionNumber}: ${divisionCount} snapshots`);
    }

    // Get sample final standing
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA (Division 1 Final Standings)');
    console.log('='.repeat(70));

    const finalStanding = await RoundStandings.findOne({ 
      seasonNumber: 8, 
      divisionNumber: 1,
      fightIdentifier: 'S8-D1-R9-F5'
    });

    if (finalStanding) {
      console.log(`\nFight: ${finalStanding.fightIdentifier}`);
      console.log(`Round: ${finalStanding.roundNumber}`);
      console.log(`\nTop 3 Fighters:`);
      finalStanding.standings.slice(0, 3).forEach((s, idx) => {
        const trophy = idx === 0 ? ' 🏆' : '';
        console.log(`  ${idx + 1}. ${s.fighterName} - ${s.points} pts (${s.wins}W-${s.fightsCount - s.wins}L)${trophy}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 8 standings have been imported to MongoDB!');
    console.log('\n📋 Summary:');
    console.log(`   - Total Snapshots: ${verifyCount}`);
    console.log(`   - Season: 8`);
    console.log(`   - Divisions: 3`);
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
importSeason8Standings();

