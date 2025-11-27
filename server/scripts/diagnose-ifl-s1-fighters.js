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
    
    console.log(`✅ Connected to: ${connection.connection.db.databaseName}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();

    // Find IFL Meta
    const iflMeta = await CompetitionMeta.findOne({
      shortName: 'IFL'
    });

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

    console.log('\n' + '='.repeat(70));
    console.log('DETAILED IFL S1 FIGHTER DIAGNOSIS');
    console.log('='.repeat(70));

    console.log(`\nIFL S1 ID: ${iflS1._id}`);
    console.log(`Is Active: ${iflS1.isActive}`);

    // Check seasonMeta.leagueDivisions
    console.log('\n📊 seasonMeta.leagueDivisions:');
    if (!iflS1.seasonMeta.leagueDivisions) {
      console.log('   ❌ NULL or UNDEFINED');
    } else if (iflS1.seasonMeta.leagueDivisions.length === 0) {
      console.log('   ⚠️  EMPTY ARRAY (length: 0)');
      console.log('   This is the ROOT CAUSE - no fighters are assigned to divisions!');
    } else {
      console.log(`   ✅ Has ${iflS1.seasonMeta.leagueDivisions.length} divisions`);
      iflS1.seasonMeta.leagueDivisions.forEach(div => {
        console.log(`      Division ${div.divisionNumber}: ${div.fighters?.length || 0} fighters`);
      });
    }

    // Check fights - extract unique fighter IDs
    console.log('\n🥊 Analyzing Fights to Extract Fighter IDs:');
    const fighterIdsSet = new Set();
    const divisionFighters = {};

    if (iflS1.leagueData && iflS1.leagueData.divisions) {
      iflS1.leagueData.divisions.forEach(division => {
        const divNum = division.divisionNumber;
        divisionFighters[divNum] = new Set();

        if (division.rounds) {
          division.rounds.forEach(round => {
            if (round.fights) {
              round.fights.forEach(fight => {
                if (fight.fighter1) {
                  fighterIdsSet.add(fight.fighter1.toString());
                  divisionFighters[divNum].add(fight.fighter1.toString());
                }
                if (fight.fighter2) {
                  fighterIdsSet.add(fight.fighter2.toString());
                  divisionFighters[divNum].add(fight.fighter2.toString());
                }
              });
            }
          });
        }

        console.log(`   Division ${divNum}: ${divisionFighters[divNum].size} unique fighters in fights`);
      });
    }

    const totalUniqueFighters = fighterIdsSet.size;
    console.log(`\n   Total Unique Fighters Across All Fights: ${totalUniqueFighters}`);

    // Try to fetch fighter names
    if (totalUniqueFighters > 0) {
      console.log('\n👤 Fetching Fighter Details:');
      const fighterIds = Array.from(fighterIdsSet);
      const fighters = await Fighter.find({
        _id: { $in: fighterIds }
      }).select('name _id');

      console.log(`   Found ${fighters.length} fighters in database`);
      
      if (fighters.length < fighterIds.length) {
        console.log(`   ⚠️  Missing ${fighterIds.length - fighters.length} fighters!`);
      }

      // Show sample fighters per division
      console.log('\n📋 Sample Fighters Per Division:');
      for (const [divNum, fighterSet] of Object.entries(divisionFighters)) {
        console.log(`\n   Division ${divNum} (${fighterSet.size} fighters):`);
        const divFighterIds = Array.from(fighterSet).slice(0, 5); // First 5
        const divFighters = fighters.filter(f => divFighterIds.includes(f._id.toString()));
        divFighters.forEach(f => {
          console.log(`      - ${f.name} (${f._id})`);
        });
        if (fighterSet.size > 5) {
          console.log(`      ... and ${fighterSet.size - 5} more`);
        }
      }
    }

    // Check a sample fight
    console.log('\n🔍 Sample Fight from Division 1, Round 1:');
    if (iflS1.leagueData?.divisions?.[0]?.rounds?.[0]?.fights?.[0]) {
      const sampleFight = iflS1.leagueData.divisions[0].rounds[0].fights[0];
      console.log(`   Fight Identifier: ${sampleFight.fightIdentifier || 'N/A'}`);
      console.log(`   Fighter1 ID: ${sampleFight.fighter1}`);
      console.log(`   Fighter2 ID: ${sampleFight.fighter2}`);
      console.log(`   Winner: ${sampleFight.winner || 'Not set'}`);
      console.log(`   Status: ${sampleFight.fightStatus}`);
      console.log(`   Date: ${sampleFight.date || 'Not set'}`);
    }

    // THE KEY ISSUE
    console.log('\n' + '='.repeat(70));
    console.log('ROOT CAUSE IDENTIFIED');
    console.log('='.repeat(70));

    if (!iflS1.seasonMeta.leagueDivisions || iflS1.seasonMeta.leagueDivisions.length === 0) {
      console.log('\n❌ PROBLEM: seasonMeta.leagueDivisions is EMPTY');
      console.log('\n📝 EXPLANATION:');
      console.log('   - The fights exist and have valid fighter IDs');
      console.log('   - BUT seasonMeta.leagueDivisions[] is empty');
      console.log('   - This array should contain the list of fighters per division');
      console.log('   - Without it, the frontend doesn\'t know which fighters belong to which division');
      console.log('   - Standings pages, division pages, etc. will fail');
      
      console.log('\n🔧 SOLUTION:');
      console.log('   We need to populate seasonMeta.leagueDivisions with fighter IDs');
      console.log('   I can create a fix script that extracts fighter IDs from the fights');
      console.log('   and populates the seasonMeta.leagueDivisions array correctly.');
      
      console.log('\n💡 IMPACT ON STARTING SEASON:');
      console.log('   🚨 YES, this will cause problems:');
      console.log('      - Standings won\'t show fighters');
      console.log('      - Division pages may show "No fighters"');
      console.log('      - Fight results may not update standings properly');
      console.log('      - Fighter cards may not link correctly');
    } else {
      console.log('\n✅ seasonMeta.leagueDivisions is properly populated');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

main();

