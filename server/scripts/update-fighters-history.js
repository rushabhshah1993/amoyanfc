/**
 * Update Fighters' History Based on Fight Results
 * 
 * This script traverses through all fights in all seasons and updates:
 * 1. opponentsHistory - Track fights against each opponent
 * 2. competitionHistory - Track overall competition statistics
 * 
 * Run this after importing all season data to MongoDB.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Competition Meta ID (IFC)
const IFC_COMPETITION_META_ID = '67780dcc09a4c4b25127f8f6';

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
 * Update opponent history for a fighter
 */
function updateOpponentsHistory(fighter, opponentId, competitionId, season, division, round, fightId, isWinner) {
  // Find existing opponent record index
  let opponentRecordIndex = fighter.opponentsHistory.findIndex(
    oh => oh.opponentId.toString() === opponentId.toString()
  );

  if (opponentRecordIndex === -1) {
    // Create new opponent record
    fighter.opponentsHistory.push({
      opponentId: opponentId,
      totalFights: 0,
      totalWins: 0,
      totalLosses: 0,
      winPercentage: 0,
      details: []
    });
    opponentRecordIndex = fighter.opponentsHistory.length - 1;
  }

  // Work with the actual record in the array
  const opponentRecord = fighter.opponentsHistory[opponentRecordIndex];

  // Add fight details
  opponentRecord.details.push({
    competitionId: competitionId,
    season: season,
    divisionId: division,
    roundId: round,
    fightId: fightId,
    isWinner: isWinner
  });

  // Update totals
  opponentRecord.totalFights++;
  if (isWinner) {
    opponentRecord.totalWins++;
  } else {
    opponentRecord.totalLosses++;
  }

  // Calculate win percentage
  opponentRecord.winPercentage = (opponentRecord.totalWins / opponentRecord.totalFights) * 100;
}

/**
 * Update competition history for a fighter
 */
function updateCompetitionHistory(fighter, competitionId, season, isWinner) {
  // Find existing competition record index
  let competitionRecordIndex = fighter.competitionHistory.findIndex(
    ch => ch.competitionId.toString() === competitionId.toString()
  );

  if (competitionRecordIndex === -1) {
    // Create new competition record
    fighter.competitionHistory.push({
      competitionId: competitionId,
      numberOfSeasonAppearances: 0,
      totalFights: 0,
      totalWins: 0,
      totalLosses: 0,
      winPercentage: 0,
      titles: {
        totalTitles: 0,
        details: []
      }
    });
    competitionRecordIndex = fighter.competitionHistory.length - 1;
  }

  // Work with the actual record in the array
  const competitionRecord = fighter.competitionHistory[competitionRecordIndex];

  // Track which seasons this fighter has appeared in
  // We'll count unique seasons at the end
  if (!competitionRecord._seasonsAppeared) {
    competitionRecord._seasonsAppeared = new Set();
  }
  competitionRecord._seasonsAppeared.add(season);

  // Update totals
  competitionRecord.totalFights++;
  if (isWinner) {
    competitionRecord.totalWins++;
  } else {
    competitionRecord.totalLosses++;
  }

  // Calculate win percentage
  competitionRecord.winPercentage = (competitionRecord.totalWins / competitionRecord.totalFights) * 100;
}

/**
 * Process a single fight and update both fighters' history
 */
async function processFight(fight, season, division, round, fightersCache) {
  const winnerId = fight.winner.toString();
  const fighter1Id = fight.fighter1.toString();
  const fighter2Id = fight.fighter2.toString();
  const fightId = fight._id;

  // Determine winner and loser
  const loserId = winnerId === fighter1Id ? fighter2Id : fighter1Id;

  // Get or fetch fighters
  if (!fightersCache[winnerId]) {
    fightersCache[winnerId] = await Fighter.findById(winnerId);
  }
  if (!fightersCache[loserId]) {
    fightersCache[loserId] = await Fighter.findById(loserId);
  }

  const winner = fightersCache[winnerId];
  const loser = fightersCache[loserId];

  if (!winner || !loser) {
    console.warn(`⚠️  Missing fighter(s) for fight ${fight.fightIdentifier}`);
    return { updated: false };
  }

  // Update winner's history
  updateOpponentsHistory(
    winner,
    loserId,
    IFC_COMPETITION_META_ID,
    season,
    division,
    round,
    fightId,
    true
  );
  updateCompetitionHistory(winner, IFC_COMPETITION_META_ID, season, true);

  // Update loser's history
  updateOpponentsHistory(
    loser,
    winnerId,
    IFC_COMPETITION_META_ID,
    season,
    division,
    round,
    fightId,
    false
  );
  updateCompetitionHistory(loser, IFC_COMPETITION_META_ID, season, false);

  return { updated: true, winner, loser };
}

/**
 * Main function to update all fighters' history
 */
