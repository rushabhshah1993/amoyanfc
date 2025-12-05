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
 * Connect to Production MongoDB (gql-db)
 */
async function connectDB() {
  try {
    const baseUri = process.env.MONGODB_URI || '';
    const productionUri = baseUri.replace(/\/[^/?]+\?/, '/gql-db?');
    
    const connection = await mongoose.connect(productionUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(`✅ Connected to: ${connection.connection.db.databaseName}\n`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Check IFL S1 fight completion and fighter data
 */
async function checkIFLS1FightCompletionAndFighters() {
  try {
    console.log('='.repeat(70));
    console.log('CHECKING IFL S1 FIGHT COMPLETION & FIGHTER DATA');
    console.log('='.repeat(70));

    // Find IFL Meta
    const iflMeta = await CompetitionMeta.findOne({ shortName: 'IFL' });
    if (!iflMeta) {
      console.log('❌ IFL Meta not found');
      return;
    }

    // Find IFL S1
    const iflS1 = await Competition.findOne({
      competitionMetaId: iflMeta._id,
      'seasonMeta.seasonNumber': 1
    });

    if (!iflS1) {
      console.log('❌ IFL S1 not found');
      return;
    }

    console.log(`\n✅ IFL Meta ID: ${iflMeta._id}`);
    console.log(`✅ IFL S1 ID: ${iflS1._id}`);

    // Check fight completion status
    console.log('\n' + '='.repeat(70));
    console.log('FIGHT COMPLETION STATUS');
    console.log('='.repeat(70));

    let totalFights = 0;
    let completedFights = 0;

    if (iflS1.leagueData && iflS1.leagueData.divisions) {
      iflS1.leagueData.divisions.forEach(div => {
        console.log(`\nDivision ${div.divisionNumber}:`);
        
        if (div.rounds) {
          div.rounds.forEach(round => {
            const roundCompletedFights = round.fights.filter(f => f.winner).length;
            const roundTotalFights = round.fights.length;
            
            totalFights += roundTotalFights;
            completedFights += roundCompletedFights;
            
            const status = roundCompletedFights === roundTotalFights ? '✅' : 
                          roundCompletedFights > 0 ? '⏳' : '⏸️';
            
            console.log(`  ${status} Round ${round.roundNumber}: ${roundCompletedFights}/${roundTotalFights} completed`);
          });
        }
      });
    }

    const completionPercentage = totalFights > 0 ? ((completedFights / totalFights) * 100).toFixed(2) : 0;
    console.log(`\n📊 Overall: ${completedFights}/${totalFights} fights completed (${completionPercentage}%)`);

    // Now check fighter data for those who participated
    console.log('\n' + '='.repeat(70));
    console.log('FIGHTER DATA FOR IFL S1 PARTICIPANTS');
    console.log('='.repeat(70));

    // Get all fighter IDs from IFL S1
    const iflS1FighterIds = new Set();
    if (iflS1.seasonMeta.leagueDivisions) {
      iflS1.seasonMeta.leagueDivisions.forEach(div => {
        div.fighters.forEach(fId => {
          iflS1FighterIds.add(fId.toString());
        });
      });
    }

    console.log(`\nTotal fighters in IFL S1: ${iflS1FighterIds.size}`);

    // Check 5 sample fighters who should have fight data
    const sampleFighterIds = Array.from(iflS1FighterIds).slice(0, 5);
    
    console.log('\n📋 Sample Fighter Data:\n');

    for (const fighterId of sampleFighterIds) {
      const fighter = await Fighter.findById(fighterId);
      
      if (!fighter) {
        console.log(`❌ Fighter ${fighterId} not found`);
        continue;
      }

      console.log(`👤 ${fighter.firstName} ${fighter.lastName} (${fighter._id})`);
      console.log(`   Total Fights (overall): ${fighter.totalFights || 0}`);
      console.log(`   Total Wins: ${fighter.totalWins || 0}`);
      console.log(`   Total Losses: ${fighter.totalLosses || 0}`);
      
      // Check IFL competition history
      const iflHistory = fighter.competitionHistory?.find(
        h => h.competitionId?.toString() === iflMeta._id.toString()
      );
      
      if (iflHistory) {
        console.log(`   IFL Competition History:`);
        console.log(`      numberOfSeasonAppearances: ${iflHistory.numberOfSeasonAppearances || 0}`);
        console.log(`      totalFights (IFL): ${iflHistory.totalFights || 0}`);
        console.log(`      totalWins (IFL): ${iflHistory.totalWins || 0}`);
        console.log(`      seasonDetails entries: ${iflHistory.seasonDetails?.length || 0}`);
        
        if (iflHistory.seasonDetails && iflHistory.seasonDetails.length > 0) {
          iflHistory.seasonDetails.forEach(sd => {
            console.log(`         Season ${sd.seasonNumber || 'undefined'} Div ${sd.divisionNumber || 'N/A'}: ${sd.wins || 0}W-${sd.losses || 0}L`);
          });
        }
      } else {
        console.log(`   ⚠️  NO IFL competition history found!`);
      }
      
      console.log('');
    }

    // Calculate expected numberOfSeasonAppearances
    console.log('='.repeat(70));
    console.log('DIAGNOSIS');
    console.log('='.repeat(70));

    if (completedFights > 0) {
      console.log(`\n✅ Fights have been completed: ${completedFights} fights`);
      console.log(`\nIf numberOfSeasonAppearances shows 2 instead of 1:`);
      console.log(`   Possible causes:`);
      console.log(`   1. Fighter appeared in 2 different seasons (IFL S1 + another season)`);
      console.log(`   2. numberOfSeasonAppearances was incorrectly incremented twice`);
      console.log(`   3. seasonDetails has duplicate entries for same season`);
      console.log(`\n   Check the sample fighter data above for the actual cause.`);
    } else {
      console.log(`\n⏸️  No fights completed yet`);
      console.log(`   numberOfSeasonAppearances should be 0 for all fighters`);
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();
    await checkIFLS1FightCompletionAndFighters();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

main();

