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
 * Connect to Production MongoDB (gql-db)
 */
async function connectDB() {
  try {
    const baseUri = process.env.MONGODB_URI || '';
    // Force connection to production database (gql-db)
    const productionUri = baseUri.replace(/\/[^/?]+\?/, '/gql-db?');
    
    const connection = await mongoose.connect(productionUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(`✅ Connected to MongoDB at ${connection.connection.host}`);
    console.log(`📂 Database: ${connection.connection.db.databaseName}`);
    console.log('\n⚠️  CHECKING PRODUCTION DATABASE (gql-db)');
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
    
    if (iflS1.leagueData.divisions && iflS1.leagueData.divisions.length > 0) {
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
          console.log(`      ⚠️  NO ROUNDS DATA - THIS IS A PROBLEM!`);
        }
      });
    } else {
      console.log(`   ⚠️  NO DIVISIONS FOUND - THIS IS A MAJOR PROBLEM!`);
    }
  } else {
    console.log('\n❌ NO LEAGUE DATA AT ALL - THIS IS A CRITICAL PROBLEM!');
  }

  // Check season meta fighters
  if (iflS1.seasonMeta.leagueDivisions) {
    console.log('\n👥 Season Meta - League Divisions:');
    if (iflS1.seasonMeta.leagueDivisions.length > 0) {
      iflS1.seasonMeta.leagueDivisions.forEach(div => {
        console.log(`   Division ${div.divisionNumber}: ${div.fighters?.length || 0} fighters`);
      });
    } else {
      console.log(`   ⚠️  leagueDivisions array is EMPTY!`);
    }
  } else {
    console.log('\n⚠️  seasonMeta.leagueDivisions is NULL or UNDEFINED');
  }

  // Check config
  if (iflS1.config) {
    console.log('\n⚙️  Configuration:');
    if (iflS1.config.leagueConfiguration) {
      console.log(`   Number of Divisions (config): ${iflS1.config.leagueConfiguration.numberOfDivisions || 0}`);
      console.log(`   Fighters Per Division: ${iflS1.config.leagueConfiguration.fightersPerDivision?.length || 0} entries`);
    } else {
      console.log(`   ⚠️  NO league configuration`);
    }
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
    await connectDB();

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
      console.log('\n❌ ISSUE #1: IFL Competition Meta does not exist');
      console.log('   SOLUTION: Create CompetitionMeta for IFL first');
    } else if (!iflS1) {
      console.log('\n❌ ISSUE #2: IFL Season 1 data does not exist');
      console.log('   SOLUTION: Import/Create IFL S1 competition data');
    } else if (!iflS1.leagueData) {
      console.log('\n❌ ISSUE #3: IFL Season 1 has NO leagueData object');
      console.log('   CAUSE: The season document is missing the entire leagueData structure');
      console.log('   SOLUTION: Re-create the season with proper leagueData structure');
    } else if (!iflS1.leagueData.divisions || iflS1.leagueData.divisions.length === 0) {
      console.log('\n❌ ISSUE #4: IFL Season 1 leagueData has NO divisions array');
      console.log('   CAUSE: The divisions array is null, undefined, or empty');
      console.log('   SOLUTION: Populate leagueData.divisions with division data');
    } else {
      // Check if divisions have data
      let hasIssues = false;
      iflS1.leagueData.divisions.forEach((div, idx) => {
        if (!div.rounds || div.rounds.length === 0) {
          console.log(`\n❌ ISSUE #5.${idx + 1}: Division ${div.divisionNumber} has NO rounds`);
          hasIssues = true;
        } else {
          const totalFights = div.rounds.reduce((sum, round) => 
            sum + (round.fights?.length || 0), 0
          );
          if (totalFights === 0) {
            console.log(`\n❌ ISSUE #6.${idx + 1}: Division ${div.divisionNumber} has NO fights`);
            hasIssues = true;
          }
        }
      });

      if (!hasIssues && !iflS1.isActive) {
        console.log('\n⚠️  ISSUE #7: IFL Season 1 exists but isActive = false');
        console.log('   SOLUTION: Set isActive to true');
      } else if (!hasIssues) {
        console.log('\n✅ IFL S1 data structure looks COMPLETE!');
        console.log('   Division data: ✓');
        console.log('   Rounds data: ✓');
        console.log('   Fights data: ✓');
        console.log('   Active status: ✓');
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('WILL STARTING THE SEASON CAUSE PROBLEMS?');
    console.log('='.repeat(70));

    if (!iflS1) {
      console.log('\n🚨 YES - Cannot start a season that doesn\'t exist!');
    } else if (!iflS1.leagueData || !iflS1.leagueData.divisions || iflS1.leagueData.divisions.length === 0) {
      console.log('\n🚨 YES - Cannot start a season with no divisions!');
      console.log('   Frontend will crash or show empty data');
      console.log('   No fights will be available to simulate');
    } else {
      let hasFights = false;
      iflS1.leagueData.divisions.forEach(div => {
        const totalFights = div.rounds?.reduce((sum, round) => 
          sum + (round.fights?.length || 0), 0
        ) || 0;
        if (totalFights > 0) hasFights = true;
      });

      if (!hasFights) {
        console.log('\n🚨 YES - Cannot start a season with no fights!');
        console.log('   There are no fights to simulate or complete');
      } else {
        console.log('\n✅ NO - Season structure is complete and ready to start!');
      }
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

