/**
 * Update Season 10 Titles for Division Champions
 * This script updates the titles for the three division champions of Season 10
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_10_COMPETITION_ID = '68f38270761a2d83b46c03e1'; // Season 10 document ID
const SEASON_NUMBER = 10;

// Season 10 Champions
const CHAMPIONS = [
  {
    name: 'Unnati Vora',
    fighterId: '676d7613eb38b2b97c6da9a9',
    fighterCode: 'F034',
    divisionNumber: 1,
    record: '9-0',
    achievement: 'Perfect Season'
  },
  {
    name: 'Krishi Punamiya',
    fighterId: '676d740ceb38b2b97c6da97b',
    fighterCode: 'F018',
    divisionNumber: 2,
    record: '9-2',
    achievement: 'Division 2 Champion'
  },
  {
    name: 'Drishti Valecha',
    fighterId: '676d7201eb38b2b97c6da95f',
    fighterCode: 'F009',
    divisionNumber: 3,
    record: '13-2',
    achievement: 'Division 3 Champion'
  }
];

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
 * Update titles for Season 10 champions
 */
async function updateSeason10Titles() {
  console.log('\n' + '='.repeat(70));
  console.log('UPDATE SEASON 10 TITLES - DIVISION CHAMPIONS');
  console.log('='.repeat(70));
  
  try {
    await connectDB();
    
    console.log('\n📋 Season 10 Champions:');
    CHAMPIONS.forEach((champion, index) => {
      console.log(`   ${index + 1}. ${champion.name} (${champion.fighterCode}) - Division ${champion.divisionNumber}`);
      console.log(`      Record: ${champion.record} - ${champion.achievement}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('UPDATING TITLES');
    console.log('='.repeat(70));
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const champion of CHAMPIONS) {
      try {
        console.log(`\n🔄 Processing ${champion.name}...`);
        
        // Find the fighter
        const fighter = await Fighter.findById(champion.fighterId);
        
        if (!fighter) {
          console.error(`  ❌ Fighter not found: ${champion.name}`);
          errorCount++;
          continue;
        }
        
        // Find the IFC competition history entry
        let competitionEntry = fighter.competitionHistory?.find(
          ch => ch.competitionId.toString() === COMPETITION_ID
        );
        
        if (!competitionEntry) {
          console.error(`  ❌ No IFC competition history found for ${champion.name}`);
          errorCount++;
          continue;
        }
        
        // Check if titles object exists
        if (!competitionEntry.titles) {
          competitionEntry.titles = {
            totalTitles: 0,
            details: []
          };
        }
        
        // Check if Season 10 title already exists
        const existingTitle = competitionEntry.titles.details?.find(
          t => t.seasonNumber === SEASON_NUMBER && t.divisionNumber === champion.divisionNumber
        );
        
        if (existingTitle) {
          console.log(`  ⚠️  Season 10 Division ${champion.divisionNumber} title already exists`);
          console.log(`     Skipping update for ${champion.name}`);
          skippedCount++;
          continue;
        }
        
        // Add the new title
        competitionEntry.titles.totalTitles = (competitionEntry.titles.totalTitles || 0) + 1;
        
        if (!competitionEntry.titles.details) {
          competitionEntry.titles.details = [];
        }
        
        competitionEntry.titles.details.push({
          competitionSeasonId: mongoose.Types.ObjectId.createFromHexString(SEASON_10_COMPETITION_ID),
          seasonNumber: SEASON_NUMBER,
          divisionNumber: champion.divisionNumber
        });
        
        // Save the fighter
        await fighter.save();
        
        console.log(`  ✅ Title added successfully!`);
        console.log(`     Total IFC titles: ${competitionEntry.titles.totalTitles}`);
        console.log(`     Season 10 Division ${champion.divisionNumber} Champion`);
        
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Error updating ${champion.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Updated: ${updatedCount} fighters`);
    console.log(`⚠️  Skipped: ${skippedCount} fighters`);
    console.log(`❌ Errors: ${errorCount} fighters`);
    
    // Verify the updates
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));
    
    for (const champion of CHAMPIONS) {
      try {
        const fighter = await Fighter.findById(champion.fighterId).select('firstName lastName competitionHistory');
        
        if (fighter) {
          const competitionEntry = fighter.competitionHistory?.find(
            ch => ch.competitionId.toString() === COMPETITION_ID
          );
          
          if (competitionEntry && competitionEntry.titles) {
            console.log(`\n✓ ${fighter.firstName} ${fighter.lastName}:`);
            console.log(`  - Total IFC titles: ${competitionEntry.titles.totalTitles}`);
            console.log(`  - Title details count: ${competitionEntry.titles.details?.length || 0}`);
            
            // Find Season 10 title
            const season10Title = competitionEntry.titles.details?.find(
              t => t.seasonNumber === SEASON_NUMBER
            );
            
            if (season10Title) {
              console.log(`  - Season 10 Division ${season10Title.divisionNumber} Champion ✓`);
            } else {
              console.log(`  - ⚠️  Season 10 title NOT found`);
            }
          } else {
            console.log(`\n⚠️  ${fighter.firstName} ${fighter.lastName}: No titles data`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error verifying ${champion.name}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ TITLES UPDATE COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 10 champions have been awarded their division titles!');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the script
updateSeason10Titles()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

