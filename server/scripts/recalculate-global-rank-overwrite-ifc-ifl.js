/**
 * One-time: Recalculate global rankings with IFC+IFL for league titles and division
 * appearances, then overwrite the current (latest) document. Rank change is vs the
 * pre-IFL snapshot (second entry when sorted by createdAt asc).
 *
 * 1. Backs up entire GlobalRank collection for rollback.
 * 2. Recalculates scores using IFC + IFL.
 * 3. Overwrites the document that has isCurrent: true.
 * 4. Sets previousRank/rankChange from the pre-IFL document (second entry).
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { GlobalRank } from '../models/global-rank.model.js';
import { Fighter } from '../models/fighter.model.js';
import { calculateGlobalRankingsData } from '../services/global-ranking.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function serialize(doc) {
  if (doc === null || doc === undefined) return doc;
  if (doc instanceof mongoose.Types.ObjectId) return doc.toString();
  if (doc instanceof Date) return doc.toISOString();
  if (Array.isArray(doc)) return doc.map(serialize);
  if (typeof doc === 'object' && doc.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(doc)) {
      if (v instanceof mongoose.Types.ObjectId) out[k] = v.toString();
      else if (v instanceof Date) out[k] = v.toISOString();
      else out[k] = serialize(v);
    }
    return out;
  }
  return doc;
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log('✅ Connected to MongoDB\n');

    // ─── 1. Backup full GlobalRank collection ───
    console.log('📦 Backing up GlobalRank collection for rollback...');
    const allDocs = await GlobalRank.find({}).sort({ createdAt: 1 }).lean();
    const exportDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = path.join(exportDir, `global-rank-rollback-${timestamp}.json`);
    fs.writeFileSync(
      backupPath,
      JSON.stringify(serialize({ documents: allDocs, backupAt: new Date().toISOString() }), null, 2)
    );
    console.log(`   Saved: ${path.basename(backupPath)}\n`);

    const currentDoc = await GlobalRank.findOne({ isCurrent: true }).lean();
    if (!currentDoc) {
      console.error('❌ No GlobalRank document with isCurrent: true found.');
      process.exit(1);
    }

    // Pre-IFL = second entry when sorted by createdAt asc
    const preIFLDoc = allDocs.length >= 2 ? allDocs[1] : null;
    const previousRankByFighterId = new Map();
    if (preIFLDoc?.fighters?.length) {
      preIFLDoc.fighters.forEach(f => {
        const id = f.fighterId?.toString?.() ?? f.fighterId;
        if (id) previousRankByFighterId.set(id, f.rank);
      });
    }
    console.log(`   Current doc (to overwrite): _id=${currentDoc._id}`);
    console.log(`   Pre-IFL doc (for rank change): ${preIFLDoc ? `_id=${preIFLDoc._id}` : 'none'}\n`);

    // ─── 2. Recalculate with IFC+IFL ───
    console.log('🔢 Recalculating global rankings (IFC + IFL for league)...');
    const { rankedFighters, allFighters } = await calculateGlobalRankingsData();
    if (!rankedFighters.length) {
      console.error('❌ No fighters returned from calculation.');
      process.exit(1);
    }
    console.log(`   Ranked ${rankedFighters.length} fighters.\n`);

    // ─── 3. Add previousRank and rankChange from pre-IFL ───
    const fightersForDb = rankedFighters.map(rf => {
      const fighterIdStr = rf.fighterId.toString();
      const previousRank = previousRankByFighterId.get(fighterIdStr) ?? null;
      const rankChange = previousRank != null ? previousRank - rf.rank : null;
      return {
        fighterId: rf.fighterId,
        score: rf.score,
        rank: rf.rank,
        previousRank: previousRank ?? null,
        rankChange: rankChange != null ? rankChange : null,
        titles: rf.titles,
        cupAppearances: rf.cupAppearances,
        leagueAppearances: rf.leagueAppearances
      };
    });

    // ─── 4. Overwrite current document ───
    console.log('💾 Overwriting current GlobalRank document...');
    await GlobalRank.updateOne(
      { _id: currentDoc._id },
      { $set: { fighters: fightersForDb, updatedAt: new Date() } }
    );
    console.log('   Done.\n');

    // ─── 5. Update each fighter's globalRank field ───
    console.log('📝 Updating fighter globalRank fields...');
    await Promise.all(
      fightersForDb.map(rf =>
        Fighter.updateOne(
          { _id: rf.fighterId },
          {
            $set: {
              'globalRank.rank': rf.rank,
              'globalRank.score': rf.score,
              'globalRank.globalRankId': currentDoc._id
            }
          }
        )
      )
    );
    console.log(`   Updated ${fightersForDb.length} fighter records.\n`);

    console.log('✨ Recalculate and overwrite complete.');
    console.log('   Current ranking now uses IFC+IFL for league titles and division appearances.');
    console.log('   previousRank/rankChange are set vs pre-IFL snapshot (UI can show growth later).');
  } catch (err) {
    console.error('❌ Error:', err);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

run();
