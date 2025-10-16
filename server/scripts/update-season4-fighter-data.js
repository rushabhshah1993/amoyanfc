/**
 * Update Season 4 Fighter Data
 * This script processes all fights in Season 4 and updates:
 * 1. Streaks (win/lose streaks with opponents)
 * 2. OpponentHistory (fight records against each opponent)
 * 3. CompetitionHistory (overall competition statistics)
 * 
 * Season 4 has 3 divisions, so we need to handle multiple divisions.
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
const IFC_COMPETITION_META_ID = '67780dcc09a4c4b25127f8f6';
const SEASON_NUMBER = 4;

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
 * Update streaks for a fighter using fighterMap approach
 */
function updateStreaks(fighterData, opponentId, fightContext, competitionId, isWinner) {
  if (isWinner) {
    // Update winner's streak
    if (fighterData.activeWinStreak !== null) {
      // Extend existing win streak
      const winStreak = fighterData.streaks[fighterData.activeWinStreak];
      winStreak.count++;
      winStreak.opponents.push(new mongoose.Types.ObjectId(opponentId));
    } else {
      // End any active lose streak first
      if (fighterData.activeLoseStreak !== null) {
        const loseStreak = fighterData.streaks[fighterData.activeLoseStreak];
        loseStreak.active = false;
        loseStreak.end = fightContext;
        fighterData.activeLoseStreak = null;
      }

      // Start new win streak
      const newWinStreak = {
        competitionId: competitionId,
        type: 'win',
        start: fightContext,
        end: null,
        count: 1,
        active: true,
        opponents: [new mongoose.Types.ObjectId(opponentId)]
      };

      fighterData.streaks.push(newWinStreak);
      fighterData.activeWinStreak = fighterData.streaks.length - 1;
    }
  } else {
    // Update loser's streak
    if (fighterData.activeLoseStreak !== null) {
      // Extend existing lose streak
      const loseStreak = fighterData.streaks[fighterData.activeLoseStreak];
      loseStreak.count++;
      loseStreak.opponents.push(new mongoose.Types.ObjectId(opponentId));
    } else {
      // End any active win streak first
      if (fighterData.activeWinStreak !== null) {
        const winStreak = fighterData.streaks[fighterData.activeWinStreak];
        winStreak.active = false;
        winStreak.end = fightContext;
        fighterData.activeWinStreak = null;
      }

      // Start new lose streak
      const newLoseStreak = {
        competitionId: competitionId,
        type: 'lose',
        start: fightContext,
        end: null,
        count: 1,
        active: true,
        opponents: [new mongoose.Types.ObjectId(opponentId)]
      };

      fighterData.streaks.push(newLoseStreak);
      fighterData.activeLoseStreak = fighterData.streaks.length - 1;
    }
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
    division: division,
    round: round,
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
 * Process a single fight and update both fighters' data
 */
async function processFight(fight, season, division, round, fighterMap) {
  const winnerId = fight.winner.toString();
  const fighter1Id = fight.fighter1.toString();
  const fighter2Id = fight.fighter2.toString();
  const fightId = fight._id;

  // Determine winner and loser
  const loserId = winnerId === fighter1Id ? fighter2Id : fighter1Id;

  // Get fighter data from map
  const winnerData = fighterMap.get(winnerId);
  const loserData = fighterMap.get(loserId);

  if (!winnerData || !loserData) {
    console.warn(`⚠️  Missing fighter(s) for fight ${fight.fightIdentifier}`);
    return { updated: false };
  }

  const fightContext = {
    season: season,
    division: division,
    round: round
  };

  // Update winner's data
  updateStreaks(winnerData, loserId, fightContext, IFC_COMPETITION_META_ID, true);
  updateOpponentsHistory(
    winnerData.fighter,
    loserId,
    IFC_COMPETITION_META_ID,
    season,
    division,
    round,
    fightId,
    true
  );
  updateCompetitionHistory(winnerData.fighter, IFC_COMPETITION_META_ID, season, true);

  // Update loser's data
  updateStreaks(loserData, winnerId, fightContext, IFC_COMPETITION_META_ID, false);
  updateOpponentsHistory(
    loserData.fighter,
    winnerId,
    IFC_COMPETITION_META_ID,
    season,
    division,
    round,
    fightId,
    false
  );
  updateCompetitionHistory(loserData.fighter, IFC_COMPETITION_META_ID, season, false);

  return { updated: true, winnerData, loserData };
}

/**
 * Main function to update all fighters' data for Season 4
 */
async function updateSeason4FighterData() {
  console.log('\n' + '='.repeat(70));
  console.log('SEASON 4 - FIGHTER DATA UPDATE');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Get Season 4 competition data
    const season4Competition = await Competition.findOne({
      competitionMetaId: IFC_COMPETITION_META_ID,
      'seasonMeta.seasonNumber': SEASON_NUMBER
    });

    if (!season4Competition) {
      throw new Error('Season 4 competition data not found');
    }

    console.log(`✅ Found Season 4 competition data`);
    console.log(`   Divisions: ${season4Competition.leagueData.divisions.length}`);

    // Get all fighters and initialize fighterMap
    const allFighters = await Fighter.find({});
    const fighterMap = new Map();
    
    // Initialize fighter streak tracking
    allFighters.forEach(fighter => {
      fighterMap.set(fighter._id.toString(), {
        id: fighter._id,
        fighter: fighter,
        activeWinStreak: null,
        activeLoseStreak: null,
        streaks: fighter.streaks || []
      });
    });

    console.log(`📊 Initialized tracking for ${fighterMap.size} fighters`);

    let totalFights = 0;
    let processedFights = 0;

    // Count total fights
    season4Competition.leagueData.divisions.forEach(division => {
      division.rounds.forEach(round => {
        totalFights += round.fights.length;
      });
    });

    console.log(`📊 Total fights to process: ${totalFights}`);

    // Process each division
    for (const division of season4Competition.leagueData.divisions) {
      console.log(`\n📊 Processing Division ${division.divisionNumber}...`);

      // Process each round
      for (const round of division.rounds) {
        console.log(`   Round ${round.roundNumber} (${round.fights.length} fights)...`);

        // Process each fight
        for (const fight of round.fights) {
          if (!fight.winner || fight.fightStatus !== 'completed') {
            console.log(`     Skipping incomplete fight: ${fight.fightIdentifier}`);
            continue;
          }

          const result = await processFight(
            fight,
            SEASON_NUMBER,
            division.divisionNumber,
            round.roundNumber,
            fighterMap
          );

          if (result.updated) {
            processedFights++;
            if (processedFights % 10 === 0) {
              console.log(`     Processed ${processedFights}/${totalFights} fights...`);
            }
          }
        }
      }
    }

    console.log(`\n💾 Saving updated fighter data...`);

    // Save all updated fighters
    const fightersToSave = Array.from(fighterMap.values()).map(data => data.fighter);
    let savedCount = 0;

    for (const fighter of fightersToSave) {
      // Clean up temporary season tracking
      fighter.competitionHistory.forEach(comp => {
        if (comp._seasonsAppeared) {
          comp.numberOfSeasonAppearances = comp._seasonsAppeared.size;
          delete comp._seasonsAppeared;
        }
      });

      await fighter.save();
      savedCount++;
      
      if (savedCount % 10 === 0) {
        console.log(`   Saved ${savedCount}/${fightersToSave.length} fighters...`);
      }
    }

    console.log(`\n✅ Successfully updated ${savedCount} fighters!`);
    console.log(`📊 Processed ${processedFights} fights across ${season4Competition.leagueData.divisions.length} divisions`);

    // Show summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    
    season4Competition.leagueData.divisions.forEach(division => {
      const divisionFights = division.rounds.reduce((sum, round) => sum + round.fights.length, 0);
      console.log(`   Division ${division.divisionNumber}: ${divisionFights} fights`);
    });

    console.log('\n🎉 Season 4 fighter data update completed successfully!');

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
updateSeason4FighterData();
