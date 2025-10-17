/**
 * Fix Season 7 Opponent History - Add Missing fightIds
 * This script queries the Season 7 competition data to get fight ObjectIds
 * and updates the opponent history details with the correct fightIds
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function fixSeason7FightIds() {
  console.log('\n' + '='.repeat(70));
  console.log('FIX SEASON 7 OPPONENT HISTORY - ADD FIGHT IDS');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Step 1: Load Season 7 competition data
    console.log('\n📂 Loading Season 7 competition data...');
    const season7Competition = await Competition.findOne({
      'seasonMeta.seasonNumber': 7
    });

    if (!season7Competition) {
      console.error('❌ Season 7 competition not found!');
      return;
    }

    console.log(`✅ Found Season 7 competition: ${season7Competition._id}`);

    // Step 2: Build a map of fightIdentifier -> fightId (ObjectId)
    console.log('\n📊 Building fight identifier map...');
    const fightIdMap = new Map();
    
    season7Competition.leagueData.divisions.forEach(division => {
      division.rounds.forEach(round => {
        round.fights.forEach(fight => {
          if (fight.fightIdentifier) {
            fightIdMap.set(fight.fightIdentifier, fight._id.toString());
          }
        });
      });
    });

    console.log(`✅ Mapped ${fightIdMap.size} fight identifiers to ObjectIds`);

    // Step 3: Find all fighters with Season 7 opponent history
    console.log('\n📥 Loading fighters with Season 7 data...');
    const fighters = await Fighter.find({
      'opponentsHistory.details': {
        $elemMatch: { season: 7 }
      }
    });

    console.log(`✅ Found ${fighters.length} fighters with Season 7 data`);

    console.log('\n⚠️  This will UPDATE opponent history with fightIds');
    console.log('   Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Update each fighter's opponent history
    console.log('\n🔧 Updating opponent history...');
    let updatedFighters = 0;
    let updatedDetails = 0;
    let missingFightIds = 0;

    for (const fighter of fighters) {
      let fighterModified = false;

      fighter.opponentsHistory.forEach(opponent => {
        opponent.details.forEach(detail => {
          if (detail.season === 7 && !detail.fightId) {
            // Build the fightIdentifier from the detail info
            const fightIdentifier = `S${detail.season}-D${detail.divisionId}-R${detail.roundId}`;
            
            // Find the specific fight - we need to match fighter IDs too
            // Since we don't have the fight number in details, we need to find it differently
            let foundFightId = null;
            
            // Search through the fight map for fights in this round
            for (const [identifier, fightId] of fightIdMap.entries()) {
              if (identifier.startsWith(fightIdentifier)) {
                // Get the actual fight to check fighter IDs
                const fight = season7Competition.leagueData.divisions
                  .find(d => d.divisionNumber === detail.divisionId)
                  ?.rounds.find(r => r.roundNumber === detail.roundId)
                  ?.fights.find(f => f.fightIdentifier === identifier);
                
                if (fight) {
                  // Check if this fighter was in this fight
                  if (fight.fighter1.toString() === fighter._id.toString() ||
                      fight.fighter2.toString() === fighter._id.toString()) {
                    // Check if the opponent matches
                    const fightOpponentId = fight.fighter1.toString() === fighter._id.toString() 
                      ? fight.fighter2.toString() 
                      : fight.fighter1.toString();
                    
                    if (fightOpponentId === opponent.opponentId.toString()) {
                      foundFightId = fightId;
                      break;
                    }
                  }
                }
              }
            }
            
            if (foundFightId) {
              detail.fightId = foundFightId;
              fighterModified = true;
              updatedDetails++;
            } else {
              missingFightIds++;
              console.warn(`  ⚠️  Could not find fightId for ${fighter.firstName} ${fighter.lastName} vs opponent ${opponent.opponentId} in S${detail.season}-D${detail.divisionId}-R${detail.roundId}`);
            }
          }
        });
      });

      if (fighterModified) {
        await fighter.save();
        updatedFighters++;
        
        if (updatedFighters % 10 === 0) {
          console.log(`   Progress: ${updatedFighters}/${fighters.length} fighters updated`);
        }
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   - Fighters updated: ${updatedFighters}`);
    console.log(`   - Details updated: ${updatedDetails}`);
    console.log(`   - Missing fightIds: ${missingFightIds}`);

    // Step 5: Verify the fix
    console.log('\n📊 Verifying fix...');
    const stillMissing = await Fighter.countDocuments({
      'opponentsHistory.details': {
        $elemMatch: { 
          season: 7,
          fightId: { $exists: false }
        }
      }
    });

    if (stillMissing === 0) {
      console.log('✅ All Season 7 details now have fightIds!');
    } else {
      console.warn(`⚠️  ${stillMissing} fighters still have Season 7 details without fightIds`);
    }

  } catch (error) {
    console.error('\n❌ Fix failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed\n');
  }
}

fixSeason7FightIds();

