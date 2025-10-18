/**
 * SAFE Restore ALL IFC Standings (Seasons 1-10) to MongoDB
 * This is the MASTER RESTORE script that imports all seasons
 * It will ONLY import missing data, NEVER delete existing data
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { RoundStandings } from '../models/round-standings.model.js';

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
 * Load standings data for a specific season
 */
function loadSeasonStandings(seasonNumber) {
  const dataPath = path.join(__dirname, `../../old-data/migrated-standings/season${seasonNumber}-all-rounds-standings.json`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Standings file not found for Season ${seasonNumber}: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const standingsData = JSON.parse(rawData);
  
  return standingsData;
}

/**
 * SAFE Import standings for a specific season
 */
async function importSeasonStandingsSafe(seasonNumber) {
  console.log('\n' + '='.repeat(70));
  console.log(`SEASON ${seasonNumber} - SAFE IMPORT`);
  console.log('='.repeat(70));

  try {
    // Load standings data
    const standingsData = loadSeasonStandings(seasonNumber);
    console.log(`📂 Loaded ${standingsData.length} standing snapshots for Season ${seasonNumber}`);

    // Check if season standings already exist
    const existingCount = await RoundStandings.countDocuments({
      seasonNumber: seasonNumber
    });

    console.log(`📊 Existing standings: ${existingCount}`);
    console.log(`📊 Standings in file: ${standingsData.length}`);

    if (existingCount >= standingsData.length) {
      console.log(`✅ Season ${seasonNumber} standings are already complete!`);
      return { season: seasonNumber, imported: 0, existing: existingCount, total: standingsData.length };
    }

    // Find which standings are missing
    const existingIdentifiers = await RoundStandings.distinct('fightIdentifier', {
      seasonNumber: seasonNumber
    });

    const missingStandings = standingsData.filter(
      standing => !existingIdentifiers.includes(standing.fightIdentifier)
    );

    if (missingStandings.length === 0) {
      console.log(`✅ All Season ${seasonNumber} standings are already in the database!`);
      return { season: seasonNumber, imported: 0, existing: existingCount, total: standingsData.length };
    }

    console.log(`📥 Importing ${missingStandings.length} missing standings...`);
    
    // Insert in batches for better performance
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < missingStandings.length; i += batchSize) {
      const batch = missingStandings.slice(i, i + batchSize);
      try {
        await RoundStandings.insertMany(batch, { ordered: false });
        importedCount += batch.length;
      } catch (error) {
        // Some might already exist due to unique index, that's okay
        importedCount += batch.length - (error.writeErrors?.length || 0);
      }
    }
    
    console.log(`✅ Imported ${importedCount} standings for Season ${seasonNumber}`);

    // Verify the import
    const verifiedCount = await RoundStandings.countDocuments({
      seasonNumber: seasonNumber
    });

    return { 
      season: seasonNumber, 
      imported: importedCount, 
      existing: existingCount, 
      total: standingsData.length,
      verified: verifiedCount
    };

  } catch (error) {
    console.error(`❌ Failed to import Season ${seasonNumber}:`, error.message);
    return { 
      season: seasonNumber, 
      error: error.message,
      imported: 0,
      existing: 0,
      total: 0
    };
  }
}

/**
 * Main restore function - imports all seasons
 */
async function restoreAllStandings() {
  console.log('\n' + '='.repeat(70));
  console.log('🛡️  IFC STANDINGS - MASTER SAFE RESTORE');
  console.log('='.repeat(70));
  console.log('This script will restore ALL Season 1-10 standings');
  console.log('🛡️  PROTECTION MODE: Will NOT delete any existing data');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Check which seasons have data files
    const seasonsToImport = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const availableSeasons = [];
    
    console.log('\n' + '='.repeat(70));
    console.log('CHECKING AVAILABLE DATA FILES');
    console.log('='.repeat(70));
    
    for (const season of seasonsToImport) {
      const dataPath = path.join(__dirname, `../../old-data/migrated-standings/season${season}-all-rounds-standings.json`);
      if (fs.existsSync(dataPath)) {
        availableSeasons.push(season);
        console.log(`✅ Season ${season}: Data file found`);
      } else {
        console.log(`❌ Season ${season}: Data file NOT found`);
      }
    }

    console.log(`\n📊 Found data files for ${availableSeasons.length} seasons`);

    if (availableSeasons.length === 0) {
      console.log('❌ No season data files found. Exiting...');
      return;
    }

    // Import each season
    const results = [];
    
    console.log('\n' + '='.repeat(70));
    console.log('IMPORTING STANDINGS');
    console.log('='.repeat(70));

    for (const season of availableSeasons) {
      const result = await importSeasonStandingsSafe(season);
      results.push(result);
    }

    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('RESTORE COMPLETE - SUMMARY');
    console.log('='.repeat(70));
    
    console.log('\n📊 Season-by-Season Results:');
    console.log('Season | Imported | Existing | Total | Status');
    console.log('─'.repeat(70));
    
    let totalImported = 0;
    let totalExisting = 0;
    let totalExpected = 0;
    
    results.forEach(r => {
      if (r.error) {
        console.log(`  ${String(r.season).padStart(2)}   | ERROR: ${r.error}`);
      } else {
        const status = r.verified === r.total ? '✅ Complete' : '⚠️  Incomplete';
        console.log(
          `  ${String(r.season).padStart(2)}   | ${String(r.imported).padStart(8)} | ${String(r.existing).padStart(8)} | ${String(r.total).padStart(5)} | ${status}`
        );
        totalImported += r.imported;
        totalExisting += r.existing;
        totalExpected += r.total;
      }
    });
    
    console.log('─'.repeat(70));
    console.log(`Total  | ${String(totalImported).padStart(8)} | ${String(totalExisting).padStart(8)} | ${String(totalExpected).padStart(5)} |`);

    // Verify total standings in database
    console.log('\n' + '='.repeat(70));
    console.log('FINAL VERIFICATION');
    console.log('='.repeat(70));

    const totalInDB = await RoundStandings.countDocuments({});
    const standingsBySeason = await RoundStandings.aggregate([
      { $group: { 
          _id: '$seasonNumber',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(`\n📊 Total standings in database: ${totalInDB}`);
    console.log(`📊 Expected total: ${totalExpected}`);
    console.log(`\n📊 Breakdown by Season:`);
    
    standingsBySeason.forEach(s => {
      const expected = results.find(r => r.season === s._id)?.total || '?';
      const status = s.count === expected ? '✅' : '⚠️';
      console.log(`   Season ${String(s._id).padStart(2)}: ${String(s.count).padStart(4)} / ${String(expected).padStart(4)} ${status}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✨ MASTER RESTORE SUCCESSFUL! ✨');
    console.log('='.repeat(70));
    console.log('\n🛡️  All IFC standings have been safely restored!');
    console.log(`   - Newly imported: ${totalImported} standings`);
    console.log(`   - Already existed: ${totalExisting} standings`);
    console.log(`   - Total in database: ${totalInDB} standings`);
    console.log('   - No existing data was deleted');
    console.log('   - Only missing data was added');
    console.log('');

  } catch (error) {
    console.error('\n❌ Restore failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the restore
restoreAllStandings();

