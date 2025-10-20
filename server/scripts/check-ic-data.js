/**
 * Quick check to verify IC competition history data
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

async function checkICData() {
  try {
    await connectDB();

    // Find Sayali Raut (known IC champion)
    const fighter = await Fighter.findOne({ firstName: 'Sayali', lastName: 'Raut' }).lean();
    
    if (!fighter) {
      console.log('Fighter not found');
      return;
    }

    console.log('\n📋 Fighter:', fighter.firstName, fighter.lastName);

    const icHistory = fighter.competitionHistory?.find(
      ch => ch.competitionId?.toString() === IC_COMPETITION_META_ID
    );

    if (!icHistory) {
      console.log('No IC history found');
      return;
    }

    console.log('\n📊 IC Competition History:');
    console.log(JSON.stringify(icHistory, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

checkICData();

