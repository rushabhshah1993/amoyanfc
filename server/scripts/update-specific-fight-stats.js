/**
 * Update specific fight statistics - finishing moves and significant strikes
 * This script updates the finishingMove and significantStrikes fields for specific fights
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Fighter } from '../models/fighter.model.js';

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
 * Updates to be made to fights
 * Each entry contains:
 * - fightId: MongoDB ObjectId as string
 * - fighterName: Name of the fighter whose stats need updating
 * - finishingMove: The finishing move to set (if applicable)
 * - significantStrikes: Significant strikes data to update (if applicable)
 */
const FIGHT_UPDATES = [
  {
    fightId: '68f38270761a2d83b46c04ad',
    fighterName: 'Drishti',
    finishingMove: 'Elbow strikes to the face'
  },
  {
    fightId: '68f38270761a2d83b46c04b4',
    fighterName: 'Kanchan',
    finishingMove: 'Rear Naked Choke'
  },
  {
    fightId: '68f38270761a2d83b46c04b6',
    fighterName: 'Aashna',
    finishingMove: 'Roundhouse kick to the face'
  },
  {
    fightId: '68f38270761a2d83b46c04b9',
    fighterName: 'Shraddha',
    finishingMove: 'Rear Naked Choke'
  },
  {
    fightId: '68f38270761a2d83b46c04ba',
    updates: [
      {
        fighterName: 'Mridula',
        significantStrikes: {
          attempted: 52,
          defended: 4,
          landed: 40,
          accuracy: 76.92
        }
      },
      {
        fighterName: 'Bandgee',
        significantStrikes: {
          attempted: 14,
          landed: 5,
          defended: 5,
          accuracy: 35.71
        }
      }
    ]
  },
  {
    fightId: '68f38270761a2d83b46c04bf',
    fighterName: 'Drishti',
    finishingMove: 'Ground and pound'
  },
  {
    fightId: '68f38270761a2d83b46c04c0',
    fighterName: 'Isha Haria',
    finishingMove: 'Leg lock + rear naked choke'
  },
  {
    fightId: '68f38270761a2d83b46c04d6',
    fighterName: 'Aashna',
    finishingMove: 'Rear Naked Choke'
  },
  {
    fightId: '68f38270761a2d83b46c0459',
    fighterName: 'Amruta',
    finishingMove: 'Guillotine Choke'
  }
];

/**
 * Find a fight within all competitions
 */
