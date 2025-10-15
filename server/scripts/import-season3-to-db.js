/**
 * Import IFC Season 3 Competition Data to MongoDB
 * This script imports the migrated Season 3 data into the database
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models (CompetitionMeta must be imported for pre-save hooks)
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';

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
 * Load Season 3 data from JSON file
 */
function loadSeason3Data() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season3-migrated.json');
  
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const season3Data = JSON.parse(rawData);
  
  console.log(`✅ Loaded Season 3 data`);
  console.log(`   - Season Number: ${season3Data.seasonMeta.seasonNumber}`);
  console.log(`   - Divisions: ${season3Data.leagueData.divisions.length}`);
  console.log(`   - Total Rounds: ${season3Data.leagueData.divisions[0]?.totalRounds || 0}`);
  
  return season3Data;
}

/**
 * Import Season 3 to database
 */
async function importSeason3() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 3 - COMPETITION DATA IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load data
    const season3Data = loadSeason3Data();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));

    // Check if Season 3 already exists
    const existingSeason = await Competition.findOne({
      competitionMetaId: season3Data.competitionMetaId,
      'seasonMeta.seasonNumber': 3
    });

    if (existingSeason) {
      console.log('\n⚠️  WARNING: Season 3 already exists in the database!');
      console.log(`   Existing Season ID: ${existingSeason._id}`);
      console.log('   This script will DELETE the existing Season 3 and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season 3...');
      await Competition.findByIdAndDelete(existingSeason._id);
      console.log('✅ Deleted existing Season 3 document');
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    // Create new Season 3 document
    console.log('\n📥 Creating Season 3 document...');
    const newSeason = new Competition(season3Data);
    
    // Save to database
    const savedSeason = await newSeason.save();
    
    console.log('✅ Successfully imported Season 3!');
    console.log(`   Document ID: ${savedSeason._id}`);

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifiedSeason = await Competition.findById(savedSeason._id);

    if (!verifiedSeason) {
      throw new Error('Season 3 document not found after import!');
    }

    console.log('\n✅ Season 3 verified in database:');
    console.log(`   - Season Number: ${verifiedSeason.seasonMeta.seasonNumber}`);
    console.log(`   - Competition Meta ID: ${verifiedSeason.competitionMetaId}`);
    console.log(`   - Is Active: ${verifiedSeason.isActive}`);
    console.log(`   - Divisions: ${verifiedSeason.leagueData.divisions.length}`);
    
    // Verify rounds and fights
    const division = verifiedSeason.leagueData.divisions[0];
    if (division) {
      console.log(`\n📊 Division 1 Statistics:`);
      console.log(`   - Total Rounds: ${division.totalRounds}`);
      console.log(`   - Current Round: ${division.currentRound}`);
      console.log(`   - Rounds Data: ${division.rounds.length}`);
      
      let totalFights = 0;
      division.rounds.forEach(round => {
        totalFights += round.fights.length;
      });
      console.log(`   - Total Fights: ${totalFights}`);
    }

    // Verify fighters
    console.log(`\n👥 Fighters in Division 1: ${verifiedSeason.seasonMeta.leagueDivisions[0]?.fighters.length || 0}`);
    console.log(`🏆 Division Winner: ${verifiedSeason.seasonMeta.leagueDivisions[0]?.winners[0] || 'None'}`);

    // Show sample fight
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA (First Fight)');
    console.log('='.repeat(70));

    const firstRound = verifiedSeason.leagueData.divisions[0]?.rounds[0];
    if (firstRound && firstRound.fights.length > 0) {
      const firstFight = firstRound.fights[0];
      console.log(`\nRound ${firstRound.roundNumber}, Fight 1:`);
      console.log(`  Fight ID: ${firstFight.fightIdentifier}`);
      console.log(`  Fighter 1: ${firstFight.fighter1}`);
      console.log(`  Fighter 2: ${firstFight.fighter2}`);
      console.log(`  Winner: ${firstFight.winner}`);
      console.log(`  Status: ${firstFight.fightStatus}`);
    }

    // Show final round sample
    console.log('\n' + '='.repeat(70));
    console.log('FINAL ROUND SAMPLE (Last Fight)');
    console.log('='.repeat(70));

    const lastRound = verifiedSeason.leagueData.divisions[0]?.rounds[8]; // Round 9 (index 8)
    if (lastRound && lastRound.fights.length > 0) {
      const lastFight = lastRound.fights[lastRound.fights.length - 1];
      console.log(`\nRound ${lastRound.roundNumber}, Last Fight:`);
      console.log(`  Fight ID: ${lastFight.fightIdentifier}`);
      console.log(`  Fighter 1: ${lastFight.fighter1}`);
      console.log(`  Fighter 2: ${lastFight.fighter2}`);
      console.log(`  Winner: ${lastFight.winner}`);
      console.log(`  Status: ${lastFight.fightStatus}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 3 has been imported to MongoDB!');
    console.log('You can now query Season 3 data using:');
    console.log('  - GraphQL queries');
    console.log('  - MongoDB queries');
    console.log('  - Frontend components');
    console.log(`\nDocument ID: ${savedSeason._id}`);
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
importSeason3();

