/**
 * Update Invicta Cup Competition History for All Fighters
 * This script processes all IC seasons and updates each fighter's competitionHistory
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

// Constants
const IC_COMPETITION_META_ID = '6778103309a4c4b25127f8fc'; // Invicta Cup
const IC_SEASONS = [1, 2, 3, 4];

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
 * Determine final position based on fight identifier
 */
function getFinalPosition(fightIdentifier) {
  if (fightIdentifier.includes('-FN')) return 'Finals';
  if (fightIdentifier.includes('-SF-')) return 'Semifinals';
  if (fightIdentifier.includes('-R1-')) return 'Round 1';
  return 'Round 1'; // Default
}

/**
 * Process a single IC season
 */
async function processICSeason(season) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Processing IC Season ${season.seasonMeta.seasonNumber}`);
  console.log(`${'─'.repeat(70)}`);

  const seasonNumber = season.seasonMeta.seasonNumber;
  const cupFights = season.cupData?.fights || [];
  
  console.log(`  Fights in season: ${cupFights.length}`);

  // Build fighter stats for this season
  const fighterStats = new Map();

  // Initialize stats for all participants
  const participants = season.seasonMeta.cupParticipants?.fighters || [];
  participants.forEach(fighterId => {
    fighterStats.set(fighterId.toString(), {
      seasonNumber,
      divisionNumber: null,
      fights: 0,
      wins: 0,
      losses: 0,
      points: null,
      winPercentage: 0,
      finalCupPosition: 'Round 1', // Default, will be updated
      lastFightIdentifier: null
    });
  });

  // Process each fight
  for (const fight of cupFights) {
    const fighter1Id = fight.fighter1?.toString();
    const fighter2Id = fight.fighter2?.toString();
    const winnerId = fight.winner?.toString();

    if (!fighter1Id || !fighter2Id || !winnerId) continue;

    // Update fighter1
    if (fighterStats.has(fighter1Id)) {
      const stats = fighterStats.get(fighter1Id);
      stats.fights++;
      if (winnerId === fighter1Id) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.lastFightIdentifier = fight.fightIdentifier;
    }

    // Update fighter2
    if (fighterStats.has(fighter2Id)) {
      const stats = fighterStats.get(fighter2Id);
      stats.fights++;
      if (winnerId === fighter2Id) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.lastFightIdentifier = fight.fightIdentifier;
    }
  }

  // Calculate win percentages and determine final positions
  for (const [fighterId, stats] of fighterStats.entries()) {
    if (stats.fights > 0) {
      stats.winPercentage = (stats.wins / stats.fights) * 100;
      
      // Determine final position based on last fight
      if (stats.lastFightIdentifier) {
        const position = getFinalPosition(stats.lastFightIdentifier);
        stats.finalCupPosition = position;
        
        // If they won the finals, they're the champion
        if (position === 'Finals') {
          const finalFight = cupFights.find(f => f.fightIdentifier === stats.lastFightIdentifier);
          if (finalFight && finalFight.winner?.toString() === fighterId) {
            stats.finalCupPosition = 'Champion';
          }
        }
      }
    }
  }

  console.log(`  Processed stats for ${fighterStats.size} fighters`);
  
  return fighterStats;
}

/**
 * Main function to update IC competition history
 */
async function updateICCompetitionHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('🏆 UPDATING INVICTA CUP COMPETITION HISTORY');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Fetch all IC seasons
    console.log('\n📥 Fetching IC seasons from database...');
    const icSeasons = await Competition.find({
      competitionMetaId: IC_COMPETITION_META_ID,
      'seasonMeta.seasonNumber': { $in: IC_SEASONS }
    })
    .sort({ 'seasonMeta.seasonNumber': 1 })
    .lean();

    console.log(`✅ Found ${icSeasons.length} IC seasons`);

    if (icSeasons.length === 0) {
      console.log('❌ No IC seasons found. Exiting.');
      return;
    }

    // Process all seasons and collect fighter stats
    const allFighterSeasonStats = new Map(); // fighterId -> array of season stats

    for (const season of icSeasons) {
      const seasonStats = await processICSeason(season);
      
      for (const [fighterId, stats] of seasonStats.entries()) {
        if (!allFighterSeasonStats.has(fighterId)) {
          allFighterSeasonStats.set(fighterId, []);
        }
        allFighterSeasonStats.get(fighterId).push(stats);
      }
    }

    console.log(`\n📊 Total fighters with IC participation: ${allFighterSeasonStats.size}`);

    // Now update each fighter's competitionHistory
    console.log('\n🔄 Updating fighter competitionHistory...\n');

    let updateCount = 0;
    let errorCount = 0;

    for (const [fighterId, seasonDetailsArray] of allFighterSeasonStats.entries()) {
      try {
        // Calculate overall stats
        let totalFights = 0;
        let totalWins = 0;
        let totalLosses = 0;
        let numberOfSeasonAppearances = seasonDetailsArray.length;

        seasonDetailsArray.forEach(season => {
          totalFights += season.fights;
          totalWins += season.wins;
          totalLosses += season.losses;
        });

        const winPercentage = totalFights > 0 ? (totalWins / totalFights) * 100 : 0;

        // Check if fighter has IC competition history entry
        const fighter = await Fighter.findById(fighterId);
        if (!fighter) {
          console.log(`  ⚠️  Fighter ${fighterId} not found`);
          errorCount++;
          continue;
        }

        // Find existing IC competition history or create new
        const existingICHistory = fighter.competitionHistory?.find(
          ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
        );

        if (existingICHistory) {
          // Update existing IC history
          existingICHistory.numberOfSeasonAppearances = numberOfSeasonAppearances;
          existingICHistory.totalFights = totalFights;
          existingICHistory.totalWins = totalWins;
          existingICHistory.totalLosses = totalLosses;
          existingICHistory.winPercentage = winPercentage;
          existingICHistory.seasonDetails = seasonDetailsArray;
        } else {
          // Create new IC competition history entry
          if (!fighter.competitionHistory) {
            fighter.competitionHistory = [];
          }
          
          fighter.competitionHistory.push({
            competitionId: IC_COMPETITION_META_ID,
            numberOfSeasonAppearances,
            totalFights,
            totalWins,
            totalLosses,
            winPercentage,
            titles: {
              totalTitles: 0,
              details: []
            },
            seasonDetails: seasonDetailsArray
          });
        }

        // Save fighter
        await fighter.save();
        updateCount++;
        
        const fighterName = `${fighter.firstName} ${fighter.lastName}`;
        console.log(`  ✅ Updated ${fighterName}: ${numberOfSeasonAppearances} seasons, ${totalFights} fights, ${totalWins}W-${totalLosses}L`);

      } catch (error) {
        console.error(`  ❌ Error updating fighter ${fighterId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully updated: ${updateCount} fighters`);
    if (errorCount > 0) {
      console.log(`❌ Errors encountered: ${errorCount} fighters`);
    }
    console.log('');

    // Create a log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logFilename = `ic-competition-history-update-${timestamp}.log`;
    const logPath = path.join(__dirname, '../../backups', logFilename);
    
    let logContent = `IC COMPETITION HISTORY UPDATE LOG\n`;
    logContent += `${'='.repeat(70)}\n\n`;
    logContent += `Update Date: ${new Date().toISOString()}\n`;
    logContent += `IC Seasons Processed: ${icSeasons.length}\n`;
    logContent += `Fighters Updated: ${updateCount}\n`;
    logContent += `Errors: ${errorCount}\n\n`;
    logContent += `Seasons:\n`;
    icSeasons.forEach(s => {
      logContent += `  - IC Season ${s.seasonMeta.seasonNumber}\n`;
    });

    fs.writeFileSync(logPath, logContent);
    console.log(`📄 Log file created: ${logFilename}\n`);

  } catch (error) {
    console.error('\n❌ Update failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the update
updateICCompetitionHistory();

