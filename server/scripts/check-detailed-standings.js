/**
 * Detailed check of standings in MongoDB
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { RoundStandings } from '../models/round-standings.model.js';

async function checkDetailedStandings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Count by season
    const s1Count = await RoundStandings.countDocuments({ seasonNumber: 1 });
    const s2Count = await RoundStandings.countDocuments({ seasonNumber: 2 });
    console.log('Season 1 total:', s1Count, 'documents');
    console.log('Season 2 total:', s2Count, 'documents');
    
    // Count Season 1 by round
    console.log('\n📊 Season 1 by round:');
    for (let i = 1; i <= 9; i++) {
      const count = await RoundStandings.countDocuments({ seasonNumber: 1, roundNumber: i });
      console.log(`  Round ${i}: ${count} documents`);
    }
    
    // Count Season 2 by round
    console.log('\n📊 Season 2 by round:');
    for (let i = 1; i <= 9; i++) {
      const count = await RoundStandings.countDocuments({ seasonNumber: 2, roundNumber: i });
      console.log(`  Round ${i}: ${count} documents`);
    }
    
    // Show Season 1 fight identifiers
    const s1Docs = await RoundStandings.find({ seasonNumber: 1 })
      .select('fightIdentifier roundNumber')
      .sort({ roundNumber: 1, fightIdentifier: 1 });
    
    console.log('\n🔍 Season 1 fights found:');
    if (s1Docs.length === 0) {
      console.log('  ❌ No Season 1 fights found!');
    } else {
      s1Docs.forEach(doc => console.log(`  - ${doc.fightIdentifier} (Round ${doc.roundNumber})`));
    }
    
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDetailedStandings();

