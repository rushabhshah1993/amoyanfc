/**
 * Backup global rankings entry from MongoDB
 * Fetches all GlobalRank documents, saves the chosen entry (1st or 2nd by creation date) as JSON.
 * Usage: node backup-first-global-rank.js [1|2]   (default: 1 = first/oldest)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { GlobalRank } from '../models/global-rank.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entryIndex = Math.max(0, parseInt(process.argv[2], 10) - 1) || 0; // 1 → 0, 2 → 1

function serializeForJson(doc) {
  if (doc === null || doc === undefined) return doc;
  if (doc instanceof mongoose.Types.ObjectId) return doc.toString();
  if (doc instanceof Date) return doc.toISOString();
  if (Array.isArray(doc)) return doc.map(serializeForJson);
  if (typeof doc === 'object' && doc.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(doc)) {
      if (v instanceof mongoose.Types.ObjectId) out[k] = v.toString();
      else if (v instanceof Date) out[k] = v.toISOString();
      else out[k] = serializeForJson(v);
    }
    return out;
  }
  return doc;
}

async function connectDB() {
  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10
  });
  console.log(`✅ Connected to MongoDB at ${connection.connection.host}`);
  return connection;
}

async function backupGlobalRankEntry() {
  console.log('\n📥 Fetching global rankings from MongoDB...');

  const all = await GlobalRank.find({}).sort({ createdAt: 1 }).lean();
  console.log(`   Found ${all.length} GlobalRank document(s).`);

  if (all.length === 0) {
    console.log('\n⚠️  No global rankings found. Nothing to backup.');
    return;
  }

  if (entryIndex >= all.length) {
    console.log(`\n⚠️  Entry ${entryIndex + 1} does not exist (only ${all.length} document(s)).`);
    return;
  }

  const entry = all[entryIndex];
  const label = entryIndex === 0 ? 'First' : entryIndex === 1 ? 'Second' : `Entry ${entryIndex + 1}`;
  console.log(`   ${label} entry: _id=${entry._id}, createdAt=${entry.createdAt}, fighters=${entry.fighters?.length ?? 0}`);

  const exportDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const suffix = entryIndex === 0 ? 'first' : entryIndex === 1 ? 'second' : `entry-${entryIndex + 1}`;
  const filename = `global-rankings-${suffix}-entry-backup-${timestamp}.json`;
  const filepath = path.join(exportDir, filename);

  const backup = serializeForJson(entry);
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  console.log(`\n💾 Backup saved: ${filename}`);
  console.log(`   Path: ${filepath}`);
}

async function run() {
  try {
    await connectDB();
    await backupGlobalRankEntry();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

run();
