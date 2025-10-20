/**
 * Update CC Opponent History for All Fighters
 * Processes all CC fights and updates opponentsHistory for both fighters in each match
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
const CC_COMPETITION_META_ID = '6778100309a4c4b25127f8fa'; // Champions Cup
const CC_SEASONS = [1, 2, 3, 4, 5];

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
 * Get round ID from fight identifier
 * CC-S2-R1-F1 -> R1 (Round 1)
 * CC-S2-SF-F1 -> SF (Semifinals)
 * CC-S2-FN -> FN (Finals)
 */
function getRoundIdFromIdentifier(fightIdentifier) {
  if (fightIdentifier.includes('-R1-')) return 1;
  if (fightIdentifier.includes('-SF-')) return 2; // Semifinals
  if (fightIdentifier.includes('-FN')) return 3; // Finals
  return null;
}

/**
 * Process all CC fights and build opponent history data
 */
async function processCCFights() {
  console.log('\n📥 Fetching CC seasons and fights...');
  
  const ccSeasons = await Competition.find({
    competitionMetaId: CC_COMPETITION_META_ID,
    'seasonMeta.seasonNumber': { $in: CC_SEASONS }
  })
  .sort({ 'seasonMeta.seasonNumber': 1 })
  .lean();

  console.log(`✅ Found ${ccSeasons.length} CC seasons`);

  // Map to store all fights by fighter pairs
  const opponentMatchups = new Map(); // key: fighterId, value: Map of opponentId -> fights array

  let totalFights = 0;

  for (const season of ccSeasons) {
    const seasonNumber = season.seasonMeta.seasonNumber;
    const cupFights = season.cupData?.fights || [];
    
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Processing CC Season ${seasonNumber}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  Fights: ${cupFights.length}`);

    for (const fight of cupFights) {
      const fighter1Id = fight.fighter1?.toString();
      const fighter2Id = fight.fighter2?.toString();
      const winnerId = fight.winner?.toString();
      const fightId = fight._id?.toString();

      if (!fighter1Id || !fighter2Id || !winnerId || !fightId) {
        console.log(`  ⚠️  Skipping incomplete fight: ${fight.fightIdentifier}`);
        continue;
      }

      totalFights++;
      const roundId = getRoundIdFromIdentifier(fight.fightIdentifier);

      // Create fight detail object
      const fightDetail = {
        competitionId: CC_COMPETITION_META_ID,
        season: seasonNumber,
        divisionId: null, // Cup competitions don't have divisions
        roundId: roundId,
        fightId: fightId
      };

      // Update fighter1's opponent history (vs fighter2)
      if (!opponentMatchups.has(fighter1Id)) {
        opponentMatchups.set(fighter1Id, new Map());
      }
      if (!opponentMatchups.get(fighter1Id).has(fighter2Id)) {
        opponentMatchups.get(fighter1Id).set(fighter2Id, []);
      }
      opponentMatchups.get(fighter1Id).get(fighter2Id).push({
        ...fightDetail,
        isWinner: winnerId === fighter1Id
      });

      // Update fighter2's opponent history (vs fighter1)
      if (!opponentMatchups.has(fighter2Id)) {
        opponentMatchups.set(fighter2Id, new Map());
      }
      if (!opponentMatchups.get(fighter2Id).has(fighter1Id)) {
        opponentMatchups.get(fighter2Id).set(fighter1Id, []);
      }
      opponentMatchups.get(fighter2Id).get(fighter1Id).push({
        ...fightDetail,
        isWinner: winnerId === fighter2Id
      });

      console.log(`  ✓ ${fight.fightIdentifier}: Recorded`);
    }
  }

  console.log(`\n📊 Processed ${totalFights} CC fights`);
  console.log(`📊 Fighters with CC fights: ${opponentMatchups.size}`);

  return opponentMatchups;
}

/**
 * Update fighter opponent history
 */
async function updateFighterOpponentHistory(fighterId, opponentData) {
  const fighter = await Fighter.findById(fighterId);
  if (!fighter) {
    console.log(`  ⚠️  Fighter ${fighterId} not found`);
    return false;
  }

  let updated = false;

  for (const [opponentId, fights] of opponentData.entries()) {
    // Find existing opponent history entry
    let opponentEntry = fighter.opponentsHistory?.find(
      oh => oh.opponentId.toString() === opponentId
    );

    // Calculate stats for this opponent
    const totalFights = fights.length;
    const totalWins = fights.filter(f => f.isWinner).length;
    const totalLosses = fights.filter(f => !f.isWinner).length;
    const winPercentage = totalFights > 0 ? (totalWins / totalFights) * 100 : 0;

    if (opponentEntry) {
      // Check if any CC fights are already recorded
      const existingCCFights = opponentEntry.details?.filter(
        d => d.competitionId.toString() === CC_COMPETITION_META_ID
      ) || [];

      // Add new CC fights that don't exist
      let newFightsAdded = 0;
      for (const fight of fights) {
        const exists = existingCCFights.some(
          ef => ef.season === fight.season && 
                ef.roundId === fight.roundId &&
                ef.fightId.toString() === fight.fightId
        );

        if (!exists) {
          if (!opponentEntry.details) {
            opponentEntry.details = [];
          }
          opponentEntry.details.push({
            competitionId: new mongoose.Types.ObjectId(fight.competitionId),
            season: fight.season,
            divisionId: fight.divisionId,
            roundId: fight.roundId,
            fightId: new mongoose.Types.ObjectId(fight.fightId),
            isWinner: fight.isWinner
          });
          newFightsAdded++;
          updated = true;
        }
      }

      // Update totals if we added new fights
      if (newFightsAdded > 0) {
        opponentEntry.totalFights = opponentEntry.details.length;
        opponentEntry.totalWins = opponentEntry.details.filter(d => d.isWinner).length;
        opponentEntry.totalLosses = opponentEntry.details.filter(d => !d.isWinner).length;
        opponentEntry.winPercentage = opponentEntry.totalFights > 0 
          ? (opponentEntry.totalWins / opponentEntry.totalFights) * 100 
          : 0;
      }
    } else {
      // Create new opponent history entry
      if (!fighter.opponentsHistory) {
        fighter.opponentsHistory = [];
      }

      fighter.opponentsHistory.push({
        opponentId: new mongoose.Types.ObjectId(opponentId),
        totalFights,
        totalWins,
        totalLosses,
        winPercentage,
        details: fights.map(f => ({
          competitionId: new mongoose.Types.ObjectId(f.competitionId),
          season: f.season,
          divisionId: f.divisionId,
          roundId: f.roundId,
          fightId: new mongoose.Types.ObjectId(f.fightId),
          isWinner: f.isWinner
        }))
      });
      updated = true;
    }
  }

  if (updated) {
    await fighter.save();
  }

  return updated;
}

/**
 * Main function to update CC opponent history
 */
async function updateCCOpponentHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('🥊 UPDATING CC OPPONENT HISTORY');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Process all CC fights
    const opponentMatchups = await processCCFights();

    // Update each fighter's opponent history
    console.log('\n🔄 Updating fighter opponent histories...\n');

    let updateCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const [fighterId, opponentData] of opponentMatchups.entries()) {
      try {
        const fighter = await Fighter.findById(fighterId).lean();
        if (!fighter) {
          console.log(`  ⚠️  Fighter ${fighterId} not found`);
          errorCount++;
          continue;
        }

        const fighterName = `${fighter.firstName} ${fighter.lastName}`;
        const updated = await updateFighterOpponentHistory(fighterId, opponentData);
        
        if (updated) {
          console.log(`  ✅ ${fighterName}: Updated (${opponentData.size} opponent(s))`);
          updateCount++;
        } else {
          console.log(`  ℹ️  ${fighterName}: No new CC fights to add`);
          skipCount++;
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
    console.log(`Fighters with CC fights: ${opponentMatchups.size}`);
    console.log(`✅ Updated: ${updateCount}`);
    console.log(`ℹ️  No changes needed: ${skipCount}`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    console.log('');

    // Create a log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logFilename = `cc-opponent-history-update-${timestamp}.log`;
    const logPath = path.join(__dirname, '../../backups', logFilename);
    
    let logContent = `CC OPPONENT HISTORY UPDATE LOG\n`;
    logContent += `${'='.repeat(70)}\n\n`;
    logContent += `Update Date: ${new Date().toISOString()}\n`;
    logContent += `Fighters Processed: ${opponentMatchups.size}\n`;
    logContent += `Updated: ${updateCount}\n`;
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
updateCCOpponentHistory();

