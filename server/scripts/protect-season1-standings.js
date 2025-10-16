#!/usr/bin/env node
/**
 * Season 1 Standings Protection Monitor
 * This script monitors Season 1 standings and restores them if they're deleted
 * Run this script periodically or as a background service
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import the RoundStandings model
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
 * Load Season 1 standings data from JSON file
 */
function loadSeason1Standings() {
  const dataPath = path.join(__dirname, '../../old-data/migrated-standings/all-rounds-standings.json');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Season 1 standings file not found: ${dataPath}`);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const standingsData = JSON.parse(rawData);
  
  return standingsData;
}

/**
 * Check Season 1 standings status
 */
async function checkSeason1Status() {
  try {
    const s1Count = await RoundStandings.countDocuments({ seasonNumber: 1 });
    return s1Count;
  } catch (error) {
    console.error('❌ Error checking Season 1 status:', error);
    return 0;
  }
}

/**
 * Restore Season 1 standings
 */
async function restoreSeason1Standings() {
  try {
    console.log('🔄 Restoring Season 1 standings...');
    
    const standingsData = loadSeason1Standings();
    
    // Import the standings
    await RoundStandings.insertMany(standingsData);
    
    console.log(`✅ Successfully restored ${standingsData.length} Season 1 standings`);
    return true;
  } catch (error) {
    console.error('❌ Error restoring Season 1 standings:', error);
    return false;
  }
}

/**
 * Main monitoring function
 */
async function monitorSeason1Standings() {
  console.log('\n' + '='.repeat(70));
  console.log('🛡️  SEASON 1 STANDINGS PROTECTION MONITOR');
  console.log('='.repeat(70));
  
  try {
    // Connect to database
    await connectDB();
    
    // Check current status
    const s1Count = await checkSeason1Status();
    console.log(`\n📊 Current Season 1 standings: ${s1Count} documents`);
    
    if (s1Count === 0) {
      console.log('⚠️  WARNING: Season 1 standings are missing!');
      console.log('🔄 Attempting to restore...');
      
      const restored = await restoreSeason1Standings();
      
      if (restored) {
        console.log('✅ Season 1 standings have been restored!');
        
        // Verify restoration
        const newCount = await checkSeason1Status();
        console.log(`📊 Season 1 standings after restoration: ${newCount} documents`);
      } else {
        console.log('❌ Failed to restore Season 1 standings');
      }
    } else if (s1Count < 45) {
      console.log(`⚠️  WARNING: Season 1 standings count is low (${s1Count}/45 expected)`);
      console.log('🔄 Attempting to restore missing data...');
      
      const restored = await restoreSeason1Standings();
      
      if (restored) {
        console.log('✅ Season 1 standings have been restored!');
      }
    } else {
      console.log('✅ Season 1 standings are intact');
    }
    
    // Show final status
    const finalCount = await checkSeason1Status();
    console.log(`\n📊 Final Season 1 standings: ${finalCount} documents`);
    
    if (finalCount === 45) {
      console.log('✅ Season 1 standings are fully protected');
    } else {
      console.log('⚠️  Season 1 standings may need attention');
    }
    
  } catch (error) {
    console.error('\n❌ Monitor failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the monitor
monitorSeason1Standings();
