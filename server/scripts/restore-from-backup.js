/**
 * Restore Script: Restore Competition and Fighter data from backup
 * 
 * Usage: node scripts/restore-from-backup.js <backup-directory-name>
 * Example: node scripts/restore-from-backup.js migration-2025-01-15T10-30-00
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

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function restoreData(backupDirName) {
    try {
        const backupDir = path.join(__dirname, '../../backups', backupDirName);
        
        if (!fs.existsSync(backupDir)) {
            console.error(`❌ Backup directory not found: ${backupDir}`);
            console.log('\n📁 Available backups:');
            const backupsRoot = path.join(__dirname, '../../backups');
            const dirs = fs.readdirSync(backupsRoot).filter(f => 
                fs.statSync(path.join(backupsRoot, f)).isDirectory() && f.startsWith('migration-')
            );
            dirs.forEach(dir => console.log(`   - ${dir}`));
            return;
        }

        console.log(`📂 Restoring from: ${backupDir}\n`);

        // Read metadata
        const metadataPath = path.join(backupDir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            console.log('📋 Backup metadata:');
            console.log(`   Timestamp: ${metadata.timestamp}`);
            console.log(`   Fighters: ${metadata.collections.fighters}`);
            console.log(`   Competitions: ${metadata.collections.competitions}`);
            console.log(`   Purpose: ${metadata.purpose}\n`);
        }

        console.log('⚠️  WARNING: This will REPLACE existing data!');
        console.log('⚠️  Make sure you want to proceed.\n');
        
        // In a real scenario, you'd want user confirmation here
        // For now, we'll proceed automatically

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Restore Fighters
        console.log('👤 Restoring Fighters collection...');
        const fightersPath = path.join(backupDir, 'fighters.json');
        const fighters = JSON.parse(fs.readFileSync(fightersPath, 'utf8'));
        
        for (const fighterData of fighters) {
            await Fighter.findByIdAndUpdate(
                fighterData._id,
                fighterData,
                { upsert: true, overwrite: true }
            );
        }
        console.log(`✅ Restored ${fighters.length} fighters`);

        // Restore Competitions
        console.log('\n🏆 Restoring Competitions collection...');
        const competitionsPath = path.join(backupDir, 'competitions.json');
        const competitions = JSON.parse(fs.readFileSync(competitionsPath, 'utf8'));
        
        for (const competitionData of competitions) {
            await Competition.findByIdAndUpdate(
                competitionData._id,
                competitionData,
                { upsert: true, overwrite: true }
            );
        }
        console.log(`✅ Restored ${competitions.length} competitions`);

        console.log('\n' + '='.repeat(70));
        console.log('✅ RESTORE COMPLETE');
        console.log('='.repeat(70));
        console.log(`👤 Fighters restored: ${fighters.length}`);
        console.log(`🏆 Competitions restored: ${competitions.length}`);
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Restore failed:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Get backup directory from command line argument
const backupDirName = process.argv[2];

if (!backupDirName) {
    console.error('❌ Please provide backup directory name');
    console.log('\nUsage: node scripts/restore-from-backup.js <backup-directory-name>');
    console.log('Example: node scripts/restore-from-backup.js migration-2025-01-15T10-30-00\n');
    
    const backupsRoot = path.join(__dirname, '../../backups');
    if (fs.existsSync(backupsRoot)) {
        console.log('📁 Available backups:');
        const dirs = fs.readdirSync(backupsRoot).filter(f => 
            fs.statSync(path.join(backupsRoot, f)).isDirectory() && f.startsWith('migration-')
        );
        dirs.forEach(dir => console.log(`   - ${dir}`));
    }
    process.exit(1);
}

// Run the restore
restoreData(backupDirName);

