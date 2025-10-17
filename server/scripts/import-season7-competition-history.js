/**
 * Import IFC Season 7 Competition History to MongoDB
 * This script updates fighter documents with Season 7 competition history data
 * It adds Season 7 to seasonDetails and updates overall competition statistics
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 7;

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
 * Load Season 7 competition history data
 */
function loadCompetitionHistoryData() {
  const dataPath = path.join(__dirname, '../../old-data/season7-competition-history.json');
  
  console.log(`\n📂 Loading competition history from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Competition history file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const historyData = JSON.parse(rawData);
  
  console.log(`✅ Loaded competition history for ${historyData.length} fighters`);
  
  return historyData;
}

/**
 * Get Season 7 competition ObjectId
 */
async function getSeason7CompetitionId() {
  const competition = await Competition.findOne({
    'seasonMeta.seasonNumber': SEASON_NUMBER
  });
  
  return competition ? competition._id : null;
}

/**
 * Import Season 7 competition history to database
 */
async function importCompetitionHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 7 - COMPETITION HISTORY IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load competition history data
    const historyData = loadCompetitionHistoryData();

    // Get Season 7 competition ID
    console.log('\n📂 Loading Season 7 competition...');
    const season7CompetitionId = await getSeason7CompetitionId();
    
    if (!season7CompetitionId) {
      console.error('❌ Season 7 competition not found in database!');
      console.error('   Please import Season 7 competition data first.');
      return;
    }
    
    console.log(`✅ Found Season 7 competition: ${season7CompetitionId}`);

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));
    
    // Check for existing Season 7 data
    const existingCount = await Fighter.countDocuments({
      'competitionHistory.seasonDetails': {
        $elemMatch: { seasonNumber: SEASON_NUMBER }
      }
    });
    
    if (existingCount > 0) {
      console.log(`\n⚠️  WARNING: Found ${existingCount} fighters with existing Season 7 competition history!`);
      console.log('   This script will UPDATE existing Season 7 data.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('\n✅ No existing Season 7 competition history found. Proceeding with fresh import...');
      console.log('   Press Ctrl+C within 3 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log(`\n📥 Updating ${historyData.length} fighters...`);
    
    for (const fighterData of historyData) {
      try {
        // Find the fighter in database
        const fighter = await Fighter.findById(fighterData.fighterId);
        
        if (!fighter) {
          console.warn(`  ⚠️  Fighter not found: ${fighterData.fighterName} (${fighterData.fighterId})`);
          skippedCount++;
          continue;
        }
        
        // Find or create competition history entry for IFC
        let competitionEntry = fighter.competitionHistory?.find(
          ch => ch.competitionId.toString() === COMPETITION_ID
        );
        
        if (!competitionEntry) {
          // Create new competition history entry
          if (!fighter.competitionHistory) {
            fighter.competitionHistory = [];
          }
          competitionEntry = {
            competitionId: COMPETITION_ID,
            numberOfSeasonAppearances: 0,
            totalFights: 0,
            totalWins: 0,
            totalLosses: 0,
            winPercentage: 0,
            seasonDetails: []
          };
          fighter.competitionHistory.push(competitionEntry);
        }
        
        // Check if Season 7 already exists in seasonDetails
        const existingSeason7Index = competitionEntry.seasonDetails.findIndex(
          sd => sd.seasonNumber === SEASON_NUMBER
        );
        
        const season7Detail = {
          seasonNumber: SEASON_NUMBER,
          divisionNumber: fighterData.divisionNumber,
          fights: fighterData.fights,
          wins: fighterData.wins,
          losses: fighterData.losses,
          points: fighterData.points,
          winPercentage: fighterData.winPercentage,
          finalPosition: fighterData.finalPosition
        };
        
        if (existingSeason7Index >= 0) {
          // Update existing Season 7 data
          const oldData = competitionEntry.seasonDetails[existingSeason7Index];
          
          // Subtract old Season 7 stats from totals
          competitionEntry.totalFights -= oldData.fights;
          competitionEntry.totalWins -= oldData.wins;
          competitionEntry.totalLosses -= oldData.losses;
          
          // Replace with new Season 7 data
          competitionEntry.seasonDetails[existingSeason7Index] = season7Detail;
        } else {
          // Add new Season 7 data
          competitionEntry.seasonDetails.push(season7Detail);
          competitionEntry.numberOfSeasonAppearances++;
        }
        
        // Add Season 7 stats to totals
        competitionEntry.totalFights += fighterData.fights;
        competitionEntry.totalWins += fighterData.wins;
        competitionEntry.totalLosses += fighterData.losses;
        
        // Recalculate overall win percentage
        competitionEntry.winPercentage = competitionEntry.totalFights > 0
          ? (competitionEntry.totalWins / competitionEntry.totalFights) * 100
          : 0;
        
        await fighter.save();
        updatedCount++;
        
        if (updatedCount % 10 === 0) {
          const progress = Math.floor((updatedCount / historyData.length) * 100);
          console.log(`   Progress: ${progress}% (${updatedCount}/${historyData.length} fighters)`);
        }
      } catch (error) {
        console.error(`  ❌ Error updating ${fighterData.fighterName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   - Updated: ${updatedCount} fighters`);
    console.log(`   - Skipped: ${skippedCount} fighters`);
    console.log(`   - Errors: ${errorCount} fighters`);

    // Verify the import
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    // Count fighters with Season 7 data
    const verifiedCount = await Fighter.countDocuments({
      'competitionHistory.seasonDetails': {
        $elemMatch: { seasonNumber: SEASON_NUMBER }
      }
    });
    
    console.log(`\n✅ Fighters with Season 7 competition history: ${verifiedCount}`);

    // Sample verification
    const sampleFighters = historyData.slice(0, 3);
    
    for (const fighterData of sampleFighters) {
      const fighter = await Fighter.findById(fighterData.fighterId);
      if (fighter) {
        const compHistory = fighter.competitionHistory?.find(
          ch => ch.competitionId.toString() === COMPETITION_ID
        );
        
        if (compHistory) {
          const season7Detail = compHistory.seasonDetails.find(sd => sd.seasonNumber === SEASON_NUMBER);
          
          console.log(`\n✓ ${fighter.firstName} ${fighter.lastName}:`);
          console.log(`  - Total appearances: ${compHistory.numberOfSeasonAppearances}`);
          console.log(`  - Total record: ${compHistory.totalWins}W-${compHistory.totalLosses}L (${compHistory.totalFights} fights)`);
          console.log(`  - Overall win %: ${compHistory.winPercentage.toFixed(2)}%`);
          if (season7Detail) {
            console.log(`  - Season 7: ${season7Detail.wins}W-${season7Detail.losses}L, Division ${season7Detail.divisionNumber}, Position ${season7Detail.finalPosition}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 7 competition history has been imported to MongoDB!');
    console.log('\n📋 Summary:');
    console.log(`   - Fighters updated: ${updatedCount}`);
    console.log(`   - Total fights added: ${historyData.reduce((sum, f) => sum + f.fights, 0)}`);
    console.log(`   - Total wins added: ${historyData.reduce((sum, f) => sum + f.wins, 0)}`);
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
importCompetitionHistory();

