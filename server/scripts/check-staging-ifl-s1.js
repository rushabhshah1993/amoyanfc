import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import readline from 'readline';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask user for database selection
 */
function askDatabase() {
  return new Promise((resolve) => {
    console.log('\n' + '='.repeat(70));
    console.log('DATABASE SELECTION');
    console.log('='.repeat(70));
    console.log('\nWhich database do you want to check?');
    console.log('1. Current .env database');
    console.log('2. Staging database (staging-amoyan)');
    console.log('3. Production database (gql-db)');
    
    rl.question('\nEnter your choice (1-3): ', (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Get MongoDB URI based on choice
 */
function getMongoURI(choice) {
  const baseUri = process.env.MONGODB_URI || '';
  
  switch(choice) {
    case '1':
      return baseUri;
    case '2':
      // Replace database name with staging-amoyan
      return baseUri.replace(/\/[^/?]+\?/, '/staging-amoyan?');
    case '3':
      // Replace database name with gql-db
      return baseUri.replace(/\/[^/?]+\?/, '/gql-db?');
    default:
      return baseUri;
  }
}

/**
 * Connect to MongoDB
 */
async function connectDB(mongoUri) {
  try {
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(`\n✅ Connected to MongoDB at ${connection.connection.host}`);
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
      { competitionName: 'Invictus Fight League' },
      { competitionName: /IFL/i },
      { shortName: 'IFL' }
    ]
  });

  if (!iflMeta) {
    console.log('\n❌ IFL Competition Meta NOT FOUND!');
    return null;
  }

  console.log('\n✅ IFL Competition Meta FOUND:');
  console.log(`   ID: ${iflMeta._id}`);
  console.log(`   Name: ${iflMeta.competitionName}`);
  console.log(`   Short Name: ${iflMeta.shortName}`);
  console.log(`   Type: ${iflMeta.type}`);

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
      iflS1.leagueData.divisions.forEach((division) => {
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
          
          // Check for upcoming fights (no winner)
          let upcomingFightsCount = 0;
          division.rounds.forEach(round => {
            round.fights?.forEach(fight => {
              if (!fight.winner) upcomingFightsCount++;
            });
          });
          console.log(`      Upcoming Fights (no winner): ${upcomingFightsCount}`);
        } else {
          console.log(`      ⚠️  NO ROUNDS DATA!`);
        }
      });
    }
  } else {
    console.log('\n❌ NO LEAGUE DATA!');
  }

  // Check season meta fighters
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
 * Main function
 */
async function main() {
  try {
    const choice = await askDatabase();
    rl.close();
    
    const mongoUri = getMongoURI(choice);
    await connectDB(mongoUri);

    // Check IFL Competition Meta
    const iflMeta = await checkIFLCompetitionMeta();

    // Check IFL Season 1
    const iflS1 = await checkIFLSeason1(iflMeta?._id);

    // Check all active competitions
    await checkActiveCompetitions();

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
      console.log('\n   Next steps:');
      console.log('   1. Restart backend server to pick up new data');
      console.log('   2. Clear Apollo Client cache on frontend');
      console.log('   3. Hard refresh browser (Cmd+Shift+R)');
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

