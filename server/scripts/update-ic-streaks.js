/**
 * Update IC Streaks for All Fighters
 * Processes all IC fights in chronological order and updates win/loss streaks
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
 * Get round number from fight identifier
 */
function getRoundNumber(fightIdentifier) {
  if (fightIdentifier.includes('-R1-')) return 1;
  if (fightIdentifier.includes('-SF-')) return 2;
  if (fightIdentifier.includes('-FN')) return 3;
  return 1;
}

/**
 * Sort fights in chronological order within a season
 */
function sortFights(fights) {
  return fights.sort((a, b) => {
    const roundA = getRoundNumber(a.fightIdentifier);
    const roundB = getRoundNumber(b.fightIdentifier);
    return roundA - roundB;
  });
}

/**
 * Process all IC fights and build streak data
 */
async function processICStreaks() {
  console.log('\n📥 Fetching IC seasons and fights...');
  
  const icSeasons = await Competition.find({
    competitionMetaId: IC_COMPETITION_META_ID,
    'seasonMeta.seasonNumber': { $in: IC_SEASONS }
  })
  .sort({ 'seasonMeta.seasonNumber': 1 })
  .lean();

  console.log(`✅ Found ${icSeasons.length} IC seasons`);

  // Build a chronological list of all fights with fighter results
  const allFights = [];

  for (const season of icSeasons) {
    const seasonNumber = season.seasonMeta.seasonNumber;
    const cupFights = season.cupData?.fights || [];
    const sortedFights = sortFights([...cupFights]);
    
    for (const fight of sortedFights) {
      const fighter1Id = fight.fighter1?.toString();
      const fighter2Id = fight.fighter2?.toString();
      const winnerId = fight.winner?.toString();
      
      if (!fighter1Id || !fighter2Id || !winnerId) continue;
      
      const roundNumber = getRoundNumber(fight.fightIdentifier);
      
      // Add result for fighter1
      allFights.push({
        fighterId: fighter1Id,
        opponentId: fighter2Id,
        season: seasonNumber,
        division: null,
        round: roundNumber,
        isWin: winnerId === fighter1Id,
        fightIdentifier: fight.fightIdentifier
      });
      
      // Add result for fighter2
      allFights.push({
        fighterId: fighter2Id,
        opponentId: fighter1Id,
        season: seasonNumber,
        division: null,
        round: roundNumber,
        isWin: winnerId === fighter2Id,
        fightIdentifier: fight.fightIdentifier
      });
    }
  }

  console.log(`📊 Processed ${allFights.length} fighter results from ${icSeasons.length} seasons`);

  // Group fights by fighter
  const fighterFights = new Map();
  for (const fight of allFights) {
    if (!fighterFights.has(fight.fighterId)) {
      fighterFights.set(fight.fighterId, []);
    }
    fighterFights.get(fight.fighterId).push(fight);
  }

  // Calculate streaks for each fighter
  const fighterStreaks = new Map();

  for (const [fighterId, fights] of fighterFights.entries()) {
    const streaks = calculateStreaks(fighterId, fights);
    fighterStreaks.set(fighterId, streaks);
  }

  return fighterStreaks;
}

/**
 * Calculate streaks from a fighter's chronological fight list
 */
function calculateStreaks(fighterId, fights) {
  // Sort fights chronologically by season and round
  const sortedFights = fights.sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    return a.round - b.round;
  });

  const streaks = [];
  let currentStreak = null;

  for (let i = 0; i < sortedFights.length; i++) {
    const fight = sortedFights[i];
    const streakType = fight.isWin ? 'win' : 'lose';

    if (!currentStreak || currentStreak.type !== streakType) {
      // Start a new streak
      if (currentStreak) {
        // Close the previous streak
        currentStreak.active = false;
        streaks.push(currentStreak);
      }

      currentStreak = {
        type: streakType,
        start: {
          season: fight.season,
          division: fight.division,
          round: fight.round
        },
        end: {
          season: fight.season,
          division: fight.division,
          round: fight.round
        },
        count: 1,
        opponents: [fight.opponentId],
        active: true
      };
    } else {
      // Continue the current streak
      currentStreak.end = {
        season: fight.season,
        division: fight.division,
        round: fight.round
      };
      currentStreak.count++;
      currentStreak.opponents.push(fight.opponentId);
    }
  }

  // Add the last streak
  if (currentStreak) {
    streaks.push(currentStreak);
  }

  return streaks;
}

