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
import { RoundStandings } from '../models/round-standings.model.js';
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
 * Check IFL S1 Standings
 */
async function checkIFLS1Standings() {
  try {
    console.log('='.repeat(70));
    console.log('CHECKING IFL S1 STANDINGS DATA');
    console.log('='.repeat(70));

    // Find IFL Meta
    const iflMeta = await CompetitionMeta.findOne({ shortName: 'IFL' });
    if (!iflMeta) {
      console.log('❌ IFL Meta not found');
      return;
    }

    console.log(`\n✅ IFL Meta ID: ${iflMeta._id}`);

    // Find IFL S1
    const iflS1 = await Competition.findOne({
      competitionMetaId: iflMeta._id,
      'seasonMeta.seasonNumber': 1
    });

    if (!iflS1) {
      console.log('❌ IFL S1 not found');
      return;
    }

    console.log(`✅ IFL S1 ID: ${iflS1._id}`);
    console.log(`   Season Number: 1`);
    console.log(`   Is Active: ${iflS1.isActive}`);

    // Check for standings documents
    console.log('\n📊 Checking for Round Standings documents...\n');

    const standingsQuery = {
      competitionId: iflMeta._id.toString(),
      seasonNumber: 1
    };

    const allStandings = await RoundStandings.find(standingsQuery);

    console.log(`Found ${allStandings.length} standings documents for IFL S1`);

    if (allStandings.length === 0) {
      console.log('\n✅ CORRECT: No standings yet (season hasn\'t started)');
      console.log('   Standings are created when the first fight is completed');
      console.log('\n⚠️  FRONTEND ISSUE: CompetitionPage is trying to fetch standings');
      console.log('   but none exist, which may cause the display bug!');
    } else {
      console.log('\n📋 Standings Documents Found:\n');
      
      // Group by division
      const byDivision = {};
      allStandings.forEach(doc => {
        const div = doc.divisionNumber;
        if (!byDivision[div]) {
          byDivision[div] = [];
        }
        byDivision[div].push(doc);
      });

      for (const [divNum, docs] of Object.entries(byDivision)) {
        console.log(`Division ${divNum}: ${docs.length} standings documents`);
        
        // Check each round
        docs.forEach(doc => {
          console.log(`   Round ${doc.roundNumber}:`);
          console.log(`      Document ID: ${doc._id}`);
          console.log(`      Standings entries: ${doc.standings?.length || 0}`);
          
          if (doc.standings && doc.standings.length > 0) {
            // Show rank 1 (leader)
            const leader = doc.standings.find(s => s.rank === 1);
            if (leader) {
              console.log(`      Leader (Rank 1): Fighter ID ${leader.fighterId}`);
              console.log(`         Points: ${leader.points || 0}`);
              console.log(`         Wins: ${leader.wins || 0}`);
            }
            
            // Check if all fighters have same data (indicating default/incorrect data)
            const allSamePoints = doc.standings.every(s => s.points === doc.standings[0].points);
            const allSameWins = doc.standings.every(s => s.wins === doc.standings[0].wins);
            if (allSamePoints && allSameWins && doc.standings.length > 1) {
              console.log(`      ⚠️  All fighters have identical stats (likely default data)`);
            }
          }
        });
        console.log('');
      }

      // Check if standings have fighter IDs that exist in seasonMeta.leagueDivisions
      console.log('\n🔍 Validating Fighter IDs in Standings:\n');
      
      const seasonFighterIds = new Set();
      if (iflS1.seasonMeta.leagueDivisions) {
        iflS1.seasonMeta.leagueDivisions.forEach(div => {
          div.fighters.forEach(fId => {
            seasonFighterIds.add(fId.toString());
          });
        });
      }

      console.log(`Total fighters in seasonMeta.leagueDivisions: ${seasonFighterIds.size}`);

      allStandings.forEach(doc => {
        if (doc.standings && doc.standings.length > 0) {
          doc.standings.forEach(standing => {
            const fighterId = standing.fighterId?.toString();
            if (fighterId && !seasonFighterIds.has(fighterId)) {
              console.log(`⚠️  Fighter ${fighterId} in standings but NOT in seasonMeta.leagueDivisions!`);
            }
          });
        }
      });

      // Get actual fighter names for the "leaders"
      console.log('\n👤 Looking up fighters shown as "leaders":\n');
      
      const leaderIds = [];
      for (const docs of Object.values(byDivision)) {
        for (const doc of docs) {
          if (doc.standings && doc.standings.length > 0) {
            const leader = doc.standings.find(s => s.rank === 1);
            if (leader) {
              leaderIds.push(leader.fighterId);
            }
          }
        }
      }

      if (leaderIds.length > 0) {
        const fighters = await Fighter.find({
          _id: { $in: leaderIds }
        }).select('firstName lastName _id');

        console.log('Fighters shown as division leaders:');
        fighters.forEach(f => {
          const count = leaderIds.filter(id => id.toString() === f._id.toString()).length;
          console.log(`   ${f.firstName} ${f.lastName} (${f._id})`);
          if (count > 1) {
            console.log(`      ⚠️  Appears as leader ${count} times!`);
          }
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSIS');
    console.log('='.repeat(70));

    if (allStandings.length === 0) {
      console.log('\n✅ ROOT CAUSE IDENTIFIED:');
      console.log('   No standings documents exist (correct - season hasn\'t started)');
      console.log('\n❌ FRONTEND BUG:');
      console.log('   CompetitionPage.tsx is showing incorrect "default" fighters');
      console.log('   when standings query returns empty/null');
      console.log('\n🔧 SOLUTION:');
      console.log('   Fix CompetitionPage to handle empty standings gracefully');
      console.log('   Options:');
      console.log('   1. Don\'t show fighters until fights are completed');
      console.log('   2. Show placeholder/empty state');
      console.log('   3. Show all division fighters instead of leaders');
    } else {
      console.log('\n⚠️  ISSUE: Standings exist before season started!');
      console.log('   This shouldn\'t happen - standings are created on first fight');
      console.log('   These may be leftover/incorrect data');
      console.log('\n🔧 SOLUTION:');
      console.log('   Consider deleting these standings documents and letting them');
      console.log('   regenerate correctly when fights are completed');
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
    await checkIFLS1Standings();
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

