import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';
import { Fighter } from '../models/fighter.model.js';

/**
 * Connect to Production MongoDB (gql-db)
 */
async function connectDB() {
  try {
    const baseUri = process.env.MONGODB_URI || '';
    const productionUri = baseUri.replace(/\/[^/?]+\?/, '/gql-db?');
    
    const connection = await mongoose.connect(productionUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(`✅ Connected to: ${connection.connection.db.databaseName}\n`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Backup IFL S1 fighter data
 */
async function backupIFLS1FighterData() {
  try {
    console.log('='.repeat(70));
    console.log('BACKUP IFL S1 FIGHTER DATA');
    console.log('='.repeat(70));

    // Find IFL Meta
    const iflMeta = await CompetitionMeta.findOne({ shortName: 'IFL' });
    if (!iflMeta) {
      console.log('❌ IFL Meta not found');
      return null;
    }

    // Find IFL S1
    const iflS1 = await Competition.findOne({
      competitionMetaId: iflMeta._id,
      'seasonMeta.seasonNumber': 1
    });

    if (!iflS1) {
      console.log('❌ IFL S1 not found');
      return null;
    }

    console.log(`\n✅ IFL Meta ID: ${iflMeta._id}`);
    console.log(`✅ IFL S1 ID: ${iflS1._id}`);

    // Get all fighter IDs from IFL S1
    const iflS1FighterIds = [];
    if (iflS1.seasonMeta.leagueDivisions) {
      iflS1.seasonMeta.leagueDivisions.forEach(div => {
        div.fighters.forEach(fId => {
          iflS1FighterIds.push(fId.toString());
        });
      });
    }

    console.log(`\n📊 Backing up ${iflS1FighterIds.length} fighters...`);

    // Get all fighter data
    const fighters = await Fighter.find({
      _id: { $in: iflS1FighterIds }
    }).lean();

    console.log(`✅ Retrieved ${fighters.length} fighter documents`);

    // Create backup directory if it doesn't exist
    const backupDir = resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `ifl-s1-fighters-backup-${timestamp}.json`;
    const filepath = resolve(backupDir, filename);

    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(fighters, null, 2), 'utf8');

    console.log(`\n💾 Backup saved successfully!`);
    console.log(`   File: ${filename}`);
    console.log(`   Path: ${filepath}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    console.log(`   Fighters backed up: ${fighters.length}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ BACKUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n✓ Safe to run fix script now\n');

    return filepath;

  } catch (error) {
    console.error('\n❌ Error during backup:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();
    await backupIFLS1FighterData();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

main();

