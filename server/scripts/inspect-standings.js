#!/usr/bin/env node

/**
 * Inspect Standings Script
 * 
 * This script helps you understand how standings are populated fight-by-fight
 * 
 * Usage:
 *   node scripts/inspect-standings.js [competitionShortName] [seasonNumber] [divisionNumber] [roundNumber]
 *   
 * Example:
 *   node scripts/inspect-standings.js IFC 7 1 6
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env' });

const CompetitionMetaSchema = new mongoose.Schema({
  competitionName: String,
  shortName: String,
  type: String
});

const CompetitionSchema = new mongoose.Schema({}, { strict: false });
const RoundStandingsSchema = new mongoose.Schema({}, { strict: false });

const CompetitionMeta = mongoose.model('CompetitionMeta', CompetitionMetaSchema);
const Competition = mongoose.model('Competition', CompetitionSchema);
const RoundStandings = mongoose.model('RoundStandings', RoundStandingsSchema);

async function inspectStandings() {
  try {
    // Parse command line arguments
    const competitionShortName = process.argv[2] || 'IFC';
    const seasonNumber = parseInt(process.argv[3]) || 7;
    const divisionNumber = parseInt(process.argv[4]) || 1;
    const roundNumber = parseInt(process.argv[5]) || 6;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           STANDINGS INSPECTION TOOL                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`📋 Parameters:`);
    console.log(`   - Competition: ${competitionShortName}`);
    console.log(`   - Season: ${seasonNumber}`);
    console.log(`   - Division: ${divisionNumber}`);
    console.log(`   - Round: ${roundNumber}\n`);

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get competition meta
    const competitionMeta = await CompetitionMeta.findOne({ 
      shortName: competitionShortName 
    });
    
    if (!competitionMeta) {
      console.log(`❌ Competition "${competitionShortName}" not found`);
      process.exit(1);
    }

    console.log('🏆 Competition Found:');
    console.log(`   - ID: ${competitionMeta._id}`);
    console.log(`   - Name: ${competitionMeta.competitionName}`);
    console.log(`   - Type: ${competitionMeta.type}\n`);

    // Get season
    const season = await Competition.findOne({
      competitionMetaId: competitionMeta._id,
      'seasonMeta.seasonNumber': seasonNumber
    });

    if (!season) {
      console.log(`❌ Season ${seasonNumber} not found`);
      process.exit(1);
    }

    console.log('📅 Season Found:');
    console.log(`   - Season ID: ${season._id}`);
    console.log(`   - Season Number: ${season.seasonMeta.seasonNumber}`);
    console.log(`   - Is Active: ${season.isActive}\n`);

    // Get division
    const division = season.leagueData?.divisions?.find(
      d => d.divisionNumber === divisionNumber
    );

    if (!division) {
      console.log(`❌ Division ${divisionNumber} not found`);
      process.exit(1);
    }

    console.log('🥋 Division Found:');
    console.log(`   - Name: ${division.divisionName}`);
    console.log(`   - Total Rounds: ${division.totalRounds}`);
    console.log(`   - Current Round: ${division.currentRound}\n`);

    // Get round
    const round = division.rounds?.find(r => r.roundNumber === roundNumber);

    if (!round) {
      console.log(`❌ Round ${roundNumber} not found`);
      process.exit(1);
    }

    console.log('🎯 Round Found:');
    console.log(`   - Round Number: ${round.roundNumber}`);
    console.log(`   - Number of Fights: ${round.fights?.length || 0}\n`);

    // Display fights
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🥊 FIGHTS IN THIS ROUND:\n');
    
    if (round.fights && round.fights.length > 0) {
      round.fights.forEach((fight, idx) => {
        const status = fight.fightStatus === 'completed' ? '✅' : '⏳';
        console.log(`${status} Fight ${idx + 1}: ${fight.fightIdentifier}`);
        console.log(`   Status: ${fight.fightStatus || 'scheduled'}`);
        console.log(`   Fighter1: ${fight.fighter1}`);
        console.log(`   Fighter2: ${fight.fighter2}`);
        console.log(`   Winner: ${fight.winner || 'TBD'}`);
        
        if (fight.date) {
          console.log(`   Date: ${new Date(fight.date).toLocaleString()}`);
        }
        console.log();
      });
    }

    // Get all standings for this round
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📊 STANDINGS DOCUMENTS (Fight-by-Fight):\n');

    const roundStandings = await RoundStandings.find({
      competitionId: competitionMeta._id,
      seasonNumber: seasonNumber,
      divisionNumber: divisionNumber,
      roundNumber: roundNumber
    }).sort({ fightIdentifier: 1 });

    console.log(`Found ${roundStandings.length} standings documents for Round ${roundNumber}\n`);

    if (roundStandings.length > 0) {
      roundStandings.forEach((standing, idx) => {
        console.log(`┌─────────────────────────────────────────────────────────────┐`);
        console.log(`│ Standing #${idx + 1}: After ${standing.fightIdentifier.padEnd(47)}│`);
        console.log(`└─────────────────────────────────────────────────────────────┘`);
        
        if (standing.standings && standing.standings.length > 0) {
          console.log(`\n   Total Fighters: ${standing.standings.length}\n`);
          console.log('   Top 5 Fighters:');
          console.log('   ┌──────┬───────────────┬────────┬──────┬────────┐');
          console.log('   │ Rank │   Fighter ID  │ Fights │ Wins │ Points │');
          console.log('   ├──────┼───────────────┼────────┼──────┼────────┤');
          
          standing.standings.slice(0, 5).forEach(s => {
            const trophy = s.rank === 1 ? ' 🏆' : '';
            const fighterId = s.fighterId.toString().substring(18, 24); // Last 6 chars
            console.log(`   │  ${String(s.rank).padStart(2)}  │ ...${fighterId}  │   ${String(s.fightsCount).padStart(2)}   │  ${String(s.wins).padStart(2)}  │   ${String(s.points).padStart(2)}   │${trophy}`);
          });
          
          console.log('   └──────┴───────────────┴────────┴──────┴────────┘');
        }
        
        console.log();
      });

      // Show the final standings (what the UI displays)
      const finalStanding = roundStandings[roundStandings.length - 1];
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log(`\n🎯 FINAL STANDINGS FOR ROUND ${roundNumber}:`);
      console.log(`   (This is what the UI shows when user selects Round ${roundNumber})\n`);
      console.log(`   Based on: ${finalStanding.fightIdentifier} (last fight of the round)\n`);
      
      if (finalStanding.standings && finalStanding.standings.length > 0) {
        console.log('   Complete Rankings:');
        console.log('   ┌──────┬───────────────┬────────┬──────┬────────┐');
        console.log('   │ Rank │   Fighter ID  │ Fights │ Wins │ Points │');
        console.log('   ├──────┼───────────────┼────────┼──────┼────────┤');
        
        finalStanding.standings.forEach(s => {
          const trophy = s.rank === 1 ? ' 🏆' : '';
          const promoted = s.rank <= 3 && roundNumber === division.totalRounds ? ' ⬆️' : '';
          const relegated = s.rank >= finalStanding.standings.length - 2 && roundNumber === division.totalRounds ? ' ⬇️' : '';
          const fighterId = s.fighterId.toString().substring(18, 24);
          console.log(`   │  ${String(s.rank).padStart(2)}  │ ...${fighterId}  │   ${String(s.fightsCount).padStart(2)}   │  ${String(s.wins).padStart(2)}  │   ${String(s.points).padStart(2)}   │${trophy}${promoted}${relegated}`);
        });
        
        console.log('   └──────┴───────────────┴────────┴──────┴────────┘');
        
        if (roundNumber === division.totalRounds) {
          console.log('\n   Legend: 🏆 Champion | ⬆️ Promoted | ⬇️ Relegated');
        }
      }
    } else {
      console.log('❌ No standings documents found for this round');
      console.log('\nPossible reasons:');
      console.log('   - No fights have been completed yet');
      console.log('   - Standings were not calculated (bug/error)');
      console.log('   - Wrong competition/season/division/round parameters');
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('✅ Inspection Complete!\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
inspectStandings();