/**
 * Update fighter's IC streaks
 */
async function updateFighterStreaks(fighterId, newStreaks) {
  const fighter = await Fighter.findById(fighterId);
  if (!fighter) {
    console.log(`  ⚠️  Fighter ${fighterId} not found`);
    return { updated: false, added: 0, existing: 0 };
  }

  let streaksAdded = 0;
  let existingStreaks = 0;

  for (const newStreak of newStreaks) {
    // Check if this IC streak already exists
    const existingStreak = fighter.streaks?.find(s => 
      s.competitionId?.toString() === IC_COMPETITION_META_ID &&
      s.type === newStreak.type &&
      s.start.season === newStreak.start.season &&
      s.start.round === newStreak.start.round &&
      s.end.season === newStreak.end.season &&
      s.end.round === newStreak.end.round
    );

    if (existingStreak) {
      existingStreaks++;
      continue;
    }

    // Add new streak
    if (!fighter.streaks) {
      fighter.streaks = [];
    }

    fighter.streaks.push({
      competitionId: new mongoose.Types.ObjectId(IC_COMPETITION_META_ID),
      type: newStreak.type,
      start: newStreak.start,
      end: newStreak.end,
      count: newStreak.count,
      active: newStreak.active,
      opponents: newStreak.opponents.map(id => new mongoose.Types.ObjectId(id))
    });

    streaksAdded++;
  }

  if (streaksAdded > 0) {
    await fighter.save();
  }

  return { updated: streaksAdded > 0, added: streaksAdded, existing: existingStreaks };
}

/**
 * Main function to update IC streaks
 */
async function updateICStreaks() {
  console.log('\n' + '='.repeat(70));
  console.log('🔥 UPDATING IC STREAKS');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Process all IC fights and calculate streaks
    const fighterStreaks = await processICStreaks();

    // Update each fighter's streaks
    console.log('\n🔄 Updating fighter streaks...\n');

    let updateCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let totalStreaksAdded = 0;
    let totalStreaksExisting = 0;

    for (const [fighterId, streaks] of fighterStreaks.entries()) {
      try {
        const fighter = await Fighter.findById(fighterId).lean();
        if (!fighter) {
          console.log(`  ⚠️  Fighter ${fighterId} not found`);
          errorCount++;
          continue;
        }

        const fighterName = `${fighter.firstName} ${fighter.lastName}`;
        const result = await updateFighterStreaks(fighterId, streaks);
        
        if (result.updated) {
          console.log(`  ✅ ${fighterName}: Added ${result.added} streak(s) (${result.existing} already exist)`);
          updateCount++;
          totalStreaksAdded += result.added;
          totalStreaksExisting += result.existing;
        } else {
          console.log(`  ℹ️  ${fighterName}: No new streaks (${result.existing} already exist)`);
          skipCount++;
          totalStreaksExisting += result.existing;
        }
      } catch (error) {
        console.error(`  ❌ Error updating fighter ${fighterId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Fighters with IC fights: ${fighterStreaks.size}`);
    console.log(`✅ Fighters updated: ${updateCount}`);
    console.log(`🆕 New streaks added: ${totalStreaksAdded}`);
    console.log(`ℹ️  Existing streaks: ${totalStreaksExisting}`);
    console.log(`⏭️  No changes needed: ${skipCount}`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    console.log('');

    // Create a log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logFilename = `ic-streaks-update-${timestamp}.log`;
    const logPath = path.join(__dirname, '../../backups', logFilename);
    
    let logContent = `IC STREAKS UPDATE LOG\n`;
    logContent += `${'='.repeat(70)}\n\n`;
    logContent += `Update Date: ${new Date().toISOString()}\n`;
    logContent += `Fighters Processed: ${fighterStreaks.size}\n`;
    logContent += `Fighters Updated: ${updateCount}\n`;
    logContent += `New Streaks Added: ${totalStreaksAdded}\n`;
    logContent += `Existing Streaks: ${totalStreaksExisting}\n`;
    logContent += `No Changes: ${skipCount}\n`;
    logContent += `Errors: ${errorCount}\n`;

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
updateICStreaks();

