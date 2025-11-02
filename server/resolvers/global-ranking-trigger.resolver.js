/**
 * Global Ranking Trigger Resolver
 * Handles triggering of global ranking calculations after season completion
 */

import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { catchAsyncErrors } from '../utils.js';
import { NotFoundError } from '../error.js';
import { shouldTriggerGlobalRanking } from '../services/season-completion.service.js';
import { calculateAndSaveGlobalRankings } from '../services/global-ranking.service.js';

const globalRankingTriggerResolver = {
  Mutation: {
    /**
     * Manual trigger for global ranking calculation
     * Can be called manually if needed, or automatically triggered
     * 
     * @param {Object} _ - Unused parent resolver
     * @param {Object} args - Arguments
     * @param {String} args.leagueCompetitionMetaId - The competition meta ID of the league
     * @returns {Promise<Object>} Result of the calculation
     */
    triggerGlobalRankingCalculation: catchAsyncErrors(async (_, { leagueCompetitionMetaId }) => {
      console.log('\n📊 Manual Global Ranking Calculation Triggered');
      console.log(`   League Competition Meta ID: ${leagueCompetitionMetaId}`);

      const result = await calculateAndSaveGlobalRankings(leagueCompetitionMetaId);

      if (result.success) {
        return {
          success: true,
          message: `Global rankings calculated successfully for ${result.totalFighters} fighters`,
          globalRankId: result.globalRankId.toString(),
          totalFighters: result.totalFighters
        };
      } else {
        throw new Error(`Failed to calculate global rankings: ${result.error || result.reason}`);
      }
    }),

    /**
     * Check if all competitions for a season are completed
     * Used for debugging/testing purposes
     * 
     * @param {Object} _ - Unused parent resolver
     * @param {Object} args - Arguments
     * @param {String} args.leagueSeasonId - The season ID of the league
     * @returns {Promise<Object>} Completion status
     */
    checkSeasonCompletionStatus: catchAsyncErrors(async (_, { leagueSeasonId }) => {
      const { checkAllCompetitionsCompleted } = await import('../services/season-completion.service.js');
      
      const status = await checkAllCompetitionsCompleted({
        season: leagueSeasonId
      });

      return {
        allCompleted: status.allCompleted,
        leagueCompleted: status.leagueCompleted,
        ccCompleted: status.ccCompleted,
        icCompleted: status.icCompleted,
        seasonNumber: status.seasonNumber,
        leagueName: status.leagueName,
        reason: status.reason
      };
    })
  }
};

/**
 * Auto-trigger global ranking calculation after competition season update
 * This should be called from the updateCompetitionSeason mutation
 * 
 * @param {Object} competition - The updated competition document
 * @returns {Promise<void>}
 */
export const autoTriggerGlobalRankingIfNeeded = async (competition) => {
  try {
    // Only check for cup competitions
    const isCup = competition.cupData !== null && competition.cupData !== undefined;
    
    if (!isCup) {
      return; // Not a cup, no need to check
    }

    console.log('\n🔍 Checking if global ranking should be triggered...');
    
    // Check if this cup completion triggers global ranking
    const triggerStatus = await shouldTriggerGlobalRanking(competition);

    if (!triggerStatus.shouldTrigger) {
      console.log(`   ⏳ ${triggerStatus.reason}`);
      return;
    }

    console.log('\n✨ ALL THREE COMPETITIONS COMPLETED!');
    console.log('   Automatically triggering global ranking calculation...');

    // Get the league competition meta ID from the linked league season
    const leagueSeason = await Competition.findById(competition.linkedLeagueSeason.season);
    
    if (!leagueSeason) {
      console.error('   ❌ Could not find linked league season');
      return;
    }

    const leagueCompetitionMetaId = leagueSeason.competitionMetaId.toString();
    console.log(`   League Competition Meta ID: ${leagueCompetitionMetaId}`);

    // Trigger global ranking calculation
    const result = await calculateAndSaveGlobalRankings(leagueCompetitionMetaId);

    if (result.success) {
      console.log('\n🎉 GLOBAL RANKINGS AUTOMATICALLY CALCULATED!');
      console.log(`   Total Fighters: ${result.totalFighters}`);
      console.log(`   Global Rank ID: ${result.globalRankId}`);
      console.log(`   Season: ${triggerStatus.seasonNumber} (${triggerStatus.leagueName})`);
    } else {
      console.error('\n❌ Global ranking calculation failed:', result.error || result.reason);
    }

  } catch (error) {
    console.error('❌ Error in autoTriggerGlobalRankingIfNeeded:', error);
    // Don't throw - we don't want to block the fight result update
  }
};

export default globalRankingTriggerResolver;

