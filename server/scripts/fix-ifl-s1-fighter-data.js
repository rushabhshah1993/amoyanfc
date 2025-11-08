import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    // Force staging database
    const mongoUri = process.env.MONGODB_URI.replace(/\/[^/?]+\?/, '/staging-amoyan?');
    
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(`✅ Connected to MongoDB at ${connection.connection.host}`);
    console.log(`📂 Database: ${connection.connection.db.databaseName}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Fix IFL S1 Season Meta Fighters
 */
async function fixIFLS1FighterData() {
  console.log('\n' + '='.repeat(70));
  console.log('FIXING IFL S1 SEASON META - LEAGUE DIVISIONS FIGHTERS');
  console.log('='.repeat(70));

  // Get IFL Meta
  const iflMeta = await CompetitionMeta.findOne({ shortName: 'IFL' });
  if (!iflMeta) {
    console.log('\n❌ IFL Competition Meta not found!');
    return;
  }

  // Get IFL S1
  const iflS1 = await Competition.findOne({
    competitionMetaId: iflMeta._id,
    'seasonMeta.seasonNumber': 1
  });

  if (!iflS1) {
    console.log('\n❌ IFL Season 1 not found!');
    return;
  }

  console.log(`\n✅ Found IFL S1: ${iflS1._id}`);
  console.log(`   Current leagueDivisions: ${iflS1.seasonMeta.leagueDivisions?.length || 0}`);

  // Extract unique fighter IDs from leagueData
  const divisionFighterMap = new Map();

  if (iflS1.leagueData && iflS1.leagueData.divisions) {
    for (const division of iflS1.leagueData.divisions) {
      const fighterIds = new Set();
      
      if (division.rounds) {
        for (const round of division.rounds) {
          if (round.fights) {
            for (const fight of round.fights) {
              if (fight.fighter1) fighterIds.add(fight.fighter1.toString());
              if (fight.fighter2) fighterIds.add(fight.fighter2.toString());
            }
          }
        }
      }

      divisionFighterMap.set(division.divisionNumber, Array.from(fighterIds));
    }
  }

  console.log('\n📊 Fighter Distribution:');
  for (const [divNum, fighterIds] of divisionFighterMap) {
    console.log(`   Division ${divNum}: ${fighterIds.length} unique fighters`);
  }

  // Fetch fighter data
  console.log('\n🔍 Fetching fighter details from database...');
  const allFighterIds = Array.from(new Set([...divisionFighterMap.values()].flat()));
  const fighters = await Fighter.find({ _id: { $in: allFighterIds } })
    .select('_id firstName lastName profileImage');

  const fighterMap = new Map(fighters.map(f => [f._id.toString(), f]));
  console.log(`   Found ${fighters.length} fighters in database`);

  // Build leagueDivisions array
  const leagueDivisions = [];

  for (const [divNum, fighterIds] of divisionFighterMap) {
    // Verify all fighters exist and convert to ObjectIds
    const validFighterIds = fighterIds.map(id => {
      const fighter = fighterMap.get(id);
      if (!fighter) {
        console.warn(`   ⚠️  Fighter ${id} not found in database!`);
        return null;
      }
      return fighter._id; // Just the ObjectId, not full fighter object
    }).filter(f => f !== null);

    leagueDivisions.push({
      divisionNumber: divNum,
      fighters: validFighterIds, // Array of ObjectIds only
      winners: [] // No winners yet as season hasn't started
    });
  }

  // Sort by division number
  leagueDivisions.sort((a, b) => a.divisionNumber - b.divisionNumber);

  console.log('\n✏️  Updating IFL S1 seasonMeta.leagueDivisions...');

  // Update the competition
  iflS1.seasonMeta.leagueDivisions = leagueDivisions;
  await iflS1.save();

  console.log('✅ Successfully updated IFL S1!');
  console.log('\n📋 Updated Division Structure:');
  leagueDivisions.forEach(div => {
    console.log(`   Division ${div.divisionNumber}: ${div.fighters.length} fighters`);
  });

  return iflS1;
}

/**
 * Verify the fix
 */
async function verifyFix() {
  console.log('\n' + '='.repeat(70));
  console.log('VERIFYING FIX');
  console.log('='.repeat(70));

  const iflMeta = await CompetitionMeta.findOne({ shortName: 'IFL' });
  const iflS1 = await Competition.findOne({
    competitionMetaId: iflMeta._id,
    'seasonMeta.seasonNumber': 1
  });

  if (!iflS1) {
    console.log('\n❌ Could not find IFL S1 for verification');
    return false;
  }

  console.log('\n✓ Verification Checklist:');
  console.log(`   competitionMetaId: ${iflS1.competitionMetaId ? '✅' : '❌'}`);
  console.log(`   isActive: ${iflS1.isActive ? '✅' : '❌'}`);
  console.log(`   seasonMeta: ${iflS1.seasonMeta ? '✅' : '❌'}`);
  console.log(`   seasonMeta.leagueDivisions: ${iflS1.seasonMeta.leagueDivisions?.length > 0 ? '✅' : '❌'}`);
  console.log(`   leagueData: ${iflS1.leagueData ? '✅' : '❌'}`);
  console.log(`   leagueData.divisions: ${iflS1.leagueData?.divisions?.length > 0 ? '✅' : '❌'}`);

  if (iflS1.seasonMeta.leagueDivisions) {
    console.log('\n👥 Division Fighters:');
    iflS1.seasonMeta.leagueDivisions.forEach(div => {
      const hasFighterDetails = div.fighters.every(f => f.firstName && f.lastName);
      console.log(`   Division ${div.divisionNumber}: ${div.fighters.length} fighters ${hasFighterDetails ? '✅' : '⚠️'}`);
    });
  }

  const allGood = 
    iflS1.competitionMetaId &&
    iflS1.isActive &&
    iflS1.seasonMeta &&
    iflS1.seasonMeta.leagueDivisions?.length > 0 &&
    iflS1.leagueData &&
    iflS1.leagueData.divisions?.length > 0;

  console.log(`\n${allGood ? '✅ ALL CHECKS PASSED!' : '❌ Some checks failed'}`);

  return allGood;
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();

    // Fix the fighter data
    await fixIFLS1FighterData();

    // Verify the fix
    await verifyFix();

    console.log('\n' + '='.repeat(70));
    console.log('NEXT STEPS');
    console.log('='.repeat(70));
    console.log('\n1. Ensure your .env file uses staging database:');
    console.log('   MONGODB_URI=...vl6hc.mongodb.net/staging-amoyan?...');
    console.log('\n2. Restart your backend server');
    console.log('\n3. Clear Apollo Client cache on frontend');
    console.log('\n4. Hard refresh browser (Cmd+Shift+R)');
    console.log('\n5. Check:');
    console.log('   - Homepage upcoming fights section');
    console.log('   - IFL competition page shows divisions');
    console.log('   - Division page shows fights');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

main();

