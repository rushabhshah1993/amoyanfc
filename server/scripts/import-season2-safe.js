/**
 * SAFE Import IFC Season 2 Competition Data to MongoDB
 * This script imports the migrated Season 2 data into the database
 * WITHOUT deleting existing data - it will skip import if data already exists
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import the models (CompetitionMeta must be imported for the Competition model's pre-save hook)
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';

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
 * Load Season 2 data from JSON file
 */
function loadSeason2Data() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season2-migrated.json');
  
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const season2Data = JSON.parse(rawData);
  
  console.log(`✅ Loaded Season 2 data:`);
  console.log(`   Competition: ${season2Data.competitionMetaId}`);
  console.log(`   Season: ${season2Data.seasonMeta.seasonNumber}`);
  console.log(`   Divisions: ${season2Data.seasonMeta.divisions.length}`);
  console.log(`   Total Rounds: ${season2Data.seasonMeta.totalRounds || 0}`);
  
  return season2Data;
}

/**
 * SAFE Import Season 2 to database - will NOT delete existing data
 */
async function safeImportSeason2() {
  console.log('\n' + '='.repeat(70));
  console.log('🛡️  SAFE IMPORT - IFC SEASON 2 COMPETITION DATA');
  console.log('='.repeat(70));
  console.log('⚠️  This script will NOT delete existing data');
  console.log('   If data already exists, import will be skipped');

  try {
    // Environment check
    checkEnvironment();

    // Connect to database
    await connectDB();

    // Load data
    const season2Data = loadSeason2Data();

    console.log('\n' + '='.repeat(70));
    console.log('SAFETY CHECK');
    console.log('='.repeat(70));

    // Check if Season 2 already exists
    const existingSeason = await Competition.findOne({
      competitionMetaId: season2Data.competitionMetaId,
      'seasonMeta.seasonNumber': 2
    });

    if (existingSeason) {
      console.log('\n✅ SAFE MODE: Season 2 already exists!');
      console.log(`   Found existing Season 2 with ID: ${existingSeason._id}`);
      console.log('   Skipping import to prevent data loss');
      console.log('   If you need to replace existing data, use the regular import script');
      
      // Show existing data summary
      console.log('\n' + '='.repeat(70));
      console.log('EXISTING DATA SUMMARY');
      console.log('='.repeat(70));
      
      console.log(`\nSeason ID: ${existingSeason._id}`);
      console.log(`Competition Meta ID: ${existingSeason.competitionMetaId}`);
      console.log(`Season Number: ${existingSeason.seasonMeta.seasonNumber}`);
      console.log(`Divisions: ${existingSeason.seasonMeta.divisions.length}`);
      console.log(`Total Rounds: ${existingSeason.seasonMeta.totalRounds}`);
      
      if (existingSeason.seasonMeta.divisions.length > 0) {
        const firstDivision = existingSeason.seasonMeta.divisions[0];
        console.log(`\nFirst Division:`);
        console.log(`  Division Number: ${firstDivision.divisionNumber}`);
        console.log(`  Fighters: ${firstDivision.fighters.length}`);
        console.log(`  Rounds: ${firstDivision.rounds.length}`);
      }

      console.log('\n' + '='.repeat(70));
      console.log('✨ SAFE IMPORT COMPLETE - NO DATA MODIFIED ✨');
      console.log('='.repeat(70));
      return;
    }

    console.log('\n✅ SAFE TO IMPORT: No existing Season 2 data found');
    console.log('   Proceeding with import...');

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    // Create new Season 2 document
    console.log('\n📥 Creating Season 2 document...');
    const newSeason = new Competition(season2Data);
    
    // Save to database
    const savedSeason = await newSeason.save();
    
    console.log('✅ Successfully imported Season 2!');
    console.log(`   Document ID: ${savedSeason._id}`);

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifiedSeason = await Competition.findById(savedSeason._id);

    if (!verifiedSeason) {
      throw new Error('Verification failed - Season 2 not found after import');
    }

    console.log('✅ Verification PASSED - Season 2 imported successfully!');
    console.log(`   Document ID: ${verifiedSeason._id}`);
    console.log(`   Competition Meta ID: ${verifiedSeason.competitionMetaId}`);
    console.log(`   Season Number: ${verifiedSeason.seasonMeta.seasonNumber}`);
    console.log(`   Divisions: ${verifiedSeason.seasonMeta.divisions.length}`);
    console.log(`   Total Rounds: ${verifiedSeason.seasonMeta.totalRounds}`);

    // Show sample data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA (First Division)');
    console.log('='.repeat(70));

    if (verifiedSeason.seasonMeta.divisions.length > 0) {
      const firstDivision = verifiedSeason.seasonMeta.divisions[0];
      console.log(`\nDivision: ${firstDivision.divisionNumber}`);
      console.log(`Fighters: ${firstDivision.fighters.length}`);
      console.log(`Rounds: ${firstDivision.rounds.length}`);
      
      if (firstDivision.rounds.length > 0) {
        const firstRound = firstDivision.rounds[0];
        console.log(`\nFirst Round: ${firstRound.roundNumber}`);
        console.log(`Fights: ${firstRound.fights.length}`);
        
        if (firstRound.fights.length > 0) {
          const firstFight = firstRound.fights[0];
          console.log(`\nFirst Fight: ${firstFight.fightId}`);
          console.log(`Fighter 1: ${firstFight.fighter1Id}`);
          console.log(`Fighter 2: ${firstFight.fighter2Id}`);
          console.log(`Winner: ${firstFight.winnerId || 'Not yet determined'}`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ SAFE IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nYou can now query Season 2 data using:');
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
safeImportSeason2();
