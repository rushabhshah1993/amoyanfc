/**
 * Backup Script: Export Competition and Fighter data before migration
 * 
 * Creates timestamped JSON backups in the backups/ directory
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two levels up from scripts)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function backupData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Create backup directory with timestamp
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupDir = path.join(__dirname, '../../backups', `migration-${timestamp}`);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`📁 Backup directory: ${backupDir}\n`);

        // Backup Fighters
        console.log('👤 Backing up Fighters collection...');
        const fighters = await Fighter.find({}).lean();
        const fightersPath = path.join(backupDir, 'fighters.json');
        fs.writeFileSync(fightersPath, JSON.stringify(fighters, null, 2));
        console.log(`✅ Backed up ${fighters.length} fighters to ${fightersPath}`);

        // Backup Competitions
        console.log('\n🏆 Backing up Competitions collection...');
        const competitions = await Competition.find({}).lean();
        const competitionsPath = path.join(backupDir, 'competitions.json');
        fs.writeFileSync(competitionsPath, JSON.stringify(competitions, null, 2));
        console.log(`✅ Backed up ${competitions.length} competitions to ${competitionsPath}`);

        // Create backup metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            collections: {
                fighters: fighters.length,
                competitions: competitions.length
            },
            purpose: 'Pre-migration backup for opponent history dates',
            mongodbUri: MONGODB_URI.replace(/\/\/.*@/, '//***@') // Hide credentials
        };
        
        const metadataPath = path.join(backupDir, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        console.log('\n' + '='.repeat(70));
        console.log('✅ BACKUP COMPLETE');
        console.log('='.repeat(70));
        console.log(`📂 Location: ${backupDir}`);
        console.log(`👤 Fighters: ${fighters.length}`);
        console.log(`🏆 Competitions: ${competitions.length}`);
        console.log('='.repeat(70) + '\n');

        console.log('📝 You can now safely run the migration script.');
        console.log('💡 To restore from this backup if needed, use the restore script.\n');

    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the backup
backupData();

