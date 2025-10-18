/**
 * Fix Fight Identifiers - Add IFC- Prefix
 * This script updates fight identifiers for Seasons 5, 6, 7, and 8
 * to include the "IFC-" prefix
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models (CompetitionMeta must be imported first for pre-save hooks)
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
 * Fix fight identifiers for a specific season
 */
async function fixSeasonFightIdentifiers(seasonNumber) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FIXING SEASON ${seasonNumber} FIGHT IDENTIFIERS`);
  console.log('='.repeat(70));

  try {
    // Find the season
    const season = await Competition.findOne({
      'seasonMeta.seasonNumber': seasonNumber
    });

    if (!season) {
      console.log(`❌ Season ${seasonNumber} not found in database`);
      return { success: false, updated: 0 };
    }

    console.log(`✅ Found Season ${seasonNumber} (ID: ${season._id})`);

    let totalUpdates = 0;
    let alreadyCorrect = 0;

    // Iterate through divisions
    for (const division of season.leagueData.divisions) {
      console.log(`\n📊 Processing Division ${division.divisionNumber}...`);
      
      for (const round of division.rounds) {
        for (const fight of round.fights) {
          // Check if identifier already has IFC- prefix
          if (fight.fightIdentifier.startsWith('IFC-')) {
            alreadyCorrect++;
            continue;
          }

          // Add IFC- prefix
          fight.fightIdentifier = `IFC-${fight.fightIdentifier}`;
          totalUpdates++;
        }
      }

      const divisionFights = division.rounds.reduce((sum, r) => sum + r.fights.length, 0);
      console.log(`   ✓ Division ${division.divisionNumber}: ${divisionFights} fights processed`);
    }

    if (totalUpdates > 0) {
      // Save the updated season
      await season.save();
      console.log(`\n✅ Updated ${totalUpdates} fight identifiers for Season ${seasonNumber}`);
    } else {
      console.log(`\n✅ All fight identifiers already have IFC- prefix (${alreadyCorrect} fights)`);
    }

    return { success: true, updated: totalUpdates, alreadyCorrect };

  } catch (error) {
    console.error(`\n❌ Error fixing Season ${seasonNumber}:`, error.message);
    return { success: false, updated: 0, error: error.message };
  }
}

/**
 * Verify fight identifiers for a season
 */
async function verifySeasonFightIdentifiers(seasonNumber) {
  const season = await Competition.findOne({
    'seasonMeta.seasonNumber': seasonNumber
  });

  if (!season) {
    console.log(`❌ Season ${seasonNumber} not found`);
    return;
  }

  console.log(`\n📋 Verification for Season ${seasonNumber}:`);
  
  let totalFights = 0;
  let correctFormat = 0;
  let incorrectFormat = 0;
  const samples = [];

  for (const division of season.leagueData.divisions) {
    for (const round of division.rounds) {
      for (const fight of round.fights) {
        totalFights++;
        
        if (fight.fightIdentifier.startsWith('IFC-')) {
          correctFormat++;
          if (samples.length < 3) {
            samples.push(fight.fightIdentifier);
          }
        } else {
          incorrectFormat++;
          if (samples.length < 3) {
            samples.push(`❌ ${fight.fightIdentifier}`);
          }
        }
      }
    }
  }

  console.log(`   Total Fights: ${totalFights}`);
  console.log(`   Correct Format (IFC-): ${correctFormat}`);
  console.log(`   Incorrect Format: ${incorrectFormat}`);
  console.log(`   Sample IDs: ${samples.join(', ')}`);

  return { totalFights, correctFormat, incorrectFormat };
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('FIX FIGHT IDENTIFIERS - ADD IFC- PREFIX');
  console.log('Seasons: 5, 6, 7, 8');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    const seasonsToFix = [5, 6, 7, 8];
    const results = {};

    // Check current state before fixing
    console.log('\n' + '='.repeat(70));
    console.log('CURRENT STATE - BEFORE FIX');
    console.log('='.repeat(70));
    
    for (const seasonNum of seasonsToFix) {
      await verifySeasonFightIdentifiers(seasonNum);
    }

    // Ask for confirmation (wait 3 seconds)
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  READY TO UPDATE FIGHT IDENTIFIERS');
    console.log('='.repeat(70));
    console.log('This will add "IFC-" prefix to all fight identifiers.');
    console.log('Press Ctrl+C within 3 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Fix each season
    console.log('\n' + '='.repeat(70));
    console.log('APPLYING FIXES');
    console.log('='.repeat(70));

    for (const seasonNum of seasonsToFix) {
      const result = await fixSeasonFightIdentifiers(seasonNum);
      results[`Season ${seasonNum}`] = result;
    }

    // Verify after fixing
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION - AFTER FIX');
    console.log('='.repeat(70));
    
    for (const seasonNum of seasonsToFix) {
      await verifySeasonFightIdentifiers(seasonNum);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✨ FIX COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    
    let totalUpdated = 0;
    for (const [season, result] of Object.entries(results)) {
      console.log(`\n${season}:`);
      console.log(`   ✓ Updated: ${result.updated} fights`);
      console.log(`   ✓ Already Correct: ${result.alreadyCorrect || 0} fights`);
      totalUpdated += result.updated;
    }

    console.log(`\n🎉 Total fight identifiers updated: ${totalUpdated}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the script
main();

