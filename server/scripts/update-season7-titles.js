/**
 * Update Season 7 Championship Titles
 * This script adds championship titles to the three Season 7 division winners
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEASON_NUMBER = 7;
const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';

// Season 7 Division Winners
const SEASON_7_WINNERS = {
  1: { name: 'Sayali Raut', firstName: 'Sayali', lastName: 'Raut' },
  2: { name: 'Mhafrin Basta', firstName: 'Mhafrin', lastName: 'Basta' },
  3: { name: 'Sachi Maker-Biyani', firstName: 'Sachi', lastName: 'Maker-Biyani' }
};

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
 * Get Season 7 competition document ID
 */
async function getSeason7CompetitionDocId() {
  const competition = await Competition.findOne({
    'seasonMeta.seasonNumber': SEASON_NUMBER
  }).select('_id');
  
  return competition ? competition._id : null;
}

/**
 * Update titles for Season 7 winners
 */
async function updateSeason7Titles() {
  console.log('\n' + '='.repeat(70));
  console.log('SEASON 7 CHAMPIONSHIP TITLES UPDATE');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Get Season 7 competition document ID
    console.log('\n📂 Loading Season 7 competition...');
    const season7CompDocId = await getSeason7CompetitionDocId();
    
    if (!season7CompDocId) {
      console.error('❌ Season 7 competition not found in database!');
      return;
    }
    
    console.log(`✅ Found Season 7 competition document: ${season7CompDocId}`);

    console.log('\n' + '='.repeat(70));
    console.log('UPDATING WINNERS');
    console.log('='.repeat(70));

    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];

    // Process each division winner
    for (const [divisionNumber, winnerInfo] of Object.entries(SEASON_7_WINNERS)) {
      console.log(`\n📍 Processing Division ${divisionNumber} Winner: ${winnerInfo.name}`);
      
      try {
        // Find the fighter
        const fighter = await Fighter.findOne({
          firstName: winnerInfo.firstName,
          lastName: winnerInfo.lastName
        });
        
        if (!fighter) {
          console.error(`  ❌ Fighter not found: ${winnerInfo.name}`);
          skippedCount++;
          continue;
        }
        
        console.log(`  ✓ Found fighter: ${fighter.firstName} ${fighter.lastName} (${fighter._id})`);
        
        // Get fighter's competition history for IFC
        const competitionHistory = fighter.competitionHistory?.find(
          ch => ch.competitionId.toString() === COMPETITION_ID
        );
        
        if (!competitionHistory) {
          console.warn(`  ⚠️  No IFC competition history found for ${winnerInfo.name}`);
          skippedCount++;
          continue;
        }
        
        // Check if titles object exists
        if (!competitionHistory.titles) {
          competitionHistory.titles = {
            totalTitles: 0,
            details: []
          };
        }
        
        // Check if Season 7 title already exists
        const existingTitle = competitionHistory.titles.details.find(
          title => title.seasonNumber === SEASON_NUMBER && title.divisionNumber === parseInt(divisionNumber)
        );
        
        if (existingTitle) {
          console.log(`  ℹ️  Season 7 Division ${divisionNumber} title already exists`);
          console.log(`     Skipping (title already awarded)`);
          skippedCount++;
          continue;
        }
        
        // Add the new title
        const newTitle = {
          competitionSeasonId: season7CompDocId,
          seasonNumber: SEASON_NUMBER,
          divisionNumber: parseInt(divisionNumber)
        };
        
        competitionHistory.titles.details.push(newTitle);
        competitionHistory.titles.totalTitles = competitionHistory.titles.details.length;
        
        // Save the fighter
        await fighter.save();
        
        console.log(`  ✅ Added Season 7 Division ${divisionNumber} championship title`);
        console.log(`     Total titles: ${competitionHistory.titles.totalTitles}`);
        
        updatedCount++;
        updates.push({
          fighter: winnerInfo.name,
          division: divisionNumber,
          totalTitles: competitionHistory.titles.totalTitles
        });
        
      } catch (error) {
        console.error(`  ❌ Error updating ${winnerInfo.name}:`, error.message);
        skippedCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('UPDATE SUMMARY');
    console.log('='.repeat(70));
    
    if (updates.length > 0) {
      console.log('\n✅ Successfully Updated Fighters:');
      updates.forEach(update => {
        console.log(`   🏆 ${update.fighter} - Division ${update.division} Champion`);
        console.log(`      Total Career Titles: ${update.totalTitles}`);
      });
    }
    
    console.log(`\n📊 Statistics:`);
    console.log(`   - Titles added: ${updatedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Total processed: ${Object.keys(SEASON_7_WINNERS).length}`);

    // Verification
    if (updatedCount > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('VERIFICATION');
      console.log('='.repeat(70));
      
      for (const [divisionNumber, winnerInfo] of Object.entries(SEASON_7_WINNERS)) {
        const fighter = await Fighter.findOne({
          firstName: winnerInfo.firstName,
          lastName: winnerInfo.lastName
        }).select('firstName lastName competitionHistory');
        
        if (fighter) {
          const compHistory = fighter.competitionHistory?.find(
            ch => ch.competitionId.toString() === COMPETITION_ID
          );
          
          if (compHistory && compHistory.titles) {
            const season7Title = compHistory.titles.details.find(
              t => t.seasonNumber === SEASON_NUMBER
            );
            
            if (season7Title) {
              console.log(`\n✓ ${fighter.firstName} ${fighter.lastName}:`);
              console.log(`  - Division ${season7Title.divisionNumber} Champion (Season ${season7Title.seasonNumber})`);
              console.log(`  - Total Titles: ${compHistory.titles.totalTitles}`);
              console.log(`  - All Titles: ${compHistory.titles.details.map(t => `S${t.seasonNumber}-D${t.divisionNumber}`).join(', ')}`);
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ UPDATE COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\n🏆 Season 7 championship titles have been awarded!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Update failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the update
updateSeason7Titles();

