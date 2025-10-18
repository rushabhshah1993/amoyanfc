/**
 * Import IFC Season 10 Opponent History to MongoDB
 * This script updates fighter documents with Season 10 opponent history data
 * It merges new data with existing opponent history
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
 * Load Season 10 opponent history data
 */
function loadOpponentHistoryData() {
  const dataPath = path.join(__dirname, '../../old-data/season10-opponent-history.json');
  
  console.log(`\n📂 Loading opponent history from: ${dataPath}`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Opponent history file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const historyData = JSON.parse(rawData);
  
  console.log(`✅ Loaded opponent history for ${historyData.length} fighters`);
  
  return historyData;
}

/**
 * Merge opponent history data
 * Combines existing opponent history with Season 10 data
 */
function mergeOpponentHistory(existingHistory, season10History) {
  if (!existingHistory || existingHistory.length === 0) {
    // No existing history, return Season 10 history as-is
    return season10History;
  }
  
  // Create a map of existing opponent history for quick lookup
  const existingMap = new Map();
  existingHistory.forEach(opp => {
    existingMap.set(opp.opponentId.toString(), opp);
  });
  
  // Merge Season 10 data
  season10History.forEach(season10Opp => {
    const opponentIdStr = season10Opp.opponentId.toString();
    
    if (existingMap.has(opponentIdStr)) {
      // Opponent exists, merge data
      const existing = existingMap.get(opponentIdStr);
      existing.totalFights += season10Opp.totalFights;
      existing.totalWins += season10Opp.totalWins;
      existing.totalLosses += season10Opp.totalLosses;
      existing.winPercentage = Math.round((existing.totalWins / existing.totalFights) * 100);
      
      // Add Season 10 details
      existing.details = existing.details || [];
      existing.details.push(...season10Opp.details);
    } else {
      // New opponent, add to map
      existingMap.set(opponentIdStr, {
        opponentId: season10Opp.opponentId,
        totalFights: season10Opp.totalFights,
        totalWins: season10Opp.totalWins,
        totalLosses: season10Opp.totalLosses,
        winPercentage: season10Opp.winPercentage,
        details: season10Opp.details
      });
    }
  });
  
  // Convert map back to array
  return Array.from(existingMap.values());
}

/**
 * Import Season 10 opponent history to database
 */
async function importOpponentHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('IFC SEASON 10 - OPPONENT HISTORY IMPORT TO MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load opponent history data
    const historyData = loadOpponentHistoryData();

    console.log('\n' + '='.repeat(70));
    console.log('IMPORT OPTIONS');
    console.log('='.repeat(70));
    
    console.log('\nThis script will UPDATE fighter documents with Season 10 opponent history.');
    console.log('Existing opponent history will be MERGED with Season 10 data.');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

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
        
        // Merge opponent history
        const mergedHistory = mergeOpponentHistory(
          fighter.opponentsHistory,
          fighterData.opponentsHistory
        );
        
        // Update fighter
        fighter.opponentsHistory = mergedHistory;
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

    // Sample verification - check a few fighters
    const sampleFighters = historyData.slice(0, 3);
    
    for (const fighterData of sampleFighters) {
      const fighter = await Fighter.findById(fighterData.fighterId);
      if (fighter) {
        console.log(`\n✓ ${fighter.firstName} ${fighter.lastName}:`);
        console.log(`  - Total opponents in history: ${fighter.opponentsHistory?.length || 0}`);
        
        if (fighter.opponentsHistory && fighter.opponentsHistory.length > 0) {
          const sample = fighter.opponentsHistory[0];
          console.log(`  - Sample opponent:`);
          console.log(`    Total fights: ${sample.totalFights}`);
          console.log(`    Record: ${sample.totalWins}W-${sample.totalLosses}L (${sample.winPercentage}%)`);
          console.log(`    Details count: ${sample.details?.length || 0}`);
          
          // Check for Season 10 data
          const season10Details = sample.details?.filter(d => d.season === 10);
          if (season10Details && season10Details.length > 0) {
            console.log(`    Season 10 fights: ${season10Details.length}`);
            console.log(`    Sample Fight ID: ${season10Details[0].fightId}`);
          }
        }
      }
    }

    // Count fighters with Season 10 data
    const fightersWithSeason10 = await Fighter.countDocuments({
      'opponentsHistory.details': {
        $elemMatch: {
          season: 10
        }
      }
    });
    
    console.log(`\n📊 Database Statistics:`);
    console.log(`  - Fighters with Season 10 opponent history: ${fightersWithSeason10}`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ IMPORT SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\nSeason 10 opponent history has been imported to MongoDB!');
    console.log('\n📋 Summary:');
    console.log(`   - Fighters updated: ${updatedCount}`);
    console.log(`   - Opponent relationships: ${historyData.reduce((sum, f) => sum + f.totalOpponents, 0)}`);
    console.log(`   - Fight records added: ${historyData.reduce((sum, f) => sum + f.opponentsHistory.reduce((s, o) => s + o.totalFights, 0), 0)}`);
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
importOpponentHistory();

