/**
 * Global Ranking Calculation Service
 * Calculates and saves global rankings for all fighters
 * Based on calculate-global-rankings.js script
 * 
 * Formula: (Win% ÷ 10) + League Titles × 5 + CC Titles × 4 + IC Titles × 4 + 
 *          CC appearances × 3 + IC appearances × 2 + Div 1 appearances × 1 + 
 *          Div 2 appearances × 0.75 + Div 3 appearances × 0.5 + 
 *          (Longest win streak ÷ 5) × 1
 */

import { Fighter } from '../models/fighter.model.js';
import { GlobalRank } from '../models/global-rank.model.js';
import mongoose from 'mongoose';

// Competition Meta IDs
const COMPETITION_IDS = {
  IFC: '67780dcc09a4c4b25127f8f6',
  IFL: '67780e1d09a4c4b25127f8f8',
  CHAMPIONS_CUP: '6778100309a4c4b25127f8fa',
  INVICTA_CUP: '6778103309a4c4b25127f8fc'
};

const LEAGUE_META_IDS = [COMPETITION_IDS.IFC, COMPETITION_IDS.IFL];

/**
 * Get league titles for a fighter from IFC + IFL combined
 */
function getLeagueTitles(fighter) {
  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return 0;
  }
  let total = 0;
  for (const metaId of LEAGUE_META_IDS) {
    const entry = fighter.competitionHistory.find(
      comp => comp.competitionId && comp.competitionId.toString() === metaId
    );
    total += entry?.titles?.totalTitles || 0;
  }
  return total;
}

/**
 * Get cup titles for a specific competition
 */
function getCupTitles(fighter, competitionId) {
  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return 0;
  }

  const cupHistory = fighter.competitionHistory.find(
    comp => comp.competitionId && comp.competitionId.toString() === competitionId
  );

  return cupHistory?.titles?.totalTitles || 0;
}

/**
 * Get cup appearances (number of seasons participated)
 */
function getCupAppearances(fighter, competitionId) {
  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return 0;
  }

  const cupHistory = fighter.competitionHistory.find(
    comp => comp.competitionId && comp.competitionId.toString() === competitionId
  );

  return cupHistory?.numberOfSeasonAppearances || 0;
}

/**
 * Get division appearances for a fighter from IFC + IFL combined
 */
function getDivisionAppearances(fighter) {
  const divisionCounts = { 1: 0, 2: 0, 3: 0 };

  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return divisionCounts;
  }

  for (const metaId of LEAGUE_META_IDS) {
    const leagueHistory = fighter.competitionHistory.find(
      comp => comp.competitionId && comp.competitionId.toString() === metaId
    );
    if (!leagueHistory?.seasonDetails || !Array.isArray(leagueHistory.seasonDetails)) continue;
    leagueHistory.seasonDetails.forEach(season => {
      const division = season.divisionNumber;
      if (division >= 1 && division <= 3) {
        divisionCounts[division]++;
      }
    });
  }

  return divisionCounts;
}

/**
 * Get longest win streak for a fighter
 */
function getLongestWinStreak(fighter) {
  if (!fighter.streaks || !Array.isArray(fighter.streaks)) {
    return 0;
  }

  const winStreaks = fighter.streaks.filter(streak => streak.type === 'win');
  
  if (winStreaks.length === 0) {
    return 0;
  }

  return Math.max(...winStreaks.map(streak => streak.count || 0));
}

/**
 * Get overall win percentage
 */
function getOverallWinPercentage(fighter) {
  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return 0;
  }

  let totalWins = 0;
  let totalFights = 0;

  fighter.competitionHistory.forEach(comp => {
    totalWins += comp.totalWins || 0;
    totalFights += comp.totalFights || 0;
  });

  if (totalFights === 0) {
    return 0;
  }

  return (totalWins / totalFights) * 100;
}

/**
 * Calculate global ranking score for a fighter (uses IFC + IFL for league parts)
 */
function calculateGlobalScore(fighter) {
  // Get all required metrics
  const winPercentage = getOverallWinPercentage(fighter);
  const leagueTitles = getLeagueTitles(fighter);
  const ccTitles = getCupTitles(fighter, COMPETITION_IDS.CHAMPIONS_CUP);
  const icTitles = getCupTitles(fighter, COMPETITION_IDS.INVICTA_CUP);
  const ccAppearances = getCupAppearances(fighter, COMPETITION_IDS.CHAMPIONS_CUP);
  const icAppearances = getCupAppearances(fighter, COMPETITION_IDS.INVICTA_CUP);
  const divisionAppearances = getDivisionAppearances(fighter);
  const longestWinStreak = getLongestWinStreak(fighter);

  // Calculate score using the formula
  const score = 
    (winPercentage / 10) +
    (leagueTitles * 5) +
    (ccTitles * 4) +
    (icTitles * 4) +
    (ccAppearances * 3) +
    (icAppearances * 2) +
    (divisionAppearances[1] * 1) +
    (divisionAppearances[2] * 0.75) +
    (divisionAppearances[3] * 0.5) +
    ((longestWinStreak / 5) * 1);

  return {
    score: parseFloat(score.toFixed(2)),
    breakdown: {
      winPercentage: parseFloat(winPercentage.toFixed(2)),
      leagueTitles,
      ccTitles,
      icTitles,
      ccAppearances,
      icAppearances,
      divisionAppearances,
      longestWinStreak
    }
  };
}

