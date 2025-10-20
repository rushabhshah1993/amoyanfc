/**
 * Update CC Titles for Champions
 * Adds title entries for all Champions Cup champions
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
 * Main function to update CC titles
 */
async function updateCCTitles() {
  console.log('\n' + '='.repeat(70));
  console.log('🏆 UPDATING CHAMPIONS CUP TITLES');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Fetch all CC seasons to get their MongoDB IDs
    console.log('\n📥 Fetching CC seasons from database...');
    const ccSeasons = await Competition.find({
      competitionMetaId: CC_COMPETITION_META_ID,
      'seasonMeta.seasonNumber': { $in: CC_SEASONS }
    })
    .sort({ 'seasonMeta.seasonNumber': 1 })
    .lean();

    console.log(`✅ Found ${ccSeasons.length} CC seasons`);

    // Create a map of seasonNumber -> competition MongoDB ID
    const seasonIdMap = new Map();
    ccSeasons.forEach(season => {
      seasonIdMap.set(season.seasonMeta.seasonNumber, season._id.toString());
    });

    console.log('\n📋 Season ID Mapping:');
    seasonIdMap.forEach((id, seasonNum) => {
      console.log(`   Season ${seasonNum}: ${id}`);
    });

    // Find all fighters with CC competition history
    console.log('\n🔍 Finding CC fighters...');
    const ccFighters = await Fighter.find({
      'competitionHistory.competitionId': CC_COMPETITION_META_ID
    });

    console.log(`✅ Found ${ccFighters.length} fighters with CC participation`);

    let updateCount = 0;
    let championsFound = 0;
    let titlesAdded = 0;

    console.log('\n🏆 Processing champions...\n');

    for (const fighter of ccFighters) {
      try {
        // Find CC competition history
        const ccHistory = fighter.competitionHistory.find(
          ch => ch.competitionId.toString() === CC_COMPETITION_META_ID
        );

        if (!ccHistory) continue;

        // Find all championships (finalCupPosition === "Champion")
        const championships = ccHistory.seasonDetails?.filter(
          season => season.finalCupPosition === 'Champion'
        ) || [];

        if (championships.length === 0) continue;

        championsFound++;
        const fighterName = `${fighter.firstName} ${fighter.lastName}`;
        console.log(`${'─'.repeat(70)}`);
        console.log(`🥇 ${fighterName}`);
        console.log(`   Championships found: ${championships.length}`);

        // Prepare title details
        const newTitleDetails = [];
        
        for (const championship of championships) {
          const seasonNumber = championship.seasonNumber;
          const competitionSeasonId = seasonIdMap.get(seasonNumber);

          if (!competitionSeasonId) {
            console.log(`   ⚠️  Could not find competition ID for season ${seasonNumber}`);
            continue;
          }

          // Check if this title already exists
          const existingTitle = ccHistory.titles?.details?.find(
            t => t.seasonNumber === seasonNumber && t.competitionSeasonId?.toString() === competitionSeasonId
          );

          if (existingTitle) {
            console.log(`   ℹ️  Season ${seasonNumber}: Title already exists`);
            continue;
          }

          newTitleDetails.push({
            competitionSeasonId: new mongoose.Types.ObjectId(competitionSeasonId),
            seasonNumber: seasonNumber,
            divisionNumber: null  // null for cup competitions
          });

          console.log(`   ✅ Season ${seasonNumber}: Adding new title`);
          titlesAdded++;
        }

        // Update fighter only if there are new titles to add
        if (newTitleDetails.length > 0) {
          // Initialize titles if it doesn't exist
          if (!ccHistory.titles) {
            ccHistory.titles = {
              totalTitles: 0,
              details: []
            };
          }

          // Add new titles to existing ones
          ccHistory.titles.details.push(...newTitleDetails);
          ccHistory.titles.totalTitles = ccHistory.titles.details.length;

          // Save fighter
          await fighter.save();
          updateCount++;

          console.log(`   📊 Total CC titles: ${ccHistory.titles.totalTitles}`);
        }

      } catch (error) {
        console.error(`   ❌ Error processing fighter ${fighter._id}:`, error.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total CC fighters: ${ccFighters.length}`);
    console.log(`Champions identified: ${championsFound}`);
    console.log(`New titles added: ${titlesAdded}`);
    console.log(`Fighters updated: ${updateCount}`);
    console.log('');

    // Create a log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logFilename = `cc-titles-update-${timestamp}.log`;
    const logPath = path.join(__dirname, '../../backups', logFilename);
    
    let logContent = `CC TITLES UPDATE LOG\n`;
    logContent += `${'='.repeat(70)}\n\n`;
    logContent += `Update Date: ${new Date().toISOString()}\n`;
    logContent += `Total CC Fighters: ${ccFighters.length}\n`;
    logContent += `Champions Identified: ${championsFound}\n`;
    logContent += `New Titles Added: ${titlesAdded}\n`;
    logContent += `Fighters Updated: ${updateCount}\n\n`;

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
updateCCTitles();