async function updateFightersHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('UPDATE FIGHTERS HISTORY FROM ALL FIGHTS');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Step 1: Reset all fighters' history (start fresh)
    console.log('\n📝 Resetting all fighters\' history...');
    const resetResult = await Fighter.updateMany(
      {},
      {
        $set: {
          opponentsHistory: [],
          competitionHistory: []
        }
      }
    );
    console.log(`✅ Reset ${resetResult.modifiedCount} fighters\n`);

    // Step 2: Fetch all seasons
    console.log('📥 Fetching all seasons from MongoDB...');
    const seasons = await Competition.find({
      competitionMetaId: IFC_COMPETITION_META_ID,
      'seasonMeta.seasonNumber': { $in: [1, 2, 3] }
    }).sort({ 'seasonMeta.seasonNumber': 1 });

    console.log(`✅ Found ${seasons.length} seasons\n`);

    // Step 3: Process each season
    let totalFightsProcessed = 0;
    let totalUpdates = 0;
    const fightersCache = {}; // Cache fighters to reduce DB queries

    for (const season of seasons) {
      const seasonNumber = season.seasonMeta.seasonNumber;
      console.log('='.repeat(70));
      console.log(`PROCESSING SEASON ${seasonNumber}`);
      console.log('='.repeat(70));

      // Process each division
      for (const division of season.leagueData.divisions) {
        const divisionNumber = division.divisionNumber;
        console.log(`\n📊 Division ${divisionNumber}:`);

        // Process each round
        for (const round of division.rounds) {
          const roundNumber = round.roundNumber;
          console.log(`  Round ${roundNumber}: ${round.fights.length} fights`, { split: false });

          // Process each fight
          for (const fight of round.fights) {
            const result = await processFight(
              fight,
              seasonNumber,
              divisionNumber,
              roundNumber,
              fightersCache
            );

            if (result.updated) {
              totalFightsProcessed++;
              totalUpdates += 2; // Winner + Loser
            }
          }
        }

        console.log(`  ✅ Completed ${division.rounds.length} rounds\n`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('SAVING UPDATES TO DATABASE');
    console.log('='.repeat(70));

    // Step 4: Finalize and save all fighters
    const fighterIds = Object.keys(fightersCache);
    let savedCount = 0;

    for (const fighterId of fighterIds) {
      const fighter = fightersCache[fighterId];

      // Convert arrays to plain objects and reassign (ensures Mongoose tracks changes)
      const plainOpponentsHistory = fighter.opponentsHistory.map(oh => {
        return {
          opponentId: oh.opponentId,
          totalFights: oh.totalFights,
          totalWins: oh.totalWins,
          totalLosses: oh.totalLosses,
          winPercentage: oh.winPercentage,
          details: oh.details.map(d => ({
            competitionId: d.competitionId,
            season: d.season,
            divisionId: d.divisionId,
            roundId: d.roundId,
            fightId: d.fightId,
            isWinner: d.isWinner
          }))
        };
      });

      const plainCompetitionHistory = fighter.competitionHistory.map(ch => {
        const seasonAppearances = ch._seasonsAppeared ? ch._seasonsAppeared.size : ch.numberOfSeasonAppearances;
        return {
          competitionId: ch.competitionId,
          numberOfSeasonAppearances: seasonAppearances,
          totalFights: ch.totalFights,
          totalWins: ch.totalWins,
          totalLosses: ch.totalLosses,
          winPercentage: ch.winPercentage,
          titles: ch.titles || { totalTitles: 0, details: [] }
        };
      });

      // Reassign the arrays
      fighter.opponentsHistory = plainOpponentsHistory;
      fighter.competitionHistory = plainCompetitionHistory;

      // Save fighter
      await fighter.save();
      savedCount++;

      if (savedCount % 5 === 0) {
        console.log(`  Saved ${savedCount}/${fighterIds.length} fighters...`);
      }
    }

    console.log(`✅ Saved all ${savedCount} fighters\n`);

    // Step 5: Verification
    console.log('='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    // Get some statistics
    const fightersWithHistory = await Fighter.countDocuments({
      'opponentsHistory.0': { $exists: true }
    });

    const fightersWithCompetitionHistory = await Fighter.countDocuments({
      'competitionHistory.0': { $exists: true }
    });

    console.log(`\n✅ Fighters with opponents history: ${fightersWithHistory}`);
    console.log(`✅ Fighters with competition history: ${fightersWithCompetitionHistory}`);
    console.log(`✅ Total fights processed: ${totalFightsProcessed}`);
    console.log(`✅ Total fighter updates: ${totalUpdates}\n`);

    // Show sample data
    console.log('='.repeat(70));
    console.log('SAMPLE FIGHTER DATA');
    console.log('='.repeat(70));

    const sampleFighter = await Fighter.findOne({
      'opponentsHistory.0': { $exists: true }
    });

    if (sampleFighter) {
      console.log(`\n👤 Fighter: ${sampleFighter.firstName} ${sampleFighter.lastName}`);
      console.log(`   ID: ${sampleFighter._id}`);
      
      console.log(`\n   Competition History:`);
      sampleFighter.competitionHistory.forEach(ch => {
        console.log(`     - Competition: ${ch.competitionId}`);
        console.log(`       Season Appearances: ${ch.numberOfSeasonAppearances}`);
        console.log(`       Total Fights: ${ch.totalFights}`);
        console.log(`       Record: ${ch.totalWins}W-${ch.totalLosses}L`);
        console.log(`       Win %: ${ch.winPercentage.toFixed(1)}%`);
      });

      console.log(`\n   Opponents History (showing first 3):`);
      sampleFighter.opponentsHistory.slice(0, 3).forEach(oh => {
        console.log(`     - Opponent: ${oh.opponentId}`);
        console.log(`       Total Fights: ${oh.totalFights}`);
        console.log(`       Record: ${oh.totalWins}W-${oh.totalLosses}L`);
        console.log(`       Win %: ${oh.winPercentage.toFixed(1)}%`);
        console.log(`       Fight Details: ${oh.details.length} fights`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ UPDATE COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nAll fighters\' history has been updated based on fight results.');
    console.log('You can now query fighters with their updated:');
    console.log('  - opponentsHistory');
    console.log('  - competitionHistory\n');

  } catch (error) {
    console.error('\n❌ Update failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the update
updateFightersHistory();

