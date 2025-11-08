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
    console.log(`📂 Database: ${connection.connection.db.databaseName}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Check IFL Competition Meta
 */
async function checkIFLCompetitionMeta() {
  console.log('\n' + '='.repeat(70));
  console.log('CHECKING IFL COMPETITION META');
  console.log('='.repeat(70));

  const iflMeta = await CompetitionMeta.findOne({
    $or: [
      { competitionName: 'Invictus Fighting League' },
      { competitionName: /IFL/i },
      { shortName: 'IFL' }
    ]
  });

  if (!iflMeta) {
    console.log('\n❌ IFL Competition Meta NOT FOUND!');
    console.log('   This is the root cause - need to create CompetitionMeta first');
    return null;
  }

  console.log('\n✅ IFL Competition Meta FOUND:');
  console.log(`   ID: ${iflMeta._id}`);
  console.log(`   Name: ${iflMeta.competitionName}`);
  console.log(`   Short Name: ${iflMeta.shortName}`);
  console.log(`   Type: ${iflMeta.type}`);
  console.log(`   Logo: ${iflMeta.logo || 'Not set'}`);
  console.log(`   Description: ${iflMeta.description || 'Not set'}`);

  return iflMeta;
}

/**
 * Check IFL Season 1
 */
async function checkIFLSeason1(iflMetaId) {
  console.log('\n' + '='.repeat(70));
  console.log('CHECKING IFL SEASON 1');
  console.log('='.repeat(70));

  if (!iflMetaId) {
    console.log('\n⚠️  Skipping - no IFL Meta ID');
    return null;
  }

  const iflS1 = await Competition.findOne({
    competitionMetaId: iflMetaId,
    'seasonMeta.seasonNumber': 1
  });

  if (!iflS1) {
    console.log('\n❌ IFL Season 1 NOT FOUND in competitions collection!');
    console.log('   Need to import/create IFL S1 data');
    return null;
  }

  console.log('\n✅ IFL Season 1 FOUND:');
  console.log(`   ID: ${iflS1._id}`);
  console.log(`   Competition Meta ID: ${iflS1.competitionMetaId}`);
  console.log(`   Season Number: ${iflS1.seasonMeta.seasonNumber}`);
  console.log(`   Is Active: ${iflS1.isActive}`);
  console.log(`   Start Date: ${iflS1.seasonMeta.startDate || 'Not set'}`);
  console.log(`   End Date: ${iflS1.seasonMeta.endDate || 'Not set'}`);

  // Check league data
  if (iflS1.leagueData) {
    console.log('\n📊 League Data:');
    console.log(`   Number of Divisions: ${iflS1.leagueData.divisions?.length || 0}`);
    
    if (iflS1.leagueData.divisions) {
      iflS1.leagueData.divisions.forEach((division, index) => {
        console.log(`\n   Division ${division.divisionNumber}:`);
        console.log(`      Name: ${division.divisionName || 'Not set'}`);
        console.log(`      Total Rounds: ${division.totalRounds || 0}`);
        console.log(`      Current Round: ${division.currentRound || 0}`);
        console.log(`      Rounds Data: ${division.rounds?.length || 0} rounds`);
        
        if (division.rounds && division.rounds.length > 0) {
          const totalFights = division.rounds.reduce((sum, round) => 
            sum + (round.fights?.length || 0), 0
          );
          console.log(`      Total Fights: ${totalFights}`);
          
          // Check first few fights
          const firstRound = division.rounds[0];
          if (firstRound && firstRound.fights && firstRound.fights.length > 0) {
            const firstFight = firstRound.fights[0];
            console.log(`      Sample Fight: ${firstFight.fightIdentifier || 'No identifier'}`);
            console.log(`         Fighter1: ${firstFight.fighter1 ? '✓' : '✗'}`);
            console.log(`         Fighter2: ${firstFight.fighter2 ? '✓' : '✗'}`);
            console.log(`         Winner: ${firstFight.winner || 'No winner yet'}`);
            console.log(`         Date: ${firstFight.date || 'No date'}`);
            console.log(`         Status: ${firstFight.fightStatus || 'Not set'}`);
          }
        } else {
          console.log(`      ⚠️  NO ROUNDS DATA - This is a problem!`);
        }
      });
    }
  } else {
    console.log('\n❌ NO LEAGUE DATA - This is a major problem!');
  }

  // Check season meta
  if (iflS1.seasonMeta.leagueDivisions) {
    console.log('\n👥 Season Meta - League Divisions:');
    iflS1.seasonMeta.leagueDivisions.forEach(div => {
      console.log(`   Division ${div.divisionNumber}: ${div.fighters?.length || 0} fighters`);
    });
  }

  return iflS1;
}

/**
 * Check all active competitions
 */
async function checkActiveCompetitions() {
  console.log('\n' + '='.repeat(70));
  console.log('CHECKING ALL ACTIVE COMPETITIONS');
  console.log('='.repeat(70));

  const activeComps = await Competition.find({ isActive: true })
    .populate('competitionMetaId')
    .select('competitionMetaId seasonMeta.seasonNumber isActive');

  console.log(`\n📊 Found ${activeComps.length} active competitions:`);
  
  for (const comp of activeComps) {
    const metaName = comp.competitionMetaId?.competitionName || 'Unknown';
    console.log(`   - ${metaName} Season ${comp.seasonMeta.seasonNumber} (ID: ${comp._id})`);
  }

  return activeComps;
}

/**
 * Check GraphQL query compatibility
 */
async function checkGraphQLCompatibility(iflS1) {
  console.log('\n' + '='.repeat(70));
  console.log('CHECKING GRAPHQL QUERY COMPATIBILITY');
  console.log('='.repeat(70));

  if (!iflS1) {
    console.log('\n⚠️  Cannot check - no IFL S1 data');
    return;
  }

  console.log('\n✓ Required Fields Check:');
  console.log(`   competitionMetaId: ${iflS1.competitionMetaId ? '✅' : '❌'}`);
  console.log(`   isActive: ${iflS1.isActive !== undefined ? '✅' : '❌'}`);
  console.log(`   seasonMeta: ${iflS1.seasonMeta ? '✅' : '❌'}`);
  console.log(`   leagueData: ${iflS1.leagueData ? '✅' : '❌'}`);
  
  if (iflS1.leagueData) {
    console.log(`   leagueData.divisions: ${iflS1.leagueData.divisions ? '✅' : '❌'}`);
    
    if (iflS1.leagueData.divisions) {
      const hasRounds = iflS1.leagueData.divisions.every(div => div.rounds && div.rounds.length > 0);
      console.log(`   All divisions have rounds: ${hasRounds ? '✅' : '❌'}`);
      
      const hasFights = iflS1.leagueData.divisions.every(div => 
        div.rounds && div.rounds.some(round => round.fights && round.fights.length > 0)
      );
      console.log(`   All divisions have fights: ${hasFights ? '✅' : '❌'}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();

    // Check IFL Competition Meta
    const iflMeta = await checkIFLCompetitionMeta();

    // Check IFL Season 1
    const iflS1 = await checkIFLSeason1(iflMeta?._id);

    // Check all active competitions
    await checkActiveCompetitions();

    // Check GraphQL compatibility
    await checkGraphQLCompatibility(iflS1);

    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(70));

    if (!iflMeta) {
      console.log('\n❌ ISSUE: IFL Competition Meta does not exist');
      console.log('   SOLUTION: Create CompetitionMeta for IFL first');
    } else if (!iflS1) {
      console.log('\n❌ ISSUE: IFL Season 1 data does not exist');
      console.log('   SOLUTION: Import IFL S1 competition data');
    } else if (!iflS1.leagueData || !iflS1.leagueData.divisions) {
      console.log('\n❌ ISSUE: IFL Season 1 missing league data structure');
      console.log('   SOLUTION: Fix the IFL S1 data structure');
    } else if (!iflS1.isActive) {
      console.log('\n⚠️  ISSUE: IFL Season 1 exists but isActive = false');
      console.log('   SOLUTION: Set isActive to true');
    } else {
      console.log('\n✅ IFL S1 data structure looks good!');
      console.log('   If not showing on frontend, check:');
      console.log('   1. Frontend GraphQL queries');
      console.log('   2. Browser cache / hard refresh');
      console.log('   3. Apollo Client cache');
    }

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