async function findFight(fightId) {
  const competitions = await Competition.find({});
  
  for (const competition of competitions) {
    if (!competition.leagueData || !competition.leagueData.divisions) {
      continue;
    }
    
    for (const division of competition.leagueData.divisions) {
      if (!division.rounds) continue;
      
      for (const round of division.rounds) {
        if (!round.fights) continue;
        
        for (const fight of round.fights) {
          if (fight._id.toString() === fightId) {
            return {
              competition,
              division,
              round,
              fight
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Get fighter name from fighter ID
 */
async function getFighterName(fighterId) {
  const Fighter = mongoose.model('Fighter');
  const fighter = await Fighter.findById(fighterId);
  return fighter ? fighter.name : null;
}

/**
 * Get fighter ID from fighter name
 * (fighters are stored with firstName and lastName fields)
 * Supports both "FirstName" and "FirstName LastName" formats
 */
async function getFighterIdByName(fighterName) {
  const Fighter = mongoose.model('Fighter');
  
  // Check if full name provided (firstName + lastName)
  const nameParts = fighterName.trim().split(' ');
  
  if (nameParts.length > 1) {
    // Full name provided - search by both firstName and lastName
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const fighter = await Fighter.findOne({ firstName, lastName });
    return fighter ? fighter._id.toString() : null;
  } else {
    // Only first name provided
    const fighter = await Fighter.findOne({ firstName: fighterName });
    return fighter ? fighter._id.toString() : null;
  }
}

/**
 * Ensure stats object has all required nested structures
 */
function ensureStatsStructure(stats) {
  if (!stats.grappling) {
    stats.grappling = { accuracy: 0, defence: 0 };
  }
  if (!stats.significantStrikes) {
    stats.significantStrikes = {
      accuracy: 0,
      attempted: 0,
      defence: 0,
      landed: 0,
      landedPerMinute: 0,
      positions: { clinching: 0, ground: 0, standing: 0 }
    };
  }
  if (!stats.significantStrikes.positions) {
    stats.significantStrikes.positions = { clinching: 0, ground: 0, standing: 0 };
  }
  if (!stats.strikeMap) {
    stats.strikeMap = {
      head: { absorb: 0, strike: 0 },
      torso: { absorb: 0, strike: 0 },
      leg: { absorb: 0, strike: 0 }
    };
  }
  if (!stats.submissions) {
    stats.submissions = { attemptsPer15Mins: 0, average: 0 };
  }
  if (!stats.takedowns) {
    stats.takedowns = {
      accuracy: 0,
      attempted: 0,
      avgTakedownsLandedPerMin: 0,
      defence: 0,
      landed: 0
    };
  }
  if (stats.fightTime === undefined) {
    stats.fightTime = 0;
  }
  if (stats.finishingMove === undefined) {
    stats.finishingMove = null;
  }
}

/**
 * Initialize fighterStats array if empty with default values
 */
function initializeFighterStats(fight) {
  if (!fight.fighterStats) {
    fight.fighterStats = [];
  }
  
  if (fight.fighterStats.length === 0) {
    // Create stats for fighter1 with default values
    fight.fighterStats.push({
      fighterId: fight.fighter1,
      stats: {
        fightTime: 0,
        finishingMove: null,
        grappling: {
          accuracy: 0,
          defence: 0
        },
        significantStrikes: {
          accuracy: 0,
          attempted: 0,
          defence: 0,
          landed: 0,
          landedPerMinute: 0,
          positions: {
            clinching: 0,
            ground: 0,
            standing: 0
          }
        },
        strikeMap: {
          head: { absorb: 0, strike: 0 },
          torso: { absorb: 0, strike: 0 },
          leg: { absorb: 0, strike: 0 }
        },
        submissions: {
          attemptsPer15Mins: 0,
          average: 0
        },
        takedowns: {
          accuracy: 0,
          attempted: 0,
          avgTakedownsLandedPerMin: 0,
          defence: 0,
          landed: 0
        }
      }
    });
    
    // Create stats for fighter2 with default values
    fight.fighterStats.push({
      fighterId: fight.fighter2,
      stats: {
        fightTime: 0,
        finishingMove: null,
        grappling: {
          accuracy: 0,
          defence: 0
        },
        significantStrikes: {
          accuracy: 0,
          attempted: 0,
          defence: 0,
          landed: 0,
          landedPerMinute: 0,
          positions: {
            clinching: 0,
            ground: 0,
            standing: 0
          }
        },
        strikeMap: {
          head: { absorb: 0, strike: 0 },
          torso: { absorb: 0, strike: 0 },
          leg: { absorb: 0, strike: 0 }
        },
        submissions: {
          attemptsPer15Mins: 0,
          average: 0
        },
        takedowns: {
          accuracy: 0,
          attempted: 0,
          avgTakedownsLandedPerMin: 0,
          defence: 0,
          landed: 0
        }
      }
    });
    
    console.log(`   ℹ️  Initialized empty fighterStats array with default values`);
  } else {
    // Ensure all existing fighter stats have complete structures
    for (const fighterStat of fight.fighterStats) {
      if (!fighterStat.stats) {
        fighterStat.stats = {};
      }
      ensureStatsStructure(fighterStat.stats);
    }
  }
}

/**
 * Update a fight's finishing move for a specific fighter
 */
async function updateFinishingMove(fightData, fighterName, finishingMove) {
  const { competition, fight } = fightData;
  
  // Initialize fighterStats if empty
  initializeFighterStats(fight);
  
  // Get fighter ID by name
  const targetFighterId = await getFighterIdByName(fighterName);
  
  if (!targetFighterId) {
    console.log(`⚠️  Fighter "${fighterName}" not found in database`);
    return false;
  }
  
  // Find the fighter stat by comparing fighter IDs
  for (const fighterStat of fight.fighterStats) {
    const statFighterId = fighterStat.fighterId.toString();
    
    if (statFighterId === targetFighterId) {
      if (!fighterStat.stats) {
        fighterStat.stats = {};
      }
      
      // Ensure complete stats structure
      ensureStatsStructure(fighterStat.stats);
      
      const oldFinishingMove = fighterStat.stats.finishingMove;
      fighterStat.stats.finishingMove = finishingMove;
      
      console.log(`   ✓ Updated finishingMove for ${fighterName}`);
      console.log(`     Old: ${oldFinishingMove || 'null'}`);
      console.log(`     New: ${finishingMove}`);
      
      return true;
    }
  }
  
  console.log(`⚠️  Fighter ${fighterName} (ID: ${targetFighterId}) not found in fight stats`);
  return false;
}

/**
 * Update a fight's significant strikes for a specific fighter
 */
async function updateSignificantStrikes(fightData, fighterName, significantStrikes) {
  const { competition, fight } = fightData;
  
  // Initialize fighterStats if empty
  initializeFighterStats(fight);
  
  // Get fighter ID by name
  const targetFighterId = await getFighterIdByName(fighterName);
  
  if (!targetFighterId) {
    console.log(`⚠️  Fighter "${fighterName}" not found in database`);
    return false;
  }
  
  // Find the fighter stat by comparing fighter IDs
  for (const fighterStat of fight.fighterStats) {
    const statFighterId = fighterStat.fighterId.toString();
    
    if (statFighterId === targetFighterId) {
      if (!fighterStat.stats) {
        fighterStat.stats = {};
      }
      
      // Ensure complete stats structure
      ensureStatsStructure(fighterStat.stats);
      
      // Update the significant strikes fields
      if (significantStrikes.attempted !== undefined) {
        fighterStat.stats.significantStrikes.attempted = significantStrikes.attempted;
      }
      if (significantStrikes.landed !== undefined) {
        fighterStat.stats.significantStrikes.landed = significantStrikes.landed;
      }
      if (significantStrikes.defended !== undefined) {
        fighterStat.stats.significantStrikes.defence = significantStrikes.defended;
      }
      if (significantStrikes.accuracy !== undefined) {
        fighterStat.stats.significantStrikes.accuracy = significantStrikes.accuracy;
      }
      
      console.log(`   ✓ Updated significantStrikes for ${fighterName}`);
      console.log(`     Attempted: ${significantStrikes.attempted || 'unchanged'}`);
      console.log(`     Landed: ${significantStrikes.landed || 'unchanged'}`);
      console.log(`     Defended: ${significantStrikes.defended || 'unchanged'}`);
      console.log(`     Accuracy: ${significantStrikes.accuracy || 'unchanged'}%`);
      
      return true;
    }
  }
  
  console.log(`⚠️  Fighter ${fighterName} (ID: ${targetFighterId}) not found in fight stats`);
  return false;
}

/**
 * Main function to update all fight statistics
 */
async function updateFightStats() {
  console.log('\n' + '='.repeat(70));
  console.log('UPDATE FIGHT STATISTICS');
  console.log('='.repeat(70));
  
  try {
    // Connect to database
    await connectDB();
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    console.log(`\n📊 Processing ${FIGHT_UPDATES.length} fight updates...\n`);
    
    for (const update of FIGHT_UPDATES) {
      console.log(`\n🥊 Processing fight ${update.fightId}...`);
      
      // Find the fight
      const fightData = await findFight(update.fightId);
      
      if (!fightData) {
        console.log(`❌ Fight ${update.fightId} not found!`);
        notFoundCount++;
        continue;
      }
      
      let modified = false;
      
      // Handle simple finishing move update
      if (update.finishingMove) {
        const updated = await updateFinishingMove(fightData, update.fighterName, update.finishingMove);
        if (updated) modified = true;
      }
      
      // Handle multiple updates (like significant strikes for multiple fighters)
      if (update.updates) {
        for (const fighterUpdate of update.updates) {
          if (fighterUpdate.significantStrikes) {
            const updated = await updateSignificantStrikes(
              fightData, 
              fighterUpdate.fighterName, 
              fighterUpdate.significantStrikes
            );
            if (updated) modified = true;
          }
          if (fighterUpdate.finishingMove) {
            const updated = await updateFinishingMove(
              fightData, 
              fighterUpdate.fighterName, 
              fighterUpdate.finishingMove
            );
            if (updated) modified = true;
          }
        }
      }
      
      // Save the competition if modified
      if (modified) {
        await fightData.competition.save();
        console.log(`   ✅ Saved changes to database`);
        updatedCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully updated: ${updatedCount} fights`);
    console.log(`❌ Not found: ${notFoundCount} fights`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error updating fight stats:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
updateFightStats()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

