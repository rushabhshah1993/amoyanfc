/**
 * Generate Season-by-Season Details for All Fighters
 * 
 * This script generates detailed season-by-season breakdown for every fighter
 * including fights, wins, losses, points, win percentage, and final position.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';
import { RoundStandings } from '../models/round-standings.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const IFC_COMPETITION_META_ID = '67780dcc09a4c4b25127f8f6';
const TOTAL_SEASONS = 6;

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
 * Get season-wise statistics from opponentsHistory
 */
function getSeasonWiseStats(fighter, competitionId) {
  const seasonStats = {};

  if (!fighter.opponentsHistory) return seasonStats;

  fighter.opponentsHistory.forEach(oh => {
    if (!oh.details) return;

    oh.details.forEach(detail => {
      if (detail.competitionId.toString() !== competitionId.toString()) return;

      const season = detail.season;
      const division = detail.divisionId;

      const key = `${season}-${division}`;
      
      if (!seasonStats[key]) {
        seasonStats[key] = {
          seasonNumber: season,
          divisionNumber: division,
          fights: 0,
          wins: 0,
          losses: 0
        };
      }

      seasonStats[key].fights++;
      if (detail.isWinner) {
        seasonStats[key].wins++;
      } else {
        seasonStats[key].losses++;
      }
    });
  });

  return seasonStats;
}

/**
 * Get final position for a fighter in a season
 */
async function getFinalPosition(fighterId, season, division) {
  try {
    // Get all standings for this season and division, sorted by round (desc) to get last round first
    const standings = await RoundStandings.find({
      seasonNumber: season,
      divisionNumber: division
    }).sort({ roundNumber: -1 }).limit(1);

    if (standings.length === 0) {
      console.warn(`⚠️  No standings found for Season ${season}, Division ${division}`);
      return null;
    }

    const lastRoundStandings = standings[0];
    
    // Find the fighter's position in the final standings
    const fighterStanding = lastRoundStandings.standings.find(
      s => s.fighterId.toString() === fighterId.toString()
    );

    if (!fighterStanding) {
      console.warn(`⚠️  Fighter not found in final standings for Season ${season}, Division ${division}`);
      return null;
    }

    return fighterStanding.rank;
  } catch (error) {
    console.error(`Error getting final position for Season ${season}, Division ${division}:`, error.message);
    return null;
  }
}

/**
 * Generate season details for a single fighter
 */
async function generateFighterSeasonDetails(fighter, competitionId) {
  const seasonStats = getSeasonWiseStats(fighter, competitionId);
  const seasonDetails = [];

  // Sort by season-division key
  const keys = Object.keys(seasonStats).sort();

  for (const key of keys) {
    const stats = seasonStats[key];
    
    // Calculate points (3 per win)
    const points = stats.wins * 3;
    
    // Calculate win percentage
    const winPercentage = stats.fights > 0 
      ? (stats.wins / stats.fights) * 100 
      : 0;

    // Get final position
    const finalPosition = await getFinalPosition(
      fighter._id, 
      stats.seasonNumber, 
      stats.divisionNumber
    );

    seasonDetails.push({
      seasonNumber: stats.seasonNumber,
      divisionNumber: stats.divisionNumber,
      fights: stats.fights,
      wins: stats.wins,
      losses: stats.losses,
      points: points,
      winPercentage: winPercentage,
      finalPosition: finalPosition
    });
  }

  return seasonDetails;
}

/**
 * Main function to generate season details
 */
