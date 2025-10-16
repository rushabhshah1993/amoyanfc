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
 * Restores fighters data from a backup file
 * @param {string} backupFilePath - Path to the backup JSON file
 * @param {boolean} clearExisting - Whether to clear existing fighters before restore
 */
async function restoreFightersData(backupFilePath, clearExisting = false) {
    try {
        console.log('🚀 Starting fighters data restore process...');
        
        // Check if backup file exists
        if (!fs.existsSync(backupFilePath)) {
            throw new Error(`Backup file not found: ${backupFilePath}`);
        }

        // Read and parse backup file
        console.log('📖 Reading backup file...');
        const backupContent = fs.readFileSync(backupFilePath, 'utf8');
        const backupData = JSON.parse(backupContent);

        // Validate backup data structure
        if (!backupData.metadata || !backupData.fighters) {
            throw new Error('Invalid backup file format');
        }

        console.log(`📊 Backup contains ${backupData.fighters.length} fighters`);
        console.log(`🕐 Backup created on: ${backupData.metadata.timestamp}`);

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing fighters if requested
        if (clearExisting) {
            console.log('🗑️  Clearing existing fighters data...');
            const deleteResult = await Fighter.deleteMany({});
            console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing fighters`);
        }

        // Restore fighters data
        console.log('📥 Restoring fighters data...');
        const restoreResult = await Fighter.insertMany(backupData.fighters, {
            ordered: false // Continue even if some documents fail
        });

        console.log('✅ Restore completed successfully!');
        console.log(`📊 Restored ${restoreResult.length} fighters`);
        console.log(`🕐 Restore timestamp: ${new Date().toISOString()}`);

        // Verify restore
        const totalFighters = await Fighter.countDocuments();
        console.log(`🔍 Total fighters in database: ${totalFighters}`);

        // Display sample restored fighter
        if (restoreResult.length > 0) {
            const sampleFighter = restoreResult[0];
            console.log('\n🔍 Sample restored fighter:');
            console.log(`   Name: ${sampleFighter.firstName} ${sampleFighter.lastName}`);
            console.log(`   ID: ${sampleFighter._id}`);
        }

    } catch (error) {
        console.error('❌ Error during restore process:', error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

/**
 * Lists available backup files
 */
function listBackupFiles() {
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    
    if (!fs.existsSync(backupDir)) {
        console.log('📁 No backups directory found');
        return [];
    }

    const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('fighters-backup-') && file.endsWith('.json'))
        .map(file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            return {
                filename: file,
                path: filePath,
                size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                created: stats.birthtime.toISOString()
            };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

    console.log('📋 Available backup files:');
    files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.filename}`);
        console.log(`      Size: ${file.size}`);
        console.log(`      Created: ${file.created}`);
        console.log('');
    });

    return files;
}

/**
 * Validates a backup file before restore
 */
async function validateBackupFile(backupFilePath) {
    try {
        console.log('🔍 Validating backup file...');
        
        if (!fs.existsSync(backupFilePath)) {
            throw new Error(`Backup file not found: ${backupFilePath}`);
        }

        const backupContent = fs.readFileSync(backupFilePath, 'utf8');
        const backupData = JSON.parse(backupContent);

        // Check structure
        if (!backupData.metadata || !backupData.fighters) {
            throw new Error('Invalid backup file structure');
        }

        // Check metadata
        const { metadata, fighters } = backupData;
        console.log(`📊 Backup metadata:`);
        console.log(`   Created: ${metadata.timestamp}`);
        console.log(`   Total fighters: ${metadata.totalFighters}`);
        console.log(`   Database: ${metadata.database}`);
        console.log(`   Collection: ${metadata.collection}`);

        // Check count
        if (fighters.length !== metadata.totalFighters) {
            throw new Error(`Fighter count mismatch: metadata says ${metadata.totalFighters}, file contains ${fighters.length}`);
        }

        // Check sample fighter structure
        if (fighters.length > 0) {
            const sampleFighter = fighters[0];
            const requiredFields = ['firstName', 'lastName'];
            for (const field of requiredFields) {
                if (!sampleFighter[field]) {
                    throw new Error(`Sample fighter missing required field: ${field}`);
                }
            }
            console.log(`✅ Sample fighter validation passed: ${sampleFighter.firstName} ${sampleFighter.lastName}`);
        }

        console.log('✅ Backup file validation passed');
        return true;

    } catch (error) {
        console.error('❌ Backup file validation failed:', error);
        throw error;
    }
}

// Command line interface
const scriptPath = process.argv[1];
const currentModulePath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === currentModulePath) {
    const command = process.argv[2];
    const backupFile = process.argv[3];
    const clearExisting = process.argv[4] === '--clear';

    switch (command) {
        case 'list':
            listBackupFiles();
            break;
            
        case 'validate':
            if (!backupFile) {
                console.error('❌ Please provide backup file path');
                process.exit(1);
            }
            validateBackupFile(backupFile)
                .then(() => {
                    console.log('🎉 Validation completed successfully!');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('💥 Validation failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'restore':
            if (!backupFile) {
                console.error('❌ Please provide backup file path');
                process.exit(1);
            }
            restoreFightersData(backupFile, clearExisting)
                .then(() => {
                    console.log('🎉 Restore completed successfully!');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('💥 Restore failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log(`
🔧 Fighters Data Restore Tool

Usage:
  node restore-fighters-data.js list
  node restore-fighters-data.js validate <backup-file-path>
  node restore-fighters-data.js restore <backup-file-path> [--clear]

Commands:
  list     - List all available backup files
  validate - Validate a backup file before restore
  restore  - Restore fighters data from backup file
             Use --clear flag to clear existing data before restore

Examples:
  node restore-fighters-data.js list
  node restore-fighters-data.js validate backups/fighters-backup-2024-01-15.json
  node restore-fighters-data.js restore backups/fighters-backup-2024-01-15.json
  node restore-fighters-data.js restore backups/fighters-backup-2024-01-15.json --clear
            `);
            break;
    }
}

export { restoreFightersData, listBackupFiles, validateBackupFile };
