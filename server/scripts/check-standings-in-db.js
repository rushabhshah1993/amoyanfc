/**
 * Quick script to check what standings are in MongoDB
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { RoundStandings } from '../models/round-standings.model.js';

async function checkStandings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Check Season 1
    const s1Count = await RoundStandings.countDocuments({ seasonNumber: 1 });
    console.log(`Season 1 standings: ${s1Count} documents`);
    
    // Check Season 2
    const s2Count = await RoundStandings.countDocuments({ seasonNumber: 2 });
    console.log(`Season 2 standings: ${s2Count} documents`);
    
    // Total
    const totalCount = await RoundStandings.countDocuments({});
    console.log(`\nTotal standings: ${totalCount} documents`);
    
    // Show sample from each season
    const s1Sample = await RoundStandings.findOne({ seasonNumber: 1 }).limit(1);
    const s2Sample = await RoundStandings.findOne({ seasonNumber: 2 }).limit(1);
    
    console.log('\n--- Season 1 Sample ---');
    if (s1Sample) {
      console.log(`Fight: ${s1Sample.fightIdentifier || s1Sample.fightId}`);
      console.log(`Competition ID: ${s1Sample.competitionId}`);
      console.log(`Season: ${s1Sample.seasonNumber}`);
      console.log(`Division: ${s1Sample.divisionNumber}`);
      console.log(`Round: ${s1Sample.roundNumber}`);
    } else {
      console.log('❌ No Season 1 standings found!');
    }
    
    console.log('\n--- Season 2 Sample ---');
    if (s2Sample) {
      console.log(`Fight: ${s2Sample.fightIdentifier || s2Sample.fightId}`);
      console.log(`Competition ID: ${s2Sample.competitionId}`);
      console.log(`Season: ${s2Sample.seasonNumber}`);
      console.log(`Division: ${s2Sample.divisionNumber}`);
      console.log(`Round: ${s2Sample.roundNumber}`);
    } else {
      console.log('❌ No Season 2 standings found!');
    }
    
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStandings();

