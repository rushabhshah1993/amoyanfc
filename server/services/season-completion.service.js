/**
 * Season Completion Service
 * Validates if all three competitions (IFC, CC, IC) for a season are completed
 * This is required before calculating global rankings
 */

import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import mongoose from 'mongoose';

// Competition Meta IDs (from competition-meta-export.json)
// Used for finding CC and IC by their specific IDs
const COMPETITION_IDS = {
  CHAMPIONS_CUP: '6778100309a4c4b25127f8fa',
  INVICTA_CUP: '6778103309a4c4b25127f8fc'
};

/**
 * Check if a league competition season is completed
 * A league is complete when all divisions have completed their final round
 */
const isLeagueSeasonCompleted = (leagueCompetition) => {
  if (!leagueCompetition.leagueData || !leagueCompetition.leagueData.divisions) {
    return false;
  }

  const divisions = leagueCompetition.leagueData.divisions;
  
  for (const division of divisions) {
    const { totalRounds, rounds } = division;
    
    // Find the last round
    const lastRound = rounds?.find(r => r.roundNumber === totalRounds);
    
    if (!lastRound) {
      return false;
    }

    // Check if all fights in the last round are completed
    const fights = lastRound.fights || [];
    const allFightsCompleted = fights.length > 0 && fights.every(
      fight => fight.fightStatus === 'completed' || fight.winner !== null
    );

    if (!allFightsCompleted) {
      return false;
    }
  }

  return true;
};

/**
 * Check if a cup competition season is completed
 * A cup is complete when the final round fight is completed
 */
const isCupSeasonCompleted = (cupCompetition) => {
  if (!cupCompetition.cupData || !cupCompetition.cupData.fights) {
    return false;
  }

  const fights = cupCompetition.cupData.fights;

  // Find fights in the final round (stage code: FN)
  const finalRoundFights = fights.filter(fight => {
    // Parse fight identifier: "CC-S6-FN-F1" or old format "CC-S3-R3-F1"
    const parts = fight.fightIdentifier.split('-');
    const stageCode = parts[2];
    
    // Check for finals stage code
    return stageCode === 'FN' || stageCode.includes('FINAL');
  });

  if (finalRoundFights.length === 0) {
    return false;
  }

  // Check if all final round fights are completed
  return finalRoundFights.every(
    fight => fight.fightStatus === 'completed' || fight.winner !== null
  );
};

/**
 * Check if all three competitions (League, CC, IC) for a given season are completed
 * 
 * @param {Object} linkedLeagueSeason - Object containing { competition, season }
 * @returns {Promise<Object>} - Status object with completion details
 */
export const checkAllCompetitionsCompleted = async (linkedLeagueSeason) => {
  try {
    console.log('\n🔍 Checking if all 3 competitions for season are completed...');
    console.log(`   Linked League Season ID: ${linkedLeagueSeason.season}`);

    // 1. Find the league season (could be IFC or any other league)
    const leagueSeason = await Competition.findById(linkedLeagueSeason.season)
      .populate('competitionMetaId');
    
    if (!leagueSeason) {
      console.log('   ❌ League season not found');
      return {
        allCompleted: false,
        reason: 'League season not found',
        leagueCompleted: false,
        ccCompleted: false,
        icCompleted: false
      };
    }

    const leagueName = leagueSeason.competitionMeta?.competitionName || 'League';
    const seasonNumber = leagueSeason.seasonMeta?.seasonNumber;
    console.log(`   📊 Season Number: ${seasonNumber}`);
    console.log(`   🏆 League: ${leagueName}`);

    // Check league completion
    const leagueCompleted = isLeagueSeasonCompleted(leagueSeason);
    console.log(`   ${leagueCompleted ? '✅' : '⏳'} ${leagueName} Season ${seasonNumber}: ${leagueCompleted ? 'Completed' : 'In Progress'}`);

    // 2. Find CC season linked to this league season
    const ccSeason = await Competition.findOne({
      competitionMetaId: COMPETITION_IDS.CHAMPIONS_CUP,
      'linkedLeagueSeason.season': linkedLeagueSeason.season
    });

    let ccCompleted = false;
    if (ccSeason) {
      ccCompleted = isCupSeasonCompleted(ccSeason);
      console.log(`   ${ccCompleted ? '✅' : '⏳'} CC Season ${ccSeason.seasonMeta?.seasonNumber}: ${ccCompleted ? 'Completed' : 'In Progress'}`);
    } else {
      console.log('   ⚠️  CC Season not found for this league season');
    }

    // 3. Find IC season linked to this league season
    const icSeason = await Competition.findOne({
      competitionMetaId: COMPETITION_IDS.INVICTA_CUP,
      'linkedLeagueSeason.season': linkedLeagueSeason.season
    });

    let icCompleted = false;
    if (icSeason) {
      icCompleted = isCupSeasonCompleted(icSeason);
      console.log(`   ${icCompleted ? '✅' : '⏳'} IC Season ${icSeason.seasonMeta?.seasonNumber}: ${icCompleted ? 'Completed' : 'In Progress'}`);
    } else {
      console.log('   ⚠️  IC Season not found for this league season');
    }

    // All three must be completed
    const allCompleted = leagueCompleted && ccCompleted && icCompleted;

    if (allCompleted) {
      console.log('\n✨ ALL THREE COMPETITIONS COMPLETED! Ready for global ranking calculation.');
    } else {
      console.log('\n⏳ Not all competitions completed yet. Waiting...');
    }

    return {
      allCompleted,
      leagueCompleted,
      ccCompleted,
      icCompleted,
      seasonNumber,
      leagueName,
      leagueSeasonId: leagueSeason._id,
      ccSeasonId: ccSeason?._id,
      icSeasonId: icSeason?._id,
      reason: allCompleted 
        ? 'All competitions completed' 
        : `Waiting for: ${[
            !leagueCompleted && leagueName,
            !ccCompleted && 'CC',
            !icCompleted && 'IC'
          ].filter(Boolean).join(', ')}`
    };
  } catch (error) {
    console.error('❌ Error checking season completion:', error);
    throw error;
  }
};

/**
 * Check if we should trigger global ranking calculation after a cup fight
 * This is called when a CC or IC final fight is completed
 * 
 * @param {Object} cupCompetition - The cup competition document (CC or IC)
 * @returns {Promise<Object>} - Status with shouldTrigger flag
 */
export const shouldTriggerGlobalRanking = async (cupCompetition) => {
  try {
    // Only proceed if the cup has a linked league season
    if (!cupCompetition.linkedLeagueSeason) {
      return {
        shouldTrigger: false,
        reason: 'No linked league season'
      };
    }

    // Check if this cup is now completed
    const cupCompleted = isCupSeasonCompleted(cupCompetition);
    
    if (!cupCompleted) {
      return {
        shouldTrigger: false,
        reason: 'Cup season not yet completed'
      };
    }

    // Check if all 3 competitions are completed
    const completionStatus = await checkAllCompetitionsCompleted(cupCompetition.linkedLeagueSeason);

    return {
      shouldTrigger: completionStatus.allCompleted,
      ...completionStatus
    };
  } catch (error) {
    console.error('❌ Error checking if should trigger global ranking:', error);
    throw error;
  }
};

