/**
 * Calculate Fighter Debuts Script
 * 
 * This script calculates debut information for all fighters by:
 * 1. Traversing through all competitions and seasons
 * 2. Finding the first fight for each fighter (by date)
 * 3. Updating the fighter's debutInformation field with:
 *    - competitionId (competitionMetaId)
 *    - season (seasonNumber)
 *    - fightId (the first fight's ID)
 *    - dateOfDebut (the date of the first fight)
 * 
 * Run this after all season data is imported to MongoDB.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';

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
 * Main function to calculate and update fighter debuts
 */
async function calculateFighterDebuts() {
  console.log('\n' + '='.repeat(70));
  console.log('CALCULATE FIGHTER DEBUTS');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Step 1: Fetch all competitions (seasons)
    console.log('\n📥 Fetching all competitions from MongoDB...');
    const competitions = await Competition.find({}).sort({ 
      competitionMetaId: 1,
      'seasonMeta.seasonNumber': 1 
    });
    console.log(`✅ Found ${competitions.length} competition seasons\n`);

    // Step 2: Create a map to track each fighter's debut
    // Structure: { fighterId: { competitionId, season, fightId, dateOfDebut } }
    const fighterDebuts = new Map();

    console.log('='.repeat(70));
    console.log('PROCESSING ALL FIGHTS');
    console.log('='.repeat(70));

    let totalFightsProcessed = 0;
    let totalFightersTracked = new Set();

    // Step 3: Process all competitions
    for (const competition of competitions) {
      const competitionMetaId = competition.competitionMetaId;
      const seasonNumber = competition.seasonMeta.seasonNumber;
      
      console.log(`\n🏆 Competition: ${competitionMetaId}, Season: ${seasonNumber}`);

      let seasonFightsCount = 0;

      // Process league competitions
      if (competition.leagueData && competition.leagueData.divisions) {
        for (const division of competition.leagueData.divisions) {
          const divisionNumber = division.divisionNumber;
          
          for (const round of division.rounds) {
            for (const fight of round.fights) {
              // Process all completed fights (with or without dates)
              if (fight.fightStatus === 'completed') {
                seasonFightsCount++;
                totalFightsProcessed++;

                // Process both fighters
                const fighters = [fight.fighter1, fight.fighter2];
                
                for (const fighterId of fighters) {
                  const fighterIdStr = fighterId.toString();
                  totalFightersTracked.add(fighterIdStr);

                  const currentDebut = fighterDebuts.get(fighterIdStr);
                  
                  // Determine if this fight should be the debut
                  let shouldUpdate = false;
                  
                  if (!currentDebut) {
                    // No debut recorded yet
                    shouldUpdate = true;
                  } else {
                    // Compare seasons first (lower season number = earlier)
                    if (seasonNumber < currentDebut.season) {
                      shouldUpdate = true;
                    } else if (seasonNumber === currentDebut.season) {
                      // Same season - compare dates if both exist
                      if (fight.date && currentDebut.dateOfDebut) {
                        if (new Date(fight.date) < new Date(currentDebut.dateOfDebut)) {
                          shouldUpdate = true;
                        }
                      }
                    }
                  }
                  
                  if (shouldUpdate) {
                    fighterDebuts.set(fighterIdStr, {
                      competitionId: competitionMetaId,
                      season: seasonNumber,
                      fightId: fight._id,
                      dateOfDebut: fight.date || null
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Process cup competitions
      if (competition.cupData && competition.cupData.fights) {
        for (const fight of competition.cupData.fights) {
          // Process all completed fights (with or without dates)
          if (fight.fightStatus === 'completed') {
            seasonFightsCount++;
            totalFightsProcessed++;

            // Process both fighters
            const fighters = [fight.fighter1, fight.fighter2];
            
            for (const fighterId of fighters) {
              const fighterIdStr = fighterId.toString();
              totalFightersTracked.add(fighterIdStr);

              const currentDebut = fighterDebuts.get(fighterIdStr);
              
              // Determine if this fight should be the debut
              let shouldUpdate = false;
              
              if (!currentDebut) {
                // No debut recorded yet
                shouldUpdate = true;
              } else {
                // Compare seasons first (lower season number = earlier)
                if (seasonNumber < currentDebut.season) {
                  shouldUpdate = true;
                } else if (seasonNumber === currentDebut.season) {
                  // Same season - compare dates if both exist
                  if (fight.date && currentDebut.dateOfDebut) {
                    if (new Date(fight.date) < new Date(currentDebut.dateOfDebut)) {
                      shouldUpdate = true;
                    }
                  }
                }
              }
              
              if (shouldUpdate) {
                fighterDebuts.set(fighterIdStr, {
                  competitionId: competitionMetaId,
                  season: seasonNumber,
                  fightId: fight._id,
                  dateOfDebut: fight.date || null
                });
              }
            }
          }
        }
      }

      console.log(`   ✅ Processed ${seasonFightsCount} fights`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY OF FIGHT PROCESSING');
    console.log('='.repeat(70));
    console.log(`✅ Total fights processed: ${totalFightsProcessed}`);
    console.log(`✅ Unique fighters tracked: ${totalFightersTracked.size}`);
    console.log(`✅ Fighters with debut data: ${fighterDebuts.size}\n`);

    // Step 4: Update all fighters with their debut information
    console.log('='.repeat(70));
    console.log('UPDATING FIGHTERS IN DATABASE');
    console.log('='.repeat(70));

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [fighterId, debutInfo] of fighterDebuts.entries()) {
      try {
        const result = await Fighter.findByIdAndUpdate(
          fighterId,
          {
            $set: {
              debutInformation: debutInfo
            }
          },
          { new: true }
        );

        if (result) {
          updatedCount++;
          if (updatedCount % 10 === 0) {
            console.log(`   Updated ${updatedCount}/${fighterDebuts.size} fighters...`);
          }
        } else {
          skippedCount++;
          console.warn(`   ⚠️  Fighter ${fighterId} not found in database`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error updating fighter ${fighterId}:`, error.message);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} fighters`);
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} fighters (not found)`);
    }
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} fighters`);
    }

    // Step 5: Verification
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const fightersWithDebut = await Fighter.countDocuments({
      'debutInformation.competitionId': { $exists: true }
    });

    console.log(`\n✅ Fighters with debut information: ${fightersWithDebut}`);

    // Show sample debut data
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE DEBUT DATA');
    console.log('='.repeat(70));

    const sampleFighters = await Fighter.find({
      'debutInformation.competitionId': { $exists: true }
    })
    .limit(5)
    .sort({ 'debutInformation.dateOfDebut': 1 });

    console.log('\n🥊 First 5 fighters (by debut season and date):');
    for (const fighter of sampleFighters) {
      console.log(`\n   👤 ${fighter.firstName} ${fighter.lastName}`);
      console.log(`      Competition: ${fighter.debutInformation.competitionId}`);
      console.log(`      Season: ${fighter.debutInformation.season}`);
      if (fighter.debutInformation.dateOfDebut) {
        console.log(`      Date: ${new Date(fighter.debutInformation.dateOfDebut).toLocaleDateString()}`);
      } else {
        console.log(`      Date: Not recorded (early season)`);
      }
      console.log(`      Fight ID: ${fighter.debutInformation.fightId}`);
    }

    // Show statistics by competition
    console.log('\n' + '='.repeat(70));
    console.log('DEBUTS BY COMPETITION');
    console.log('='.repeat(70));

    const debutsByCompetition = await Fighter.aggregate([
      {
        $match: {
          'debutInformation.competitionId': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$debutInformation.competitionId',
          count: { $sum: 1 },
          earliestDebut: { $min: '$debutInformation.dateOfDebut' },
          latestDebut: { $max: '$debutInformation.dateOfDebut' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📊 Debut statistics by competition:');
    for (const stat of debutsByCompetition) {
      console.log(`\n   Competition: ${stat._id}`);
      console.log(`   Fighters debuted: ${stat.count}`);
      if (stat.earliestDebut) {
        console.log(`   Earliest debut: ${new Date(stat.earliestDebut).toLocaleDateString()}`);
      } else {
        console.log(`   Earliest debut: Not recorded`);
      }
      if (stat.latestDebut) {
        console.log(`   Latest debut: ${new Date(stat.latestDebut).toLocaleDateString()}`);
      } else {
        console.log(`   Latest debut: Not recorded`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ DEBUT CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nAll fighters have been updated with their debut information.');
    console.log('The debutInformation field now contains:');
    console.log('  - competitionId: The competition where they debuted');
    console.log('  - season: The season number of their debut');
    console.log('  - fightId: The ID of their first fight');
    console.log('  - dateOfDebut: The date of their first fight\n');

  } catch (error) {
    console.error('\n❌ Debut calculation failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the calculation
calculateFighterDebuts();

