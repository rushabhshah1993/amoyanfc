/**
 * Verify IC Titles Update
 * Checks that all IC champions have proper title entries
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { Fighter } from '../models/fighter.model.js';

const IC_COMPETITION_META_ID = '6778103309a4c4b25127f8fc';

async function connectDB() {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log(`✅ Connected to MongoDB`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

async function verifyICTitles() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING IC TITLES');
  console.log('='.repeat(70));

  try {
    await connectDB();

    const icChampions = ['Sayali Raut', 'Ishita Shah', 'Tanvi Shah'];
    
    console.log('\n📋 Checking IC Champions:\n');

    for (const name of icChampions) {
      const [firstName, lastName] = name.split(' ');
      const fighter = await Fighter.findOne({ firstName, lastName }).lean();
      
      if (!fighter) {
        console.log(`❌ ${name} not found`);
        continue;
      }

      const icHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
      );

      if (!icHistory) {
        console.log(`❌ ${name}: No IC history`);
        continue;
      }

      console.log(`${'─'.repeat(70)}`);
      console.log(`👤 ${name}`);
      console.log(`${'─'.repeat(70)}`);
      
      // Check championships
      const championships = icHistory.seasonDetails?.filter(
        s => s.finalCupPosition === 'Champion'
      ) || [];
      
      console.log(`Championships won: ${championships.length}`);
      championships.forEach(c => {
        console.log(`  - Season ${c.seasonNumber}`);
      });

      // Check titles
      console.log(`\nTitles recorded: ${icHistory.titles?.totalTitles || 0}`);
      if (icHistory.titles?.details && icHistory.titles.details.length > 0) {
        icHistory.titles.details.forEach(t => {
          console.log(`  - Season ${t.seasonNumber}: ${t.competitionSeasonId}`);
          console.log(`    Division: ${t.divisionNumber === null ? 'null (Cup)' : t.divisionNumber}`);
        });
      }

      // Verify match
      const titlesMatch = championships.length === (icHistory.titles?.totalTitles || 0);
      console.log(`\n${titlesMatch ? '✅' : '❌'} Titles match championships: ${titlesMatch ? 'YES' : 'NO'}`);
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

verifyICTitles();

