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
 * Creates a backup of current streaks data from all fighters
 */
async function backupCurrentStreaks() {
    try {
        console.log('🚀 Starting streaks data backup process...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');

        // Fetch all fighters with their streaks data
        console.log('📊 Fetching all fighters streaks data...');
        const fighters = await Fighter.find({}).select('firstName lastName streaks').lean();
        
        if (!fighters || fighters.length === 0) {
            console.log('⚠️  No fighters found in the database');
            return;
        }

        console.log(`📈 Found ${fighters.length} fighters in the database`);

        // Count fighters with streaks
        const fightersWithStreaks = fighters.filter(fighter => fighter.streaks && fighter.streaks.length > 0);
        console.log(`📊 Fighters with streaks: ${fightersWithStreaks.length}`);

        // Create backup metadata
        const backupMetadata = {
            timestamp: new Date().toISOString(),
            totalFighters: fighters.length,
            fightersWithStreaks: fightersWithStreaks.length,
            database: mongoose.connection.db.databaseName,
            collection: 'fighters',
            backupVersion: '1.0',
            description: 'Current streaks data backup before regeneration',
            purpose: 'Safety backup before removing and regenerating streaks'
        };

        // Create backup object
        const backupData = {
            metadata: backupMetadata,
            fighters: fighters.map(fighter => ({
                _id: fighter._id,
                firstName: fighter.firstName,
                lastName: fighter.lastName,
                streaks: fighter.streaks || []
            }))
        };

        // Create backup directory if it doesn't exist
        const backupDir = path.join(__dirname, '..', '..', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            console.log('📁 Created backups directory');
        }

        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupFilename = `streaks-backup-${timestamp}.json`;
        const backupPath = path.join(backupDir, backupFilename);

        // Write backup to file
        console.log('💾 Writing streaks backup to file...');
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        
        // Get file size
        const stats = fs.statSync(backupPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ Streaks backup completed successfully!');
        console.log(`📄 Backup file: ${backupPath}`);
        console.log(`📊 Total fighters backed up: ${fighters.length}`);
        console.log(`📊 Fighters with streaks: ${fightersWithStreaks.length}`);
        console.log(`💾 File size: ${fileSizeInMB} MB`);
        console.log(`🕐 Backup timestamp: ${backupMetadata.timestamp}`);

        // Display sample streaks data for verification
        if (fightersWithStreaks.length > 0) {
            console.log('\n🔍 Sample streaks data (first fighter with streaks):');
            const sampleFighter = fightersWithStreaks[0];
            console.log(`   Name: ${sampleFighter.firstName} ${sampleFighter.lastName}`);
            console.log(`   ID: ${sampleFighter._id}`);
            console.log(`   Total Streaks: ${sampleFighter.streaks.length}`);
            
            if (sampleFighter.streaks.length > 0) {
                const firstStreak = sampleFighter.streaks[0];
                console.log(`   Sample Streak:`);
                console.log(`     Type: ${firstStreak.type}`);
                console.log(`     Count: ${firstStreak.count}`);
                console.log(`     Active: ${firstStreak.active}`);
                console.log(`     Start: Season ${firstStreak.start?.season}, Division ${firstStreak.start?.division}, Round ${firstStreak.start?.round}`);
            }
        }

    } catch (error) {
        console.error('❌ Error during streaks backup process:', error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the backup if this script is executed directly
const scriptPath = process.argv[1];
const currentModulePath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === currentModulePath) {
    backupCurrentStreaks()
        .then(() => {
            console.log('🎉 Streaks backup process completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Streaks backup process failed:', error);
            process.exit(1);
        });
}

export { backupCurrentStreaks };
