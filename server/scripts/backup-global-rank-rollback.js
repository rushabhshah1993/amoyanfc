/**
 * Backup entire GlobalRank collection for rollback
 * Run before recalculating/overwriting global rankings.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { GlobalRank } from '../models/global-rank.model.js';

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
    console.log('✅ Connected to MongoDB');

    const all = await GlobalRank.find({}).sort({ createdAt: 1 }).lean();
    console.log(`   Found ${all.length} GlobalRank document(s).`);

    const exportDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `global-rank-rollback-${timestamp}.json`;
    const filepath = path.join(exportDir, filename);

    const backup = serialize({ documents: all, backupAt: new Date().toISOString() });
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    console.log(`\n💾 Full backup saved: ${filename}`);
    console.log(`   Path: ${filepath}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  }
}

run();
