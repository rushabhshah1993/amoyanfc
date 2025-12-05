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

import { Articles } from '../models/articles.model.js';

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
 * Backup TEMP-THUMB articles
 */
async function backupTempThumbArticles() {
  try {
    console.log('='.repeat(70));
    console.log('BACKUP TEMP-THUMB ARTICLES');
    console.log('='.repeat(70));

    // Find all TEMP-THUMB articles
    const tempArticles = await Articles.find({
      title: { $regex: /^TEMP-THUMB-/i }
    }).lean();

    console.log(`\n📊 Found ${tempArticles.length} TEMP-THUMB articles to backup`);

    if (tempArticles.length === 0) {
      console.log('\n✅ No TEMP-THUMB articles to backup!');
      return null;
    }

    // Create backup directory if it doesn't exist
    const backupDir = resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `temp-thumb-articles-backup-${timestamp}.json`;
    const filepath = resolve(backupDir, filename);

    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(tempArticles, null, 2), 'utf8');

    console.log(`\n💾 Backup saved successfully!`);
    console.log(`   File: ${filename}`);
    console.log(`   Path: ${filepath}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    console.log(`   Articles backed up: ${tempArticles.length}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ BACKUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n✓ Safe to run delete script now\n');

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
    await backupTempThumbArticles();
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

