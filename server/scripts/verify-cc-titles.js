/**
 * Verify CC Titles Update
 * Checks that all CC champions have proper title entries
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { Fighter } from '../models/fighter.model.js';

const CC_COMPETITION_META_ID = '6778100309a4c4b25127f8fa';

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

async function verifyCCTitles() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING CC TITLES');
  console.log('='.repeat(70));

  try {
    await connectDB();

    const ccChampions = ['Unnati Vora'];
    
    console.log('\n📋 Checking CC Champions:\n');

    for (const name of ccChampions) {
      const [firstName, lastName] = name.split(' ');
      const fighter = await Fighter.findOne({ firstName, lastName }).lean();
      
      if (!fighter) {
        console.log(`❌ ${name} not found`);
        continue;
      }

      const ccHistory = fighter.competitionHistory?.find(
        ch => ch.competitionId?.toString() === CC_COMPETITION_META_ID
      );

      if (!ccHistory) {
        console.log(`❌ ${name}: No CC history`);
        continue;
      }

      console.log(`${'─'.repeat(70)}`);
      console.log(`👤 ${name}`);
      console.log(`${'─'.repeat(70)}`);
      
      // Check championships
      const championships = ccHistory.seasonDetails?.filter(
        s => s.finalCupPosition === 'Champion'
      ) || [];
      
      console.log(`Championships won: ${championships.length}`);
      championships.forEach(c => {
        console.log(`  - Season ${c.seasonNumber}`);
      });

      // Check titles
      console.log(`\nTitles recorded: ${ccHistory.titles?.totalTitles || 0}`);
      if (ccHistory.titles?.details && ccHistory.titles.details.length > 0) {
        ccHistory.titles.details.forEach(t => {
          console.log(`  - Season ${t.seasonNumber}: ${t.competitionSeasonId}`);
          console.log(`    Division: ${t.divisionNumber === null ? 'null (Cup)' : t.divisionNumber}`);
        });
      }

      // Verify match
      const titlesMatch = championships.length === (ccHistory.titles?.totalTitles || 0);
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

verifyCCTitles();

