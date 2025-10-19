/**
 * Backup Current Competitions from MongoDB
 * Creates a backup of all competition data before any modifications
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Competition } from '../models/competition.model.js';

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
 * Backup current competitions
 */
async function backupCurrentCompetitions() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 BACKING UP CURRENT COMPETITIONS FROM MONGODB');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Get current competitions count
    const totalCount = await Competition.countDocuments({});
    console.log(`\n📊 Total competitions in database: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️  No competitions found in database. Nothing to backup.');
      return;
    }

    // Get competitions by season
    const competitionsBySeason = await Competition.aggregate([
      { $group: { 
          _id: '$seasonMeta.seasonNumber',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 Breakdown by Season:');
    competitionsBySeason.forEach(c => {
      console.log(`   Season ${String(c._id).padStart(2)}: ${c.count} competition(s)`);
    });

    // Fetch all competitions
    console.log('\n📥 Fetching all competitions from MongoDB...');
    const allCompetitions = await Competition.find({})
      .sort({ 'seasonMeta.seasonNumber': 1 })
      .lean();

    console.log(`✅ Fetched ${allCompetitions.length} competitions`);

    // Count total fights
    let totalFights = 0;
    allCompetitions.forEach(comp => {
      if (comp.leagueData && comp.leagueData.divisions) {
        comp.leagueData.divisions.forEach(div => {
          if (div.rounds) {
            div.rounds.forEach(round => {
              if (round.fights) {
                totalFights += round.fights.length;
              }
            });
          }
        });
      }
    });
    console.log(`📊 Total fights across all competitions: ${totalFights}`);

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}`);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `competitions-backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    // Write backup file
    console.log(`\n💾 Writing backup to: ${backupFilename}`);
    fs.writeFileSync(backupPath, JSON.stringify(allCompetitions, null, 2));

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`✅ Backup created successfully!`);
    console.log(`   - File: ${backupFilename}`);
    console.log(`   - Size: ${fileSizeMB} MB`);
    console.log(`   - Count: ${allCompetitions.length} competitions`);
    console.log(`   - Total Fights: ${totalFights}`);

    // Create a summary file
    const summaryFilename = `competitions-backup-${timestamp}-summary.txt`;
    const summaryPath = path.join(backupDir, summaryFilename);
    
    let summary = `IFC COMPETITIONS BACKUP SUMMARY\n`;
    summary += `${'='.repeat(70)}\n\n`;
    summary += `Backup Date: ${new Date().toISOString()}\n`;
    summary += `Total Competitions: ${allCompetitions.length}\n`;
    summary += `Total Fights: ${totalFights}\n`;
    summary += `File Size: ${fileSizeMB} MB\n\n`;
    summary += `Breakdown by Season:\n`;
    summary += `${'─'.repeat(70)}\n`;
    
    competitionsBySeason.forEach(c => {
      summary += `Season ${String(c._id).padStart(2)}: ${c.count} competition(s)\n`;
    });
    
    summary += `\nBackup Files:\n`;
    summary += `  - ${backupFilename}\n`;
    summary += `  - ${summaryFilename}\n`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`\n📄 Summary created: ${summaryFilename}`);

    console.log('\n' + '='.repeat(70));
    console.log('✨ BACKUP COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\n🔒 Current competitions are now safely backed up.');
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
backupCurrentCompetitions();

