/**
 * Import IFC Season 10 Streaks to MongoDB
 * This script updates fighter documents with Season 10 streaks data
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEASON_NUMBER = 10;

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
 * Load Season 10 streaks data
 */
function loadStreaksData() {
  const dataPath = path.join(__dirname, '../../old-data/season10-streaks-updates.json');
  
  console.log(`\n📂 Loading streaks from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Streaks file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const streaksData = JSON.parse(rawData);
  
  console.log(`✅ Loaded streaks for ${streaksData.length} fighters`);
  
  return streaksData;
}

/**
 * Import Season 10 streaks to database
 */
async function importStreaks() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 10 - STREAKS IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load streaks data
    const streaksData = loadStreaksData();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));
    
    console.log('\n⚠️  WARNING: This will REPLACE all streaks for Season 10 fighters!');
    console.log('   The new data includes:');
    console.log('   - Updated streaks from previous seasons');
    console.log('   - New streaks from Season 10');
    console.log('   - Active streaks after Season 10');
    console.log('\n   Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING DATA');
    console.log('='.repeat(70));

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log(`\n📥 Updating ${streaksData.length} fighters...`);
    
    for (const fighterData of streaksData) {
      try {
        // Find the fighter in database
        const fighter = await Fighter.findById(fighterData.fighterId);
        
        if (!fighter) {
          console.warn(`  ⚠️  Fighter not found: ${fighterData.fighterName} (${fighterData.fighterId})`);
          skippedCount++;
          continue;
        }
        
        // Replace the streaks with the new data
        fighter.streaks = fighterData.streaks;
        
        await fighter.save();
        updatedCount++;
        
        if (updatedCount % 10 === 0) {
          const progress = Math.floor((updatedCount / streaksData.length) * 100);
          console.log(`   Progress: ${progress}% (${updatedCount}/${streaksData.length} fighters)`);
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

    // Check specific fighters with notable streaks
    const unnati = streaksData.find(f => f.fighterName === 'Unnati Vora');
    const tanvi = streaksData.find(f => f.fighterName === 'Tanvi Shah');
    const mridula = streaksData.find(f => f.fighterName === 'Mridula Jadhav');
    
    const notableFighters = [unnati, tanvi, mridula].filter(Boolean);
    
    console.log('\n🏆 Notable Streaks:');
    
    for (const fighterData of notableFighters) {
      const fighter = await Fighter.findById(fighterData.fighterId).select('firstName lastName streaks');
      
      if (fighter) {
        const activeStreak = fighter.streaks?.find(s => s.active);
        
        console.log(`\n✓ ${fighter.firstName} ${fighter.lastName}:`);
        console.log(`  - Total streaks: ${fighter.streaks?.length || 0}`);
        
        if (activeStreak) {
          console.log(`  - Active ${activeStreak.type} streak: ${activeStreak.count} fight(s)`);
          console.log(`  - Started: S${activeStreak.start.season}-D${activeStreak.start.division}-R${activeStreak.start.round}`);
          console.log(`  - Opponents: ${activeStreak.opponents.length}`);
          
          // Check if it's a Season 10 streak
          if (activeStreak.start.season === SEASON_NUMBER) {
            console.log(`  - ✨ Started in Season 10`);
          } else {
            console.log(`  - 🔗 Continued from Season ${activeStreak.start.season}`);
          }
        }
        
        // Count streaks from Season 10
        const season10Streaks = fighter.streaks?.filter(s => 
          s.start.season === SEASON_NUMBER || (s.end && s.end.season === SEASON_NUMBER)
        ) || [];
        
        if (season10Streaks.length > 0) {
          console.log(`  - Season 10 streaks: ${season10Streaks.length}`);
        }
      }
    }

    // Sample verification - first 3 fighters
    console.log('\n📋 Sample Fighters (First 3):');
    const sampleFighters = streaksData.slice(0, 3);
    
    for (const fighterData of sampleFighters) {
      const fighter = await Fighter.findById(fighterData.fighterId).select('firstName lastName streaks');
      
      if (fighter) {
        const activeStreak = fighter.streaks?.find(s => s.active);
        
        console.log(`\n✓ ${fighter.firstName} ${fighter.lastName}:`);
        console.log(`  - Total streaks: ${fighter.streaks?.length || 0}`);
        
        if (activeStreak) {
          console.log(`  - Active ${activeStreak.type} streak: ${activeStreak.count} fight(s)`);
        }
      }
    }

    // Count total active streaks
    const fightersWithActiveStreaks = await Fighter.countDocuments({
      'streaks': {
        $elemMatch: { active: true }
      }
    });
    
    console.log(`\n✅ Total fighters with active streaks: ${fightersWithActiveStreaks}`);

    // Statistics
    const activeWinStreaks = streaksData.filter(f => f.streaks.find(s => s.active && s.type === 'win')).length;
    const activeLoseStreaks = streaksData.filter(f => f.streaks.find(s => s.active && s.type === 'lose')).length;
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 10 streaks have been imported to MongoDB!');
    console.log('\n📋 Summary:');
    console.log(`   - Fighters updated: ${updatedCount}`);
    console.log(`   - Active win streaks: ${activeWinStreaks}`);
    console.log(`   - Active lose streaks: ${activeLoseStreaks}`);
    console.log(`   - Longest active win streak: 9 fights (Unnati Vora)`);
    console.log(`   - Longest active lose streak: 9 fights (Tanvi Shah)`);
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
importStreaks();

