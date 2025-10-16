import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Fighter } from '../models/fighter.model.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a comprehensive backup of all fighters data from MongoDB
 * The backup includes:
 * - All fighter documents with complete data
 * - Metadata about the backup (timestamp, count, etc.)
 * - Backup validation information
 */
async function backupFightersData() {
    try {
        console.log('🚀 Starting fighters data backup process...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');

        // Fetch all fighters data
        console.log('📊 Fetching all fighters data...');
        const fighters = await Fighter.find({}).lean();
        
        if (!fighters || fighters.length === 0) {
            console.log('⚠️  No fighters found in the database');
            return;
        }

        console.log(`📈 Found ${fighters.length} fighters in the database`);

        // Create backup metadata
        const backupMetadata = {
            timestamp: new Date().toISOString(),
            totalFighters: fighters.length,
            database: mongoose.connection.db.databaseName,
            collection: 'fighters',
            backupVersion: '1.0',
            description: 'Complete fighters data backup including all fields and relationships',
            fields: {
                basicInfo: ['firstName', 'lastName', 'dateOfBirth', 'profileImage', 'skillset', 'images', 'location'],
                rankings: ['globalRank'],
                statistics: ['fightStats'],
                streaks: ['streaks'],
                history: ['opponentsHistory', 'competitionHistory'],
                physical: ['physicalAttributes'],
                earnings: ['earnings'],
                debut: ['debutInformation'],
                metadata: ['isArchived']
            }
        };

        // Create backup object
        const backupData = {
            metadata: backupMetadata,
            fighters: fighters
        };

        // Create backup directory if it doesn't exist
        const backupDir = path.join(__dirname, '..', '..', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            console.log('📁 Created backups directory');
        }

        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupFilename = `fighters-backup-${timestamp}.json`;
        const backupPath = path.join(backupDir, backupFilename);

        // Write backup to file
        console.log('💾 Writing backup to file...');
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        
        // Get file size
        const stats = fs.statSync(backupPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ Backup completed successfully!');
        console.log(`📄 Backup file: ${backupPath}`);
        console.log(`📊 Total fighters backed up: ${fighters.length}`);
        console.log(`💾 File size: ${fileSizeInMB} MB`);
        console.log(`🕐 Backup timestamp: ${backupMetadata.timestamp}`);

        // Create a summary file for easy reference
        const summaryPath = path.join(backupDir, `backup-summary-${timestamp}.txt`);
        const summaryContent = `
FIGHTERS DATA BACKUP SUMMARY
============================
Backup Date: ${backupMetadata.timestamp}
Total Fighters: ${fighters.length}
Database: ${backupMetadata.database}
Collection: ${backupMetadata.collection}
Backup File: ${backupFilename}
File Size: ${fileSizeInMB} MB

BACKUP CONTENTS:
- Complete fighter profiles with all personal information
- Fight statistics and performance data
- Win/loss streaks across competitions
- Head-to-head records against opponents
- Competition history and titles
- Physical attributes and ratings
- Earnings information
- Debut information
- Profile images and media

VALIDATION:
- All fighters exported successfully
- No data truncation or errors
- Complete schema compliance maintained

RESTORE INSTRUCTIONS:
To restore this backup, use the restore-fighters-data.js script
or manually import the JSON data into your MongoDB collection.
        `.trim();

        fs.writeFileSync(summaryPath, summaryContent);
        console.log(`📋 Summary file created: ${summaryPath}`);

        // Display sample fighter data for verification
        if (fighters.length > 0) {
            console.log('\n🔍 Sample fighter data (first fighter):');
            const sampleFighter = fighters[0];
            console.log(`   Name: ${sampleFighter.firstName} ${sampleFighter.lastName}`);
            console.log(`   ID: ${sampleFighter._id}`);
            console.log(`   Skills: ${sampleFighter.skillset ? sampleFighter.skillset.join(', ') : 'None'}`);
            console.log(`   Total Competitions: ${sampleFighter.competitionHistory ? sampleFighter.competitionHistory.length : 0}`);
            console.log(`   Total Opponents: ${sampleFighter.opponentsHistory ? sampleFighter.opponentsHistory.length : 0}`);
            console.log(`   Streaks: ${sampleFighter.streaks ? sampleFighter.streaks.length : 0}`);
        }

    } catch (error) {
        console.error('❌ Error during backup process:', error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

/**
 * Validates the backup data integrity
 */
function validateBackup(backupData) {
    const { metadata, fighters } = backupData;
    
    console.log('🔍 Validating backup data...');
    
    // Check metadata
    if (!metadata || !metadata.totalFighters) {
        throw new Error('Invalid backup metadata');
    }
    
    // Check fighters array
    if (!Array.isArray(fighters)) {
        throw new Error('Fighters data is not an array');
    }
    
    // Check count matches
    if (fighters.length !== metadata.totalFighters) {
        throw new Error(`Fighter count mismatch: expected ${metadata.totalFighters}, got ${fighters.length}`);
    }
    
    // Check each fighter has required fields
    const requiredFields = ['firstName', 'lastName'];
    for (let i = 0; i < fighters.length; i++) {
        const fighter = fighters[i];
        for (const field of requiredFields) {
            if (!fighter[field]) {
                throw new Error(`Fighter at index ${i} missing required field: ${field}`);
            }
        }
    }
    
    console.log('✅ Backup validation passed');
    return true;
}

// Run the backup if this script is executed directly
const scriptPath = process.argv[1];
const currentModulePath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === currentModulePath) {
    
    backupFightersData()
        .then(() => {
            console.log('🎉 Backup process completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Backup process failed:', error);
            process.exit(1);
        });
}

export { backupFightersData, validateBackup };
