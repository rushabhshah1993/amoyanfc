/**
 * Production Database Backup Script
 * 
 * Creates a complete backup of the production database before any migrations.
 * Backups are stored in the backups/ directory with timestamps.
 * 
 * Usage:
 *   node server/scripts/backup-production.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Load environment variables
dotenv.config({ path: join(projectRoot, '.env') });

const PRODUCTION_DB = process.env.MONGODB_URI;

// Color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    step: (msg) => console.log(`${colors.cyan}➜${colors.reset} ${msg}`),
    header: () => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
};

/**
 * Creates a connection to MongoDB
 */
async function createConnection(uri, name) {
    try {
        const connection = await mongoose.createConnection(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        }).asPromise();
        
        log.success(`Connected to ${name} database`);
        return connection;
    } catch (error) {
        log.error(`Failed to connect to ${name} database`);
        throw error;
    }
}

/**
 * Gets all collection names from a database
 */
async function getCollections(connection) {
    const collections = await connection.db.listCollections().toArray();
    return collections.map(col => col.name);
}

/**
 * Backup a single collection
 */
async function backupCollection(connection, collectionName) {
    try {
        const collection = connection.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count === 0) {
            log.warning(`  ${collectionName}: No documents to backup`);
            return { collectionName, count: 0, success: true, data: [] };
        }
        
        log.step(`  Backing up ${collectionName} (${count} documents)...`);
        
        // Fetch all documents
        const documents = await collection.find({}).toArray();
        
        log.success(`  ${collectionName}: ${documents.length} documents backed up`);
        return { collectionName, count: documents.length, success: true, data: documents };
        
    } catch (error) {
        log.error(`  ${collectionName}: Failed to backup - ${error.message}`);
        return { collectionName, count: 0, success: false, error: error.message };
    }
}

/**
 * Generate timestamp for backup filename
 */
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Main backup function
 */
async function backup() {
    log.header();
    console.log(`${colors.bright}${colors.magenta}         PRODUCTION DATABASE BACKUP${colors.reset}`);
    log.header();
    
    const timestamp = getTimestamp();
    const backupDir = join(projectRoot, 'backups', `backup_${timestamp}`);
    
    log.info(`Backup will be saved to: ${colors.bright}${backupDir}${colors.reset}\n`);
    
    let connection;
    
    try {
        // Create backup directory
        if (!existsSync(backupDir)) {
            await mkdir(backupDir, { recursive: true });
            log.success('Created backup directory');
        }
        
        // Connect to production database
        log.step('Connecting to production database...');
        connection = await createConnection(PRODUCTION_DB, 'Production (gql-db)');
        
        // Get all collections
        log.step('\nFetching collections from production database...');
        const collections = await getCollections(connection);
        log.info(`Found ${colors.bright}${collections.length}${colors.reset} collections\n`);
        
        // Display collections to be backed up
        console.log(`${colors.cyan}Collections to backup:${colors.reset}`);
        collections.forEach(col => console.log(`  • ${col}`));
        console.log('');
        
        // Backup each collection
        log.step('Starting backup process...\n');
        const backupData = {};
        const results = [];
        
        for (const collectionName of collections) {
            const result = await backupCollection(connection, collectionName);
            results.push(result);
            
            if (result.success) {
                backupData[collectionName] = result.data;
            }
        }
        
        // Save backup files
        log.step('\nSaving backup files...');
        
        // Save individual collection files
        for (const [collectionName, data] of Object.entries(backupData)) {
            const filename = join(backupDir, `${collectionName}.json`);
            await writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
            log.success(`  Saved ${collectionName}.json`);
        }
        
        // Save complete backup as single file
        const completeBackupFile = join(backupDir, 'complete_backup.json');
        await writeFile(completeBackupFile, JSON.stringify(backupData, null, 2), 'utf8');
        log.success(`  Saved complete_backup.json`);
        
        // Save metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            database: 'gql-db',
            collections: results.map(r => ({
                name: r.collectionName,
                documentCount: r.count,
                success: r.success
            })),
            totalCollections: collections.length,
            totalDocuments: results.reduce((sum, r) => sum + r.count, 0)
        };
        
        const metadataFile = join(backupDir, 'metadata.json');
        await writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
        log.success(`  Saved metadata.json`);
        
        // Summary
        log.header();
        console.log(`${colors.bright}${colors.magenta}                    BACKUP SUMMARY${colors.reset}`);
        log.header();
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalDocs = results.reduce((sum, r) => sum + r.count, 0);
        
        console.log(`\n${colors.green}Successful:${colors.reset}   ${successful}/${collections.length} collections`);
        console.log(`${colors.red}Failed:${colors.reset}       ${failed}/${collections.length} collections`);
        console.log(`${colors.cyan}Total Docs:${colors.reset}    ${totalDocs} documents backed up`);
        console.log(`${colors.magenta}Backup Location:${colors.reset} ${backupDir}\n`);
        
        if (failed > 0) {
            console.log(`${colors.red}Failed Collections:${colors.reset}`);
            results.filter(r => !r.success).forEach(r => {
                console.log(`  ✗ ${r.collectionName}: ${r.error}`);
            });
            console.log('');
        }
        
        log.success('Backup completed successfully! 🎉\n');
        log.info('Your production data is now safely backed up.');
        log.info('You can proceed with the staging migration.\n');
        
        return { success: true, backupDir, metadata };
        
    } catch (error) {
        log.error(`Backup failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    } finally {
        // Close connection
        if (connection) {
            await connection.close();
            log.info('Closed database connection');
        }
    }
}

// Run backup
backup()
    .then((result) => {
        log.success('\n✅ Backup script completed successfully');
        console.log(`\n${colors.bright}Next step:${colors.reset} Run migration to staging`);
        console.log(`  ${colors.cyan}npm run migrate:staging${colors.reset}\n`);
        process.exit(0);
    })
    .catch((error) => {
        log.error('\n❌ Backup script failed');
        console.error(error);
        process.exit(1);
    });

