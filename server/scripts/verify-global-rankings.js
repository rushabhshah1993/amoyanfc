/**
 * Verify Global Rankings
 * Displays the current global rankings from the database
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
import { GlobalRank } from '../models/global-rank.model.js';

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
 * Verify and display global rankings
 */
async function verifyGlobalRankings() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFYING GLOBAL RANKINGS');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Fetch current global rank
    console.log('\n📥 Fetching current global rankings from MongoDB...');
    const globalRank = await GlobalRank.findOne({ isCurrent: true }).lean();

    if (!globalRank) {
      console.log('\n⚠️  No current global rankings found in database.');
      return;
    }

    console.log(`✅ Found global rankings (ID: ${globalRank._id})`);
    console.log(`   Created: ${globalRank.createdAt}`);
    console.log(`   Updated: ${globalRank.updatedAt}`);
    console.log(`   Total fighters: ${globalRank.fighters.length}`);

    // Fetch all fighters for name mapping
    const allFighters = await Fighter.find({}).lean();
    const fighterMap = new Map(allFighters.map(f => [f._id.toString(), f]));

    // Display top 20 rankings
    console.log('\n🏅 GLOBAL RANKINGS (Top 20):');
    console.log('='.repeat(70));
    console.log('Rank | Fighter Name                   | Score    | Titles | Appearances');
    console.log('='.repeat(70));

    globalRank.fighters.slice(0, 20).forEach(rankedFighter => {
      const fighter = fighterMap.get(rankedFighter.fighterId.toString());
      if (!fighter) return;

      const name = `${fighter.firstName} ${fighter.lastName}`;
      const totalTitles = rankedFighter.titles.reduce((sum, t) => sum + t.numberOfTitles, 0);
      const cupApps = rankedFighter.cupAppearances.reduce((sum, c) => sum + c.appearances, 0);
      const leagueApps = rankedFighter.leagueAppearances.reduce(
        (sum, l) => sum + l.divisionAppearances.reduce((s, d) => s + d.appearances, 0), 
        0
      );
      const totalApps = cupApps + leagueApps;

      console.log(
        `${rankedFighter.rank.toString().padStart(4)} | ` +
        `${name.padEnd(30)} | ` +
        `${rankedFighter.score.toFixed(2).padStart(8)} | ` +
        `${totalTitles.toString().padStart(6)} | ` +
        `${totalApps.toString().padStart(11)}`
      );
    });

    // Statistics
    console.log('\n📊 STATISTICS:');
    console.log('='.repeat(70));
    
    const scores = globalRank.fighters.map(f => f.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    console.log(`Highest Score: ${maxScore.toFixed(2)}`);
    console.log(`Lowest Score: ${minScore.toFixed(2)}`);
    console.log(`Average Score: ${avgScore.toFixed(2)}`);

    // Export to JSON
    const exportDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const exportFilename = `global-rankings-${timestamp}.json`;
    const exportPath = path.join(exportDir, exportFilename);

    // Prepare export data with fighter names
    const exportData = {
      id: globalRank._id,
      createdAt: globalRank.createdAt,
      updatedAt: globalRank.updatedAt,
      isCurrent: globalRank.isCurrent,
      totalFighters: globalRank.fighters.length,
      rankings: globalRank.fighters.map(rf => {
        const fighter = fighterMap.get(rf.fighterId.toString());
        return {
          rank: rf.rank,
          fighter: {
            id: rf.fighterId,
            name: fighter ? `${fighter.firstName} ${fighter.lastName}` : 'Unknown'
          },
          score: rf.score,
          titles: rf.titles,
          cupAppearances: rf.cupAppearances,
          leagueAppearances: rf.leagueAppearances
        };
      })
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Rankings exported to: ${exportFilename}`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ VERIFICATION COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
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

// Run the verification
verifyGlobalRankings();

