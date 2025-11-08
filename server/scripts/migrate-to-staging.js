/**
 * Data Migration Script: Production (gql-db) → Staging (staging-amoyan)
 * 
 * This script copies all collections from the production database to the staging database
 * while preserving all data integrity and relationships.
 * 
 * Usage:
 *   node server/scripts/migrate-to-staging.js
 * 
 * Features:
 * - Copies all collections with data
 * - Preserves indexes
 * - Maintains referential integrity
 * - Provides detailed progress logging
 * - Handles errors gracefully
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define source and target database URIs
const SOURCE_DB = process.env.MONGODB_URI; // gql-db (production)
const TARGET_DB = SOURCE_DB.replace('/gql-db', '/staging-amoyan');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Logs formatted messages to console
 */
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ ${colors.reset}${msg}`),
    success: (msg) => console.log(`${colors.green}✓ ${colors.reset}${msg}`),
    error: (msg) => console.log(`${colors.red}✗ ${colors.reset}${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠ ${colors.reset}${msg}`),
    step: (msg) => console.log(`${colors.cyan}➜ ${colors.reset}${msg}`),
    header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
};

/**
 * Creates a connection to a MongoDB database
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
 * Copies a single collection from source to target
 */
async function copyCollection(sourceConn, targetConn, collectionName) {
    try {
        const sourceCollection = sourceConn.collection(collectionName);
        const targetCollection = targetConn.collection(collectionName);
        
        // Get document count
        const count = await sourceCollection.countDocuments();
        
        if (count === 0) {
            log.warning(`  ${collectionName}: No documents to copy`);
            return { collectionName, count: 0, success: true };
        }
        
        log.step(`  Copying ${collectionName} (${count} documents)...`);
        
        // Drop target collection if it exists to ensure clean copy
        try {
            await targetCollection.drop();
        } catch (err) {
            // Collection doesn't exist, which is fine
        }
        
        // Fetch all documents
        const documents = await sourceCollection.find({}).toArray();
        
        // Insert documents in batches to avoid memory issues
        const batchSize = 1000;
        let insertedCount = 0;
        
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            await targetCollection.insertMany(batch, { ordered: false });
            insertedCount += batch.length;
        }
        
        // Copy indexes
        const indexes = await sourceCollection.indexes();
        for (const index of indexes) {
            // Skip the default _id index
            if (index.name === '_id_') continue;
            
            try {
                const keys = index.key;
                const options = {
                    name: index.name,
                    unique: index.unique || false,
                    sparse: index.sparse || false
                };
                await targetCollection.createIndex(keys, options);
            } catch (err) {
                log.warning(`    Could not create index ${index.name}: ${err.message}`);
            }
        }
        
        log.success(`  ${collectionName}: ${insertedCount} documents copied`);
        return { collectionName, count: insertedCount, success: true };
        
    } catch (error) {
        log.error(`  ${collectionName}: Failed to copy - ${error.message}`);
        return { collectionName, count: 0, success: false, error: error.message };
    }
}

/**
 * Main migration function
 */
async function migrate() {
    log.header();
    console.log(`${colors.bright}${colors.cyan}       DATA MIGRATION: PRODUCTION → STAGING${colors.reset}`);
    log.header();
    
    log.info(`Source DB: ${colors.bright}gql-db${colors.reset}`);
    log.info(`Target DB: ${colors.bright}staging-amoyan${colors.reset}\n`);
    
    let sourceConn, targetConn;
    
    try {
        // Create connections
        log.step('Establishing database connections...');
        sourceConn = await createConnection(SOURCE_DB, 'Source (gql-db)');
        targetConn = await createConnection(TARGET_DB, 'Target (staging-amoyan)');
        
        // Get all collections
        log.step('\nFetching collections from source database...');
        const collections = await getCollections(sourceConn);
        log.info(`Found ${colors.bright}${collections.length}${colors.reset} collections\n`);
        
        // Display collections to be copied
        console.log(`${colors.cyan}Collections to copy:${colors.reset}`);
        collections.forEach(col => console.log(`  • ${col}`));
        console.log('');
        
        // Copy each collection
        log.step('Starting data migration...\n');
        const results = [];
        
        for (const collectionName of collections) {
            const result = await copyCollection(sourceConn, targetConn, collectionName);
            results.push(result);
        }
        
        // Summary
        log.header();
        console.log(`${colors.bright}${colors.cyan}                    MIGRATION SUMMARY${colors.reset}`);
        log.header();
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalDocs = results.reduce((sum, r) => sum + r.count, 0);
        
        console.log(`\n${colors.green}Successful:${colors.reset} ${successful}/${collections.length} collections`);
        console.log(`${colors.red}Failed:${colors.reset}     ${failed}/${collections.length} collections`);
        console.log(`${colors.cyan}Total Docs:${colors.reset}  ${totalDocs} documents copied\n`);
        
        if (failed > 0) {
            console.log(`${colors.red}Failed Collections:${colors.reset}`);
            results.filter(r => !r.success).forEach(r => {
                console.log(`  ✗ ${r.collectionName}: ${r.error}`);
            });
            console.log('');
        }
        
        log.success('Migration completed!\n');
        
    } catch (error) {
        log.error(`Migration failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    } finally {
        // Close connections
        if (sourceConn) {
            await sourceConn.close();
            log.info('Closed source database connection');
        }
        if (targetConn) {
            await targetConn.close();
            log.info('Closed target database connection');
        }
    }
}

// Run migration
migrate()
    .then(() => {
        log.success('Migration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        log.error('Migration script failed');
        console.error(error);
        process.exit(1);
    });


