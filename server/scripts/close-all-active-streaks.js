/**
 * Close All Active Streaks - Season 10 is Final Season
 * This script closes all active streaks for all fighters
 * For Season 10 fighters: closes at their last Season 10 fight
 * For relegated fighters: closes at their last fight in their final season
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPETITION_ID = '67780dcc09a4c4b25127f8f6';

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
 * Load all competition data from MongoDB
 */
async function loadAllCompetitions() {
  console.log(`📂 Loading all competition data from MongoDB...`);
  
  const competitions = await Competition.find({
    competitionMetaId: mongoose.Types.ObjectId.createFromHexString(COMPETITION_ID)
  }).lean();
  
  console.log(`✅ Loaded ${competitions.length} seasons`);
  return competitions;
}

/**
 * Find the last fight for a specific fighter across all competitions
 */
function findLastFightForFighter(fighterId, competitions) {
  let lastFight = null;
  let lastFightContext = null;
  
  // Sort competitions by season number
  const sortedCompetitions = [...competitions].sort((a, b) => 
    a.seasonMeta.seasonNumber - b.seasonMeta.seasonNumber
  );
  
  // Go through competitions from latest to earliest
  for (let i = sortedCompetitions.length - 1; i >= 0; i--) {
    const competition = sortedCompetitions[i];
    const seasonNumber = competition.seasonMeta.seasonNumber;
    
    // Check each division
    for (const division of competition.leagueData.divisions) {
      // Sort rounds chronologically
      const sortedRounds = [...division.rounds].sort((a, b) => b.roundNumber - a.roundNumber);
      
      // Go through rounds from latest to earliest
      for (const round of sortedRounds) {
        // Go through fights (no need to sort, just find any fight with this fighter)
        for (const fight of round.fights) {
          if (fight.fighter1 && fight.fighter2 && fight.winner) {
            const fighter1Id = fight.fighter1.toString();
            const fighter2Id = fight.fighter2.toString();
            
            if (fighter1Id === fighterId || fighter2Id === fighterId) {
              // Found a fight with this fighter
              if (!lastFight || 
                  seasonNumber > lastFightContext.season ||
                  (seasonNumber === lastFightContext.season && round.roundNumber > lastFightContext.round)) {
                lastFight = fight;
                lastFightContext = {
                  season: seasonNumber,
                  division: division.divisionNumber,
                  round: round.roundNumber,
                  _id: fight._id.toString()
                };
              }
            }
          }
        }
      }
    }
  }
  
  return lastFightContext;
}

/**
 * Close all active streaks
 */
async function closeAllActiveStreaks() {
  console.log('\n' + '='.repeat(70));
  console.log('CLOSE ALL ACTIVE STREAKS - SEASON 10 FINAL SEASON');
  console.log('='.repeat(70));
  
  try {
    // Connect to database
    await connectDB();
    
    // Load all competition data
    const competitions = await loadAllCompetitions();
    
    // Load all fighters with active streaks
    console.log('\n📂 Loading fighters with active streaks...');
    const fighters = await Fighter.find({
      'streaks': {
        $elemMatch: { 
          active: true,
          competitionId: mongoose.Types.ObjectId.createFromHexString(COMPETITION_ID)
        }
      }
    }).select('_id firstName lastName streaks').lean();
    
    console.log(`✅ Found ${fighters.length} fighters with active IFC streaks`);
    
    if (fighters.length === 0) {
      console.log('\n✅ No active streaks to close!');
      return;
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('PROCESSING FIGHTERS');
    console.log('='.repeat(70));
    
    let updatedCount = 0;
    let errorCount = 0;
    const updates = [];
    
    for (const fighter of fighters) {
      try {
        const fighterId = fighter._id.toString();
        const fighterName = `${fighter.firstName} ${fighter.lastName}`;
        
        // Find the last fight for this fighter
        const lastFightContext = findLastFightForFighter(fighterId, competitions);
        
        if (!lastFightContext) {
          console.warn(`  ⚠️  No fights found for ${fighterName}`);
          errorCount++;
          continue;
        }
        
        // Clone the streaks array
        const updatedStreaks = JSON.parse(JSON.stringify(fighter.streaks));
        
        // Find and close all active IFC streaks
        let closedCount = 0;
        updatedStreaks.forEach(streak => {
          if (streak.active && streak.competitionId.toString() === COMPETITION_ID) {
            streak.active = false;
            streak.end = lastFightContext;
            closedCount++;
          }
        });
        
        if (closedCount > 0) {
          console.log(`\n✓ ${fighterName}:`);
          console.log(`  - Closed ${closedCount} active streak(s)`);
          console.log(`  - Last fight: S${lastFightContext.season}-D${lastFightContext.division}-R${lastFightContext.round}`);
          
          // Update in database
          await Fighter.findByIdAndUpdate(
            fighter._id,
            { streaks: updatedStreaks }
          );
          
          updatedCount++;
          
          updates.push({
            fighterId,
            fighterName,
            closedStreaks: closedCount,
            lastFight: lastFightContext
          });
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${fighter.firstName} ${fighter.lastName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Updated: ${updatedCount} fighters`);
    console.log(`❌ Errors: ${errorCount} fighters`);
    
    // Statistics
    const season10Fighters = updates.filter(u => u.lastFight.season === 10);
    const relegatedFighters = updates.filter(u => u.lastFight.season < 10);
    
    console.log('\n📊 Statistics:');
    console.log(`   - Season 10 fighters: ${season10Fighters.length}`);
    console.log(`   - Relegated fighters: ${relegatedFighters.length}`);
    
    if (relegatedFighters.length > 0) {
      console.log('\n📋 Relegated Fighters (Last season < 10):');
      relegatedFighters.forEach(f => {
        console.log(`   - ${f.fighterName}: Last fight S${f.lastFight.season}-D${f.lastFight.division}-R${f.lastFight.round}`);
      });
    }
    
    // Show sample Season 10 closures
    console.log('\n📋 Sample Season 10 Closures (First 5):');
    season10Fighters.slice(0, 5).forEach(f => {
      console.log(`   - ${f.fighterName}: ${f.closedStreaks} streak(s) closed at S10-D${f.lastFight.division}-R${f.lastFight.round}`);
    });
    
    // Verify
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));
    
    const remainingActiveStreaks = await Fighter.countDocuments({
      'streaks': {
        $elemMatch: { 
          active: true,
          competitionId: mongoose.Types.ObjectId.createFromHexString(COMPETITION_ID)
        }
      }
    });
    
    console.log(`\n✅ Remaining active IFC streaks: ${remainingActiveStreaks}`);
    
    if (remainingActiveStreaks === 0) {
      console.log('🎉 All IFC streaks successfully closed!');
    } else {
      console.warn(`⚠️  Warning: ${remainingActiveStreaks} active streaks still remaining`);
    }
    
    // Save update summary to file
    const outputPath = path.join(__dirname, '../../old-data/closed-streaks-summary.json');
    fs.writeFileSync(outputPath, JSON.stringify(updates, null, 2));
    console.log(`\n📁 Update summary saved to: ${outputPath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ CLOSING COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nAll active IFC streaks have been closed.');
    console.log('Season 10 was the final season of IFC.');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the script
closeAllActiveStreaks()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

