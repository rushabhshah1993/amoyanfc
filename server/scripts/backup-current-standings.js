/**
 * Backup Current Standings from MongoDB
 * Creates a backup of all current standings before any restoration
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { RoundStandings } from '../models/round-standings.model.js';

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
 * Backup current standings
 */
async function backupCurrentStandings() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 BACKING UP CURRENT STANDINGS FROM MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Get current standings count
    const totalCount = await RoundStandings.countDocuments({});
    console.log(`\n📊 Total standings in database: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️  No standings found in database. Nothing to backup.');
      console.log('   This is expected if standings were deleted or never imported.');
      return;
    }

    // Get standings by season
    const standingsBySeason = await RoundStandings.aggregate([
      { $group: { 
          _id: '$seasonNumber',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 Breakdown by Season:');
    standingsBySeason.forEach(s => {
      console.log(`   Season ${String(s._id).padStart(2)}: ${s.count} standings`);
    });

    // Fetch all standings
    console.log('\n📥 Fetching all standings from MongoDB...');
    const allStandings = await RoundStandings.find({})
      .sort({ seasonNumber: 1, divisionNumber: 1, roundNumber: 1, fightIdentifier: 1 })
      .lean();

    console.log(`✅ Fetched ${allStandings.length} standings`);

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}`);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `standings-backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    // Write backup file
    console.log(`\n💾 Writing backup to: ${backupFilename}`);
    fs.writeFileSync(backupPath, JSON.stringify(allStandings, null, 2));

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    console.log(`✅ Backup created successfully!`);
    console.log(`   - File: ${backupFilename}`);
    console.log(`   - Size: ${fileSizeKB} KB`);
    console.log(`   - Count: ${allStandings.length} standings`);

    // Create a summary file
    const summaryFilename = `standings-backup-${timestamp}-summary.txt`;
    const summaryPath = path.join(backupDir, summaryFilename);
    
    let summary = `IFC STANDINGS BACKUP SUMMARY\n`;
    summary += `${'='.repeat(70)}\n\n`;
    summary += `Backup Date: ${new Date().toISOString()}\n`;
    summary += `Total Standings: ${allStandings.length}\n`;
    summary += `File Size: ${fileSizeKB} KB\n\n`;
    summary += `Breakdown by Season:\n`;
    summary += `${'─'.repeat(70)}\n`;
    
    standingsBySeason.forEach(s => {
      summary += `Season ${String(s._id).padStart(2)}: ${s.count} standings\n`;
    });
    
    summary += `\nBackup Files:\n`;
    summary += `  - ${backupFilename}\n`;
    summary += `  - ${summaryFilename}\n`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`\n📄 Summary created: ${summaryFilename}`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ BACKUP COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\n🔒 Current standings are now safely backed up.');
    console.log('   You can proceed with restoration safely.');
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
backupCurrentStandings();

