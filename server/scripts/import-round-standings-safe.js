/**
 * SAFE Import IFC Season 1 Round Standings to MongoDB
 * This script imports the migrated round standings data into the database
 * WITHOUT deleting existing data - it will skip import if data already exists
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import the RoundStandings model
import { RoundStandings } from '../models/round-standings.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment protection - prevent accidental production data loss
 */
function checkEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    console.log('❌ SAFE IMPORT: This script is disabled in production environment');
    console.log('   Use development environment for data imports');
    console.log('   If you need to import in production, use the regular import script with caution');
    process.exit(1);
  }
}

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
 * Load standings data from JSON file
 */
function loadStandingsData() {
  const dataPath = path.join(__dirname, '../../old-data/migrated-standings/all-rounds-standings.json');
  
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const standingsData = JSON.parse(rawData);
  
  console.log(`✅ Loaded ${standingsData.length} standings documents`);
  
  return standingsData;
}

/**
 * SAFE Import standings to database - will NOT delete existing data
 */
async function safeImportStandings() {
  console.log('\n' + '='.repeat(70));
  console.log('🛡️  SAFE IMPORT - IFC SEASON 1 ROUND STANDINGS');
  console.log('='.repeat(70));
  console.log('⚠️  This script will NOT delete existing data');
  console.log('   If data already exists, import will be skipped');

  try {
    // Environment check
    checkEnvironment();

    // Connect to database
    await connectDB();

    // Load data
    const standingsData = loadStandingsData();

    console.log('\n' + '='.repeat(70));
    console.log('SAFETY CHECK');
    console.log('='.repeat(70));

    // Check if data already exists
    const existingCount = await RoundStandings.countDocuments({
      seasonNumber: standingsData[0].seasonNumber
    });

    console.log(`\n📊 Existing standings in database: ${existingCount}`);
    console.log(`📊 New standings to import: ${standingsData.length}`);

    if (existingCount > 0) {
      console.log('\n✅ SAFE MODE: Data already exists!');
      console.log(`   Found ${existingCount} existing Season 1 standings`);
      console.log('   Skipping import to prevent data loss');
      console.log('   If you need to replace existing data, use the regular import script');
      
      // Show existing data summary
      console.log('\n' + '='.repeat(70));
      console.log('EXISTING DATA SUMMARY');
      console.log('='.repeat(70));
      
      const sampleStanding = await RoundStandings.findOne({
        competitionId: standingsData[0].competitionId,
        seasonNumber: standingsData[0].seasonNumber
      });

      if (sampleStanding) {
        console.log(`\nSample Fight: ${sampleStanding.fightIdentifier}`);
        console.log(`Round: ${sampleStanding.roundNumber}`);
        console.log(`Fighters: ${sampleStanding.standings.length}`);
        console.log('\nTop 3:');
        sampleStanding.standings.slice(0, 3).forEach(s => {
          console.log(`  ${s.rank}. Fighter ${s.fighterId} - ${s.points} points (${s.wins} wins)`);
        });
      }

      console.log('\n' + '='.repeat(70));
      console.log('✨ SAFE IMPORT COMPLETE - NO DATA MODIFIED ✨');
      console.log('='.repeat(70));
      return;
    }

    console.log('\n✅ SAFE TO IMPORT: No existing data found');
    console.log('   Proceeding with import...');

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    // Import in batches for better performance
    const BATCH_SIZE = 10;
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < standingsData.length; i += BATCH_SIZE) {
      const batch = standingsData.slice(i, i + BATCH_SIZE);
      
      try {
        const result = await RoundStandings.insertMany(batch, { 
          ordered: false, // Continue even if some fail
          rawResult: true 
        });
        imported += batch.length;
        
        // Show progress
        const progress = Math.floor((i + batch.length) / standingsData.length * 100);
        process.stdout.write(`\r📥 Importing... ${progress}% (${imported}/${standingsData.length})`);
        
      } catch (error) {
        failed += batch.length;
        errors.push({
          batch: Math.floor(i / BATCH_SIZE) + 1,
          error: error.message
        });
      }
    }

    console.log('\n');
    console.log('\n' + '='.repeat(70));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(70));
    console.log(`✅ Successfully imported: ${imported} documents`);
    
    if (failed > 0) {
      console.log(`❌ Failed to import: ${failed} documents`);
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  Batch ${err.batch}: ${err.error}`);
      });
    }

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const totalInDB = await RoundStandings.countDocuments({
      competitionId: standingsData[0].competitionId,
      seasonNumber: standingsData[0].seasonNumber
    });

    console.log(`\n📊 Total standings in database: ${totalInDB}`);
    console.log(`📊 Expected count: ${standingsData.length}`);
    
    if (totalInDB === standingsData.length) {
      console.log('✅ Verification PASSED - All documents imported successfully!');
    } else {
      console.log(`⚠️  Verification WARNING - Count mismatch (${totalInDB} vs ${standingsData.length})`);
    }

    // Show sample data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA (First Fight)');
    console.log('='.repeat(70));

    const firstStanding = await RoundStandings.findOne({
      fightIdentifier: 'IFC-S1-D1-R1-F1'
    });

    if (firstStanding) {
      console.log(`\nFight: ${firstStanding.fightIdentifier}`);
      console.log(`Round: ${firstStanding.roundNumber}`);
      console.log(`Fighters: ${firstStanding.standings.length}`);
      console.log('\nTop 3:');
      firstStanding.standings.slice(0, 3).forEach(s => {
        console.log(`  ${s.rank}. Fighter ${s.fighterId} - ${s.points} points (${s.wins} wins)`);
      });
    }

    // Show final standings
    console.log('\n' + '='.repeat(70));
    console.log('FINAL SEASON STANDINGS (Last Fight)');
    console.log('='.repeat(70));

    const finalStanding = await RoundStandings.findOne({
      fightIdentifier: 'IFC-S1-D1-R9-F5'
    });

    if (finalStanding) {
      console.log(`\nFight: ${finalStanding.fightIdentifier}`);
      console.log(`\nFinal Rankings:`);
      console.log('Rank | Fighter ID                       | Fights | Wins | Points');
      console.log('─'.repeat(70));
      finalStanding.standings.forEach(s => {
        const trophy = s.rank === 1 ? ' 🏆' : '';
        console.log(
          `${String(s.rank).padStart(4)} | ${s.fighterId.padEnd(32)} | ${String(s.fightsCount).padStart(6)} | ${String(s.wins).padStart(4)} | ${String(s.points).padStart(6)}${trophy}`
        );
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ SAFE IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nYou can now query the round standings using:');
    console.log('  - GraphQL queries');
    console.log('  - MongoDB queries');
    console.log('  - Frontend components\n');

  } catch (error) {
    console.error('\n❌ Safe import failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed\n');
  }
}

// Run the safe import
safeImportStandings();
