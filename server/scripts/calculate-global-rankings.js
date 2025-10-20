/**
 * Calculate Global Rankings for All Fighters
 * Formula: (Win% ÷ 10) + League Titles × 5 + CC Titles × 4 + IC Titles × 4 + 
 *          CC appearances × 3 + IC appearances × 2 + Div 1 appearances × 1 + 
 *          Div 2 appearances × 0.75 + Div 3 appearances × 0.5 + 
 *          (Longest win streak ÷ 5) × 1
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';
import { GlobalRank } from '../models/global-rank.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Competition Meta IDs (from competition-meta-export.json)
const COMPETITION_IDS = {
  IFC: '67780dcc09a4c4b25127f8f6',
  CHAMPIONS_CUP: '6778100309a4c4b25127f8fa',
  INVICTA_CUP: '6778103309a4c4b25127f8fc'
};

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
 * Get league titles for a fighter
 */
function getLeagueTitles(fighter) {
  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return 0;
  }

  const ifcHistory = fighter.competitionHistory.find(
    comp => comp.competitionId && comp.competitionId.toString() === COMPETITION_IDS.IFC
  );

  return ifcHistory?.titles?.totalTitles || 0;
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
 * Get division appearances for IFC
 */
function getDivisionAppearances(fighter) {
  const divisionCounts = { 1: 0, 2: 0, 3: 0 };

  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return divisionCounts;
  }

  const ifcHistory = fighter.competitionHistory.find(
    comp => comp.competitionId && comp.competitionId.toString() === COMPETITION_IDS.IFC
  );

  if (!ifcHistory?.seasonDetails || !Array.isArray(ifcHistory.seasonDetails)) {
    return divisionCounts;
  }

  // Count appearances per division across all seasons
  ifcHistory.seasonDetails.forEach(season => {
    const division = season.divisionNumber;
    if (division >= 1 && division <= 3) {
      divisionCounts[division]++;
    }
  });

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
 * Calculate global ranking score for a fighter
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
 * Build league appearances array for global rank document
 */
function buildLeagueAppearancesArray(fighter) {
  const leagueAppearances = [];

  if (!fighter.competitionHistory || !Array.isArray(fighter.competitionHistory)) {
    return leagueAppearances;
  }

  const ifcHistory = fighter.competitionHistory.find(
    comp => comp.competitionId && comp.competitionId.toString() === COMPETITION_IDS.IFC
  );

  if (!ifcHistory?.seasonDetails || !Array.isArray(ifcHistory.seasonDetails)) {
    return leagueAppearances;
  }

  const divisionAppearances = getDivisionAppearances(fighter);
  const divisionArray = [];

  for (let division = 1; division <= 3; division++) {
    if (divisionAppearances[division] > 0) {
      divisionArray.push({
        division,
        appearances: divisionAppearances[division]
      });
    }
  }

  if (divisionArray.length > 0) {
    leagueAppearances.push({
      competitionId: new mongoose.Types.ObjectId(COMPETITION_IDS.IFC),
      divisionAppearances: divisionArray
    });
  }

  return leagueAppearances;
}

/**
 * Main function to calculate and save global rankings
 */
async function calculateGlobalRankings() {
  console.log('\n' + '='.repeat(70));
  console.log('🏆 CALCULATING GLOBAL RANKINGS FOR ALL FIGHTERS');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Fetch all active fighters
    console.log('\n📥 Fetching all active fighters from MongoDB...');
    const allFighters = await Fighter.find({ isArchived: { $ne: true } }).lean();
    console.log(`✅ Fetched ${allFighters.length} active fighters`);

    if (allFighters.length === 0) {
      console.log('\n⚠️  No active fighters found in database.');
      return;
    }

    // Calculate scores for all fighters
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

    // Assign ranks
    const rankedFighters = fightersWithScores.map((item, index) => {
      const rank = index + 1;
      
      return {
        fighterId: item.fighter._id,
        score: item.score,
        rank,
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

    console.log('\n' + '='.repeat(70));
    console.log('✨ GLOBAL RANKINGS CALCULATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
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

// Run the calculation
calculateGlobalRankings();

