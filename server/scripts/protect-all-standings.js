/**
 * IFC Standings Protection Script
 * This script monitors and protects ALL IFC standings (Seasons 1-10)
 * It checks for missing data and can automatically restore it
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
 * Get expected counts for each season
 */
function getExpectedCounts() {
  const expectedCounts = {};
  
  for (let season = 1; season <= 10; season++) {
    const dataPath = path.join(__dirname, `../../old-data/migrated-standings/season${season}-all-rounds-standings.json`);
    
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf8');
      const standingsData = JSON.parse(rawData);
      expectedCounts[season] = standingsData.length;
    }
  }
  
  return expectedCounts;
}

/**
 * Check standings status
 */
async function checkStandingsStatus() {
  console.log('\n' + '='.repeat(70));
  console.log('🛡️  IFC STANDINGS PROTECTION - STATUS CHECK');
  console.log('='.repeat(70));

  try {
    // Get expected counts from data files
    const expectedCounts = getExpectedCounts();
    
    // Get actual counts from database
    const actualCounts = await RoundStandings.aggregate([
      { $group: { 
          _id: '$seasonNumber',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const actualCountsMap = {};
    actualCounts.forEach(s => {
      actualCountsMap[s._id] = s.count;
    });

    // Compare and report
    console.log('\n📊 Standings Status by Season:');
    console.log('Season | Actual | Expected | Status');
    console.log('─'.repeat(70));
    
    const missingSeasons = [];
    const incompleteSeasons = [];
    const completeSeasons = [];
    
    for (let season = 1; season <= 10; season++) {
      const expected = expectedCounts[season];
      const actual = actualCountsMap[season] || 0;
      
      if (!expected) {
        console.log(`  ${String(season).padStart(2)}   | ${String(actual).padStart(6)} |    N/A   | ⚠️  No data file`);
        continue;
      }
      
      let status;
      if (actual === 0) {
        status = '❌ MISSING';
        missingSeasons.push(season);
      } else if (actual < expected) {
        status = `⚠️  INCOMPLETE (${Math.round(actual/expected*100)}%)`;
        incompleteSeasons.push(season);
      } else {
        status = '✅ Complete';
        completeSeasons.push(season);
      }
      
      console.log(`  ${String(season).padStart(2)}   | ${String(actual).padStart(6)} | ${String(expected).padStart(8)} | ${status}`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Complete seasons: ${completeSeasons.length}`);
    if (completeSeasons.length > 0) {
      console.log(`   ${completeSeasons.join(', ')}`);
    }
    
    console.log(`\n⚠️  Incomplete seasons: ${incompleteSeasons.length}`);
    if (incompleteSeasons.length > 0) {
      console.log(`   ${incompleteSeasons.join(', ')}`);
    }
    
    console.log(`\n❌ Missing seasons: ${missingSeasons.length}`);
    if (missingSeasons.length > 0) {
      console.log(`   ${missingSeasons.join(', ')}`);
    }

    // Recommendations
    if (missingSeasons.length > 0 || incompleteSeasons.length > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('RECOMMENDED ACTION');
      console.log('='.repeat(70));
      console.log('\n🚨 Some seasons are missing or incomplete!');
      console.log('\nTo restore all standings, run:');
      console.log('  npm run restore:all-standings');
      console.log('\nOr restore specific seasons:');
      
      [...missingSeasons, ...incompleteSeasons].forEach(season => {
        console.log(`  npm run restore:season${season}`);
      });
      
      return false;
    } else {
      console.log('\n' + '='.repeat(70));
      console.log('✨ ALL STANDINGS ARE PROTECTED AND COMPLETE! ✨');
      console.log('='.repeat(70));
      console.log('\n🛡️  All IFC standings (Seasons 1-10) are safely stored in MongoDB');
      console.log('');
      return true;
    }

  } catch (error) {
    console.error('\n❌ Protection check failed:', error);
    console.error(error.stack);
    return false;
  }
}

/**
 * Main protection function
 */
async function protectStandings() {
  try {
    // Connect to database
    await connectDB();

    // Check status
    const allComplete = await checkStandingsStatus();

    // Exit with appropriate code
    process.exit(allComplete ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Protection script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the protection check
protectStandings();

