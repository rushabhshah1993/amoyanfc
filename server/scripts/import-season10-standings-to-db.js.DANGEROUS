/**
 * Import Season 10 Standings to MongoDB
 * This script imports all standing snapshots for Season 10 into the database
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
 * Load Season 10 standings from JSON file
 */
function loadSeason10Standings() {
  const dataPath = path.join(__dirname, '../../old-data/migrated-standings/season10-all-rounds-standings.json');
  
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
 * Import Season 10 standings to database
 */
async function importSeason10Standings() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 10 - STANDINGS IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load Season 10 standings
    const standings = loadSeason10Standings();

    console.log('\n' + '='.repeat(70));
    console.log('CHECKING EXISTING DATA');
    console.log('='.repeat(70));

    // Check if Season 10 standings already exist
    const existingCount = await RoundStandings.countDocuments({ seasonNumber: 10 });

    if (existingCount > 0) {
      console.log(`\n⚠️  WARNING: Found ${existingCount} existing standings for Season 10!`);
      console.log('   This script will DELETE all existing Season 10 standings and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season 10 standings...');
      const deleteResult = await RoundStandings.deleteMany({ seasonNumber: 10 });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing standings`);
    } else {
      console.log('\n✅ No existing Season 10 standings found. Proceeding with fresh import...');
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

    const verifyCount = await RoundStandings.countDocuments({ seasonNumber: 10 });
    console.log(`\n✅ Verified ${verifyCount} standings in database`);

    // Get statistics per division
    console.log('\n📊 Standings per Division:');
    
    for (let divisionNumber = 1; divisionNumber <= 3; divisionNumber++) {
      const divisionCount = await RoundStandings.countDocuments({ 
        seasonNumber: 10, 
        divisionNumber 
      });
      console.log(`   Division ${divisionNumber}: ${divisionCount} snapshots`);
    }

    // Get sample final standing for each division
    console.log('\n' + '='.repeat(70));
    console.log('FINAL STANDINGS PER DIVISION');
    console.log('='.repeat(70));

    for (let divisionNumber = 1; divisionNumber <= 3; divisionNumber++) {
      // Find the last fight for each division
      const lastRoundMap = {
        1: 9,  // Division 1 has 9 rounds
        2: 11, // Division 2 has 11 rounds
        3: 15  // Division 3 has 15 rounds
      };
      
      const lastFightMap = {
        1: 5,  // Division 1 has 5 fights per round
        2: 6,  // Division 2 has 6 fights per round
        3: 8   // Division 3 has 8 fights per round
      };

      const lastRound = lastRoundMap[divisionNumber];
      const lastFight = lastFightMap[divisionNumber];
      const fightIdentifier = `IFC-S10-D${divisionNumber}-R${lastRound}-F${lastFight}`;

      const finalStanding = await RoundStandings.findOne({ 
        seasonNumber: 10, 
        divisionNumber,
        fightIdentifier
      });

      if (finalStanding) {
        console.log(`\n📊 Division ${divisionNumber} Final Standings:`);
        console.log(`   Fight: ${finalStanding.fightIdentifier}`);
        console.log(`   Top 3:`);
        finalStanding.standings.slice(0, 3).forEach((s, idx) => {
          const trophy = idx === 0 ? ' 🏆' : '';
          console.log(`     ${idx + 1}. ${s.fighterName} - ${s.points} pts (${s.wins}W-${s.fightsCount - s.wins}L)${trophy}`);
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 10 standings have been imported to MongoDB!');
    console.log('\n📋 Summary:');
    console.log(`   - Total Snapshots: ${verifyCount}`);
    console.log(`   - Season: 10`);
    console.log(`   - Divisions: 3`);
    console.log(`   - Division 1: 45 snapshots (9 rounds)`);
    console.log(`   - Division 2: 66 snapshots (11 rounds)`);
    console.log(`   - Division 3: 120 snapshots (15 rounds)`);
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
importSeason10Standings();