/**
 * Build titles array for global rank document
 */
function buildTitlesArray(fighter) {
  const titles = [];

  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return titles;
  }

  fighter.competitionHistory.forEach(comp => {
    if (comp.titles && comp.titles.totalTitles > 0) {
      titles.push({
        competitionId: comp.competitionId,
        numberOfTitles: comp.titles.totalTitles
      });
    }
  });

  return titles;
}

/**
 * Build cup appearances array for global rank document
 */
function buildCupAppearancesArray(fighter) {
  const cupAppearances = [];

  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return cupAppearances;
  }

  // Check Champions Cup
  const ccHistory = fighter.competitionHistory.find(
    comp => comp.competitionId && comp.competitionId.toString() === COMPETITION_IDS.CHAMPIONS_CUP
  );
  if (ccHistory && ccHistory.numberOfSeasonAppearances > 0) {
    cupAppearances.push({
      competitionId: new mongoose.Types.ObjectId(COMPETITION_IDS.CHAMPIONS_CUP),
      appearances: ccHistory.numberOfSeasonAppearances
    });
  }

  // Check Invicta Cup
  const icHistory = fighter.competitionHistory.find(
    comp => comp.competitionId && comp.competitionId.toString() === COMPETITION_IDS.INVICTA_CUP
  );
  if (icHistory && icHistory.numberOfSeasonAppearances > 0) {
    cupAppearances.push({
      competitionId: new mongoose.Types.ObjectId(COMPETITION_IDS.INVICTA_CUP),
      appearances: icHistory.numberOfSeasonAppearances
    });
  }

  return cupAppearances;
}

/**
 * Build league appearances array for global rank document (IFC + IFL, one entry per league)
 */
function buildLeagueAppearancesArray(fighter) {
  const leagueAppearances = [];

  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return leagueAppearances;
  }

  for (const metaId of LEAGUE_META_IDS) {
    const leagueHistory = fighter.competitionHistory.find(
      comp => comp.competitionId && comp.competitionId.toString() === metaId
    );
    if (!leagueHistory?.seasonDetails || !Array.isArray(leagueHistory.seasonDetails)) continue;

    const divisionCounts = { 1: 0, 2: 0, 3: 0 };
    leagueHistory.seasonDetails.forEach(season => {
      const d = season.divisionNumber;
      if (d >= 1 && d <= 3) divisionCounts[d]++;
    });

    const divisionArray = [];
    for (let division = 1; division <= 3; division++) {
      if (divisionCounts[division] > 0) {
        divisionArray.push({ division, appearances: divisionCounts[division] });
      }
    }
    if (divisionArray.length > 0) {
      leagueAppearances.push({
        competitionId: new mongoose.Types.ObjectId(metaId),
        divisionAppearances: divisionArray
      });
    }
  }

  return leagueAppearances;
}

/**
 * Main function to calculate and save global rankings
 * 
 * @param {string} leagueCompetitionMetaId - The competition meta ID of the active league (e.g., IFC)
 * @returns {Promise<Object>} - Result with success status and ranking data
 */
