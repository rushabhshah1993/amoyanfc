/**
 * Import IFC Season 4 Competition Data to MongoDB
 * This script imports the migrated Season 4 data into the database
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
 * Load Season 4 data from JSON file
 */
function loadSeason4Data() {
  const dataPath = path.join(__dirname, '../../old-data/ifc-season4-migrated.json');
  
  console.log(`\n📂 Loading data from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const seasonData = JSON.parse(rawData);
  
  console.log(`✅ Loaded Season 4 data with ${seasonData.leagueData.divisions.length} divisions`);
  
  return seasonData;
}

/**
 * Import Season 4 data to database
 */
async function importSeason4Data() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 4 - COMPETITION DATA IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load Season 4 data
    const seasonData = loadSeason4Data();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));

    // Check if Season 4 data already exists
    const existingCompetitionMeta = await CompetitionMeta.findOne({
      _id: seasonData.competitionMetaId
    });

    if (existingCompetitionMeta) {
      console.log(`\n⚠️  WARNING: Found existing competition meta for Season 4!`);
      console.log('   This script will UPDATE the existing Season 4 data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    // Import CompetitionMeta
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
    console.log('\n📥 Importing Competition data...');
    
    const competitionData = {
      competitionMetaId: seasonData.competitionMetaId,
      isActive: seasonData.isActive,
      seasonMeta: seasonData.seasonMeta,
      leagueData: seasonData.leagueData
    };

    await Competition.findOneAndUpdate(
      { 
        competitionMetaId: seasonData.competitionMetaId,
        'seasonMeta.seasonNumber': 4
      },
      competitionData,
      { upsert: true, new: true }
    );
    console.log('✅ Competition data imported successfully!');

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const importedCompetitionMeta = await CompetitionMeta.findById(seasonData.competitionMetaId);
    const importedCompetition = await Competition.findOne({
      competitionMetaId: seasonData.competitionMetaId
    });

    console.log(`\n✅ Season 4 data verified in database:`);
    console.log(`   - CompetitionMeta: ${importedCompetitionMeta ? 'Found' : 'Not found'}`);
    console.log(`   - Competition: ${importedCompetition ? 'Found' : 'Not found'}`);

    // Show statistics by division
    if (importedCompetition && importedCompetition.leagueData) {
      console.log(`\n📊 Data per Division:`);
      importedCompetition.leagueData.divisions.forEach(division => {
        const totalFights = division.rounds.reduce((sum, round) => sum + round.fights.length, 0);
        console.log(`   Division ${division.divisionNumber}: ${division.totalRounds} rounds, ${totalFights} fights`);
      });
    }

    // Show sample data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DATA');
    console.log('='.repeat(70));

    const firstCompetition = await Competition.findOne({
      competitionMetaId: seasonData.competitionMetaId
    });

    if (firstCompetition && firstCompetition.leagueData) {
      console.log('\nFirst Division (Division 1):');
      const firstDivision = firstCompetition.leagueData.divisions.find(d => d.divisionNumber === 1);
      if (firstDivision) {
        console.log(`  Division: ${firstDivision.divisionName}`);
        console.log(`  Rounds: ${firstDivision.totalRounds}`);
        console.log(`  Current Round: ${firstDivision.currentRound}`);
        
        const firstRound = firstDivision.rounds.find(r => r.roundNumber === 1);
        if (firstRound) {
          console.log(`  First Round Fights: ${firstRound.fights.length}`);
          console.log(`  First Fight: ${firstRound.fights[0].fightIdentifier}`);
          console.log(`  Fighters: ${firstRound.fights[0].fighter1} vs ${firstRound.fights[0].fighter2}`);
          console.log(`  Winner: ${firstRound.fights[0].winner}`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 4 competition data has been imported to MongoDB!');
    console.log('Next step: Import Season 4 standings data.');
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
importSeason4Data();