async function generateSeasonDetails() {
  console.log('\n' + '='.repeat(70));
  console.log('GENERATE SEASON-BY-SEASON DETAILS FOR ALL FIGHTERS');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Load all fighters
    console.log('\n📂 Loading all fighters...');
    const fighters = await Fighter.find({});
    console.log(`✅ Loaded ${fighters.length} fighters`);

    // Filter fighters who have IFC competition history
    const ifcFighters = fighters.filter(f => 
      f.competitionHistory && 
      f.competitionHistory.some(ch => ch.competitionId.toString() === IFC_COMPETITION_META_ID)
    );

    console.log(`   - Fighters with IFC history: ${ifcFighters.length}`);

    // Check for existing season details
    console.log('\n🔍 Checking for existing season details...');
    const fightersWithDetails = ifcFighters.filter(f => {
      const ifcRecord = f.competitionHistory.find(
        ch => ch.competitionId.toString() === IFC_COMPETITION_META_ID
      );
      return ifcRecord && ifcRecord.seasonDetails && ifcRecord.seasonDetails.length > 0;
    });

    console.log(`   - Fighters with season details: ${fightersWithDetails.length}`);
    console.log(`   - Fighters needing season details: ${ifcFighters.length - fightersWithDetails.length}`);

    if (fightersWithDetails.length > 0) {
      console.log('\n⚠️  WARNING: Some fighters already have season details!');
      console.log('   This script will regenerate for ALL fighters.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\n' + '='.repeat(70));
    console.log('GENERATING SEASON DETAILS');
    console.log('='.repeat(70));

    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const fighter of ifcFighters) {
      try {
        // Generate season details
        const seasonDetails = await generateFighterSeasonDetails(fighter, IFC_COMPETITION_META_ID);

        if (seasonDetails.length === 0) {
          console.warn(`⚠️  No season details generated for ${fighter.firstName} ${fighter.lastName}`);
          errorCount++;
          continue;
        }

        // Find IFC competition record index
        const compRecordIndex = fighter.competitionHistory.findIndex(
          ch => ch.competitionId.toString() === IFC_COMPETITION_META_ID
        );

        if (compRecordIndex === -1) {
          console.warn(`⚠️  Fighter ${fighter.firstName} ${fighter.lastName} has no IFC competition record!`);
          errorCount++;
          continue;
        }

        // Update fighter in database
        await Fighter.findByIdAndUpdate(
          fighter._id,
          {
            $set: {
              [`competitionHistory.${compRecordIndex}.seasonDetails`]: seasonDetails
            }
          }
        );

        updatedCount++;
        processedCount++;

        // Show progress
        const progress = Math.floor((processedCount / ifcFighters.length) * 100);
        process.stdout.write(`\r   Progress: ${progress}% (${processedCount}/${ifcFighters.length} fighters)`);

      } catch (error) {
        console.error(`\n❌ Error processing fighter ${fighter.firstName} ${fighter.lastName}:`, error.message);
        errorCount++;
        processedCount++;
      }
    }

    console.log('\n');

    // Display results
    console.log('\n' + '='.repeat(70));
    console.log('GENERATION RESULTS');
    console.log('='.repeat(70));
    console.log(`\n✅ Successfully updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Verification - show sample season details
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION (Sample)');
    console.log('='.repeat(70));

    const sampleFighters = await Fighter.find({
      _id: { $in: ifcFighters.slice(0, 3).map(f => f._id) }
    });

    for (const fighter of sampleFighters) {
      const compRecord = fighter.competitionHistory.find(
        ch => ch.competitionId.toString() === IFC_COMPETITION_META_ID
      );

      console.log(`\n${fighter.firstName} ${fighter.lastName}:`);
      console.log(`   - Total season appearances: ${compRecord.numberOfSeasonAppearances}`);
      console.log(`   - Season details count: ${compRecord.seasonDetails?.length || 0}`);
      
      if (compRecord.seasonDetails && compRecord.seasonDetails.length > 0) {
        console.log(`   - Season breakdown:`);
        compRecord.seasonDetails.forEach(sd => {
          console.log(`     • Season ${sd.seasonNumber}, Div ${sd.divisionNumber}: ${sd.wins}W-${sd.losses}L (${sd.points} pts, Pos: ${sd.finalPosition})`);
        });
      }
    }

    // Summary statistics
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY STATISTICS');
    console.log('='.repeat(70));

    const allUpdatedFighters = await Fighter.find({
      'competitionHistory.competitionId': IFC_COMPETITION_META_ID,
      'competitionHistory.seasonDetails': { $exists: true, $ne: [] }
    });

    console.log(`\n📊 Total fighters with season details: ${allUpdatedFighters.length}`);

    // Count season details per fighter
    const detailsCounts = {};
    allUpdatedFighters.forEach(fighter => {
      const compRecord = fighter.competitionHistory.find(
        ch => ch.competitionId.toString() === IFC_COMPETITION_META_ID
      );
      const count = compRecord.seasonDetails?.length || 0;
      detailsCounts[count] = (detailsCounts[count] || 0) + 1;
    });

    console.log(`\n📊 Distribution by number of season appearances:`);
    Object.keys(detailsCounts).sort((a, b) => parseInt(a) - parseInt(b)).forEach(count => {
      console.log(`   - ${count} seasons: ${detailsCounts[count]} fighters`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✨ GENERATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log(`\n${updatedCount} fighters updated with season-by-season details`);
    console.log(`${errorCount} errors encountered`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the generation
generateSeasonDetails();

