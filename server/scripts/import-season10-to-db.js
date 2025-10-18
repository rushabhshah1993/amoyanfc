/**
 * Import IFC Season 10 Competition Data to MongoDB
 * This script imports the migrated Season 10 data into the database
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
 * Load Season 10 data from JSON file
 */
function loadSeason10Data() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season10-migrated.json');
  
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const seasonData = JSON.parse(rawData);
  
  console.log(`✅ Loaded Season 10 data with ${seasonData.leagueData.divisions.length} divisions`);
  
  return seasonData;
}

/**
 * Import Season 10 data to database
 */
async function importSeason10Data() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 10 - COMPETITION DATA IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load Season 10 data
    const seasonData = loadSeason10Data();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));

    // Check if Season 10 data already exists
    const existingCompetition = await Competition.findOne({
      competitionMetaId: seasonData.competitionMetaId,
      'seasonMeta.seasonNumber': 10
    });

    if (existingCompetition) {
      console.log(`\n⚠️  WARNING: Found existing competition data for Season 10!`);
      console.log(`   Existing Season ID: ${existingCompetition._id}`);
      console.log('   This script will DELETE the existing Season 10 and import fresh data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('\n🗑️  Deleting existing Season 10...');
      await Competition.findByIdAndDelete(existingCompetition._id);
      console.log('✅ Deleted existing Season 10 document');
    } else {
      console.log('\n✅ No existing Season 10 data found. Proceeding with fresh import...');
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    // Import CompetitionMeta update
    console.log('\n📥 Updating CompetitionMeta...');
    
    const competitionMetaData = {
      competitionName: 'Invictus Fighting Championship',
      type: 'league',
      logo: 'https://amoyanfc-assets.s3.amazonaws.com/competitions/ifc.png',
      isActive: seasonData.isActive,
      seasonMeta: seasonData.seasonMeta
    };

    await CompetitionMeta.findByIdAndUpdate(
      seasonData.competitionMetaId,
      { $set: competitionMetaData },
      { upsert: true, new: true }
    );
    console.log('✅ CompetitionMeta updated successfully!');

    // Import Competition data
    console.log('\n📥 Creating Season 10 competition document...');
    
    const newCompetition = new Competition(seasonData);
    const savedCompetition = await newCompetition.save();
    
    console.log('✅ Season 10 competition data imported successfully!');
    console.log(`   Document ID: ${savedCompetition._id}`);

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const importedCompetition = await Competition.findById(savedCompetition._id);

    console.log(`\n✅ Season 10 data verified in database:`);
    console.log(`   - Season Number: ${importedCompetition.seasonMeta.seasonNumber}`);
    console.log(`   - Competition Meta ID: ${importedCompetition.competitionMetaId}`);
    console.log(`   - Is Active: ${importedCompetition.isActive}`);
    console.log(`   - Divisions: ${importedCompetition.leagueData.divisions.length}`);
    console.log(`   - Start Date: ${importedCompetition.seasonMeta.startDate}`);
    console.log(`   - End Date: ${importedCompetition.seasonMeta.endDate}`);

    // Show statistics by division
    console.log(`\n📊 Data per Division:`);
    importedCompetition.leagueData.divisions.forEach(division => {
      const totalFights = division.rounds.reduce((sum, round) => sum + round.fights.length, 0);
      const fighters = importedCompetition.seasonMeta.leagueDivisions.find(d => d.divisionNumber === division.divisionNumber);
      console.log(`   Division ${division.divisionNumber}:`);
      console.log(`     - Fighters: ${fighters?.fighters.length || 0}`);
      console.log(`     - Rounds: ${division.totalRounds}`);
      console.log(`     - Fights: ${totalFights}`);
      console.log(`     - Winner: ${fighters?.winners[0] || 'N/A'}`);
    });

    // Show sample data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA (Division 1, Round 1)');
    console.log('='.repeat(70));

    const firstDivision = importedCompetition.leagueData.divisions.find(d => d.divisionNumber === 1);
    if (firstDivision) {
      console.log(`\nDivision: ${firstDivision.divisionName}`);
      console.log(`Rounds: ${firstDivision.totalRounds}`);
      console.log(`Current Round: ${firstDivision.currentRound}`);
      
      const firstRound = firstDivision.rounds.find(r => r.roundNumber === 1);
      if (firstRound && firstRound.fights.length > 0) {
        const firstFight = firstRound.fights[0];
        console.log(`\nFirst Fight: ${firstFight.fightIdentifier}`);
        console.log(`  Fighter 1: ${firstFight.fighter1}`);
        console.log(`  Fighter 2: ${firstFight.fighter2}`);
        console.log(`  Winner: ${firstFight.winner}`);
        console.log(`  Date: ${firstFight.date}`);
        console.log(`  Status: ${firstFight.fightStatus}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 10 competition data has been imported to MongoDB!');
    console.log(`Document ID: ${savedCompetition._id}`);
    console.log('\n📋 Summary:');
    console.log(`   - Total Divisions: ${importedCompetition.leagueData.divisions.length}`);
    console.log(`   - Total Rounds: ${importedCompetition.leagueData.divisions.reduce((sum, d) => sum + d.rounds.length, 0)}`);
    console.log(`   - Total Fights: ${importedCompetition.leagueData.divisions.reduce((sum, d) => sum + d.rounds.reduce((s, r) => s + r.fights.length, 0), 0)}`);
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
importSeason10Data();