export const calculateAndSaveGlobalRankings = async (leagueCompetitionMetaId) => {
  console.log('\n' + '='.repeat(70));
  console.log('🏆 CALCULATING GLOBAL RANKINGS FOR ALL FIGHTERS');
  console.log('='.repeat(70));
  console.log(`   League Competition Meta ID: ${leagueCompetitionMetaId}`);

  try {
    // Fetch all active fighters
    console.log('\n📥 Fetching all active fighters from MongoDB...');
    const allFighters = await Fighter.find({ isArchived: { $ne: true } }).lean();
    console.log(`✅ Fetched ${allFighters.length} active fighters`);

    if (allFighters.length === 0) {
      console.log('\n⚠️  No active fighters found in database.');
      return {
        success: false,
        reason: 'No active fighters found'
      };
    }

    // Calculate scores for all fighters (IFC + IFL for league titles and division apps)
    console.log('\n🔢 Calculating global scores...');
    const fightersWithScores = allFighters.map(fighter => {
      const { score, breakdown } = calculateGlobalScore(fighter);
      
      return {
        fighter,
        score,
        breakdown
      };
    });

    // Sort by score (descending)
    fightersWithScores.sort((a, b) => b.score - a.score);

    // Previous snapshot for rank change: the one that is currently isCurrent (before we overwrite)
    const previousDoc = await GlobalRank.findOne({ isCurrent: true }).lean();
    const previousRankByFighterId = new Map();
    if (previousDoc?.fighters?.length) {
      previousDoc.fighters.forEach(f => {
        const id = f.fighterId?.toString?.() ?? f.fighterId;
        if (id) previousRankByFighterId.set(id, f.rank);
      });
    }

    // Assign ranks and previousRank/rankChange
    const rankedFighters = fightersWithScores.map((item, index) => {
      const rank = index + 1;
      const fighterIdStr = item.fighter._id.toString();
      const previousRank = previousRankByFighterId.get(fighterIdStr) ?? null;
      const rankChange = previousRank != null ? previousRank - rank : null;
      
      return {
        fighterId: item.fighter._id,
        score: item.score,
        rank,
        previousRank: previousRank ?? undefined,
        rankChange: rankChange != null ? rankChange : undefined,
        titles: buildTitlesArray(item.fighter),
        cupAppearances: buildCupAppearancesArray(item.fighter),
        leagueAppearances: buildLeagueAppearancesArray(item.fighter),
        breakdown: item.breakdown // For logging purposes
      };
    });

    // Display top 10 rankings
    console.log('\n🏅 TOP 10 GLOBAL RANKINGS:');
    console.log('='.repeat(70));
    rankedFighters.slice(0, 10).forEach(rf => {
      const fighter = allFighters.find(f => f._id.toString() === rf.fighterId.toString());
      const name = `${fighter.firstName} ${fighter.lastName}`;
      console.log(`${rf.rank}. ${name.padEnd(30)} Score: ${rf.score.toFixed(2)}`);
      console.log(`   Win%: ${rf.breakdown.winPercentage}% | League Titles: ${rf.breakdown.leagueTitles} | ` +
                  `CC Titles: ${rf.breakdown.ccTitles} | IC Titles: ${rf.breakdown.icTitles}`);
      console.log(`   CC Apps: ${rf.breakdown.ccAppearances} | IC Apps: ${rf.breakdown.icAppearances} | ` +
                  `Longest Streak: ${rf.breakdown.longestWinStreak}`);
      console.log('');
    });

    // Mark any existing global rank as not current
    console.log('\n📝 Marking existing global rankings as historical...');
    await GlobalRank.updateMany({ isCurrent: true }, { isCurrent: false });

    // Create new global rank document
    console.log('\n💾 Saving new global rankings to database...');
    const globalRankData = {
      fighters: rankedFighters.map(rf => ({
        fighterId: rf.fighterId,
        score: rf.score,
        rank: rf.rank,
        previousRank: rf.previousRank ?? null,
        rankChange: rf.rankChange ?? null,
        titles: rf.titles,
        cupAppearances: rf.cupAppearances,
        leagueAppearances: rf.leagueAppearances
      })),
      isCurrent: true
    };

    const globalRank = new GlobalRank(globalRankData);
    await globalRank.save();

    console.log(`✅ Global rankings saved successfully!`);
    console.log(`   - Total fighters ranked: ${rankedFighters.length}`);
    console.log(`   - Document ID: ${globalRank._id}`);

    // Update each fighter's globalRank field
    console.log('\n📝 Updating fighter globalRank fields...');
    const updatePromises = rankedFighters.map(rf => 
      Fighter.updateOne(
        { _id: rf.fighterId },
        {
          $set: {
            'globalRank.rank': rf.rank,
            'globalRank.score': rf.score,
            'globalRank.globalRankId': globalRank._id
          }
        }
      )
    );
    
    await Promise.all(updatePromises);
    console.log(`✅ Updated ${rankedFighters.length} fighter records`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ GLOBAL RANKINGS CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('');

    return {
      success: true,
      globalRankId: globalRank._id,
      totalFighters: rankedFighters.length,
      topFighters: rankedFighters.slice(0, 10).map(rf => {
        const fighter = allFighters.find(f => f._id.toString() === rf.fighterId.toString());
        return {
          rank: rf.rank,
          name: `${fighter.firstName} ${fighter.lastName}`,
          score: rf.score,
          breakdown: rf.breakdown
        };
      })
    };

  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Calculate global ranking data only (IFC + IFL for league). Does not save.
 * Used by one-time recalc script and for testing.
 * @returns {Promise<{ rankedFighters: Array, allFighters: Array }>}
 */
export const calculateGlobalRankingsData = async () => {
  const allFighters = await Fighter.find({ isArchived: { $ne: true } }).lean();
  if (allFighters.length === 0) return { rankedFighters: [], allFighters: [] };

  const fightersWithScores = allFighters.map(fighter => {
    const { score, breakdown } = calculateGlobalScore(fighter);
    return { fighter, score, breakdown };
  });
  fightersWithScores.sort((a, b) => b.score - a.score);

  const rankedFighters = fightersWithScores.map((item, index) => {
    const rank = index + 1;
    return {
      fighterId: item.fighter._id,
      score: item.score,
      rank,
      titles: buildTitlesArray(item.fighter),
      cupAppearances: buildCupAppearancesArray(item.fighter),
      leagueAppearances: buildLeagueAppearancesArray(item.fighter),
      breakdown: item.breakdown
    };
  });

  return { rankedFighters, allFighters };
};

