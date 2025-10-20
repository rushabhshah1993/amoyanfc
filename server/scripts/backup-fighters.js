/**
 * Backup Current Fighters from MongoDB
 * Creates a backup of all fighter data before any modifications
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
 * Backup current fighters
 */
async function backupCurrentFighters() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 BACKING UP CURRENT FIGHTERS FROM MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Get current fighters count
    const totalCount = await Fighter.countDocuments({});
    console.log(`\n📊 Total fighters in database: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️  No fighters found in database. Nothing to backup.');
      return;
    }

    // Fetch all fighters
    console.log('\n📥 Fetching all fighters from MongoDB...');
    const allFighters = await Fighter.find({})
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    console.log(`✅ Fetched ${allFighters.length} fighters`);

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}`);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `fighters-backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    // Write backup file
    console.log(`\n💾 Writing backup to: ${backupFilename}`);
    fs.writeFileSync(backupPath, JSON.stringify(allFighters, null, 2));

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`✅ Backup created successfully!`);
    console.log(`   - File: ${backupFilename}`);
    console.log(`   - Size: ${fileSizeMB} MB`);
    console.log(`   - Count: ${allFighters.length} fighters`);

    // Create a summary file
    const summaryFilename = `fighters-backup-${timestamp}-summary.txt`;
    const summaryPath = path.join(backupDir, summaryFilename);
    
    let summary = `FIGHTERS BACKUP SUMMARY\n`;
    summary += `${'='.repeat(70)}\n\n`;
    summary += `Backup Date: ${new Date().toISOString()}\n`;
    summary += `Total Fighters: ${allFighters.length}\n`;
    summary += `File Size: ${fileSizeMB} MB\n\n`;
    summary += `Backup Files:\n`;
    summary += `  - ${backupFilename}\n`;
    summary += `  - ${summaryFilename}\n`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`\n📄 Summary created: ${summaryFilename}`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ BACKUP COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\n🔒 Current fighters are now safely backed up.');
    console.log('   You can proceed with modifications safely.');
    console.log('');

  } catch (error) {
    console.error('\n❌ Backup failed:', error);
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

// Run the backup
backupCurrentFighters();

