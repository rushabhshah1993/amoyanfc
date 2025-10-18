/**
 * Check Competition Active Status
 * Verify that all competitions have isActive: false since IFC is complete
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Competition } from '../models/competition.model.js';

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
 * Check active status of all competitions
 */
async function checkCompetitionsActiveStatus() {
  console.log('\n' + '='.repeat(70));
  console.log('CHECK COMPETITIONS ACTIVE STATUS');
  console.log('='.repeat(70));
  
  try {
    await connectDB();
    
    // Get all competitions
    console.log('\n📂 Loading all competitions...');
    const competitions = await Competition.find({}).select('_id seasonMeta isActive').lean();
    
    console.log(`✅ Found ${competitions.length} competitions`);
    
    // Check active status
    console.log('\n' + '='.repeat(70));
    console.log('COMPETITION STATUS');
    console.log('='.repeat(70));
    
    let activeCount = 0;
    let inactiveCount = 0;
    const activeCompetitions = [];
    
    competitions.forEach(comp => {
      const season = comp.seasonMeta?.seasonNumber || 'Unknown';
      const isActive = comp.isActive;
      
      if (isActive === true) {
        activeCount++;
        activeCompetitions.push(comp);
        console.log(`\n⚠️  Season ${season}:`);
        console.log(`   ID: ${comp._id}`);
        console.log(`   isActive: ${isActive} ❌ (Should be false)`);
      } else if (isActive === false) {
        inactiveCount++;
        console.log(`\n✅ Season ${season}:`);
        console.log(`   ID: ${comp._id}`);
        console.log(`   isActive: ${isActive}`);
      } else {
        console.log(`\n⚠️  Season ${season}:`);
        console.log(`   ID: ${comp._id}`);
        console.log(`   isActive: ${isActive} (undefined/null)`);
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n📊 Status Breakdown:`);
    console.log(`   - Active competitions (isActive: true): ${activeCount}`);
    console.log(`   - Inactive competitions (isActive: false): ${inactiveCount}`);
    console.log(`   - Total competitions: ${competitions.length}`);
    
    if (activeCount > 0) {
      console.log(`\n⚠️  WARNING: ${activeCount} competition(s) still marked as active!`);
      console.log('\nActive competitions:');
      activeCompetitions.forEach(comp => {
        console.log(`   - Season ${comp.seasonMeta?.seasonNumber || 'Unknown'} (ID: ${comp._id})`);
      });
      console.log('\n💡 These should be set to isActive: false since IFC has ended.');
    } else {
      console.log('\n🎉 SUCCESS: All competitions are marked as inactive (closed)!');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CHECK COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Check failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the check
checkCompetitionsActiveStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

