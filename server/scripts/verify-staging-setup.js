/**
 * Staging Setup Verification Script
 * 
 * This script verifies that your staging environment is properly configured
 * before running the migration.
 * 
 * Usage:
 *   node server/scripts/verify-staging-setup.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    header: () => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`)
};

/**
 * Check if a file exists
 */
function checkFile(filePath, fileName) {
    if (existsSync(filePath)) {
        log.success(`${fileName} exists`);
        return true;
    } else {
        log.error(`${fileName} not found`);
        return false;
    }
}

/**
 * Verify environment variables in a file
 */
function verifyEnvFile(filePath, envName) {
    if (!existsSync(filePath)) {
        return { exists: false, valid: false, missing: [] };
    }

    const result = dotenv.config({ path: filePath });
    
    if (result.error) {
        return { exists: true, valid: false, error: result.error.message };
    }

    const requiredVars = [
        'MONGODB_URI',
        'PORT',
        'NODE_ENV',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'JWT_SECRET',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY'
    ];

    const missing = requiredVars.filter(varName => {
        const value = result.parsed[varName];
        return !value || value.includes('your_') || value.includes('_here');
    });

    return { exists: true, valid: missing.length === 0, missing };
}

/**
 * Check MongoDB URI format
 */
function checkMongoURI(uri, expectedDb) {
    if (!uri) return { valid: false, message: 'URI is empty' };
    
    if (!uri.includes(expectedDb)) {
        return { 
            valid: false, 
            message: `URI should point to '${expectedDb}' database`
        };
    }

    return { valid: true, message: `Points to ${expectedDb} database` };
}

/**
 * Main verification function
 */
async function verify() {
    log.header();
    console.log(`${colors.bright}${colors.cyan}     STAGING ENVIRONMENT VERIFICATION${colors.reset}`);
    log.header();

    let hasErrors = false;
    let hasWarnings = false;

    // Check template files
    console.log(`\n${colors.bright}Checking template files...${colors.reset}`);
    checkFile(join(projectRoot, 'env.staging.template'), 'env.staging.template');
    checkFile(join(projectRoot, 'env.production.template'), 'env.production.template');

    // Check environment files
    console.log(`\n${colors.bright}Checking environment files...${colors.reset}`);
    
    const envPath = join(projectRoot, '.env');
    const envStagingPath = join(projectRoot, '.env.staging');
    const envProductionPath = join(projectRoot, '.env.production');

    const envExists = checkFile(envPath, '.env');
    const envStagingExists = checkFile(envStagingPath, '.env.staging');
    const envProductionExists = checkFile(envProductionPath, '.env.production');

    if (!envExists) {
        log.error('Create .env file from env.example');
        hasErrors = true;
    }

    if (!envStagingExists) {
        log.error('Create .env.staging file from env.staging.template');
        log.info('Run: cp env.staging.template .env.staging');
        hasErrors = true;
    }

    if (!envProductionExists) {
        log.warning('Create .env.production file from env.production.template');
        log.info('Run: cp env.production.template .env.production');
        hasWarnings = true;
    }

    // Verify .env file
    if (envExists) {
        console.log(`\n${colors.bright}Verifying .env file...${colors.reset}`);
        const envCheck = verifyEnvFile(envPath, '.env');
        
        if (envCheck.valid) {
            log.success('.env file is properly configured');
            
            // Check MongoDB URI
            const result = dotenv.config({ path: envPath });
            const mongoCheck = checkMongoURI(result.parsed.MONGODB_URI, 'gql-db');
            
            if (mongoCheck.valid) {
                log.success(mongoCheck.message);
            } else {
                log.warning(mongoCheck.message);
                hasWarnings = true;
            }
        } else if (envCheck.missing && envCheck.missing.length > 0) {
            log.warning('.env file has placeholder values');
            log.info(`Update these variables: ${envCheck.missing.join(', ')}`);
            hasWarnings = true;
        }
    }

    // Verify .env.staging file
    if (envStagingExists) {
        console.log(`\n${colors.bright}Verifying .env.staging file...${colors.reset}`);
        const envStagingCheck = verifyEnvFile(envStagingPath, '.env.staging');
        
        if (envStagingCheck.valid) {
            log.success('.env.staging file is properly configured');
            
            // Check MongoDB URI
            const result = dotenv.config({ path: envStagingPath });
            const mongoCheck = checkMongoURI(result.parsed.MONGODB_URI, 'staging-amoyan');
            
            if (mongoCheck.valid) {
                log.success(mongoCheck.message);
            } else {
                log.error(mongoCheck.message);
                hasErrors = true;
            }
        } else if (envStagingCheck.missing && envStagingCheck.missing.length > 0) {
            log.error('.env.staging file has placeholder values');
            log.info(`Update these variables: ${envStagingCheck.missing.join(', ')}`);
            hasErrors = true;
        }
    }

    // Check migration script
    console.log(`\n${colors.bright}Checking migration script...${colors.reset}`);
    const migrationScriptExists = checkFile(
        join(projectRoot, 'server/scripts/migrate-to-staging.js'),
        'migrate-to-staging.js'
    );

    if (!migrationScriptExists) {
        hasErrors = true;
    }

    // Summary
    log.header();
    console.log(`${colors.bright}${colors.cyan}                    VERIFICATION SUMMARY${colors.reset}`);
    log.header();

    console.log('');
    
    if (!hasErrors && !hasWarnings) {
        log.success('All checks passed! ✨');
        console.log('');
        log.info('You can now run the migration:');
        console.log(`  ${colors.cyan}npm run migrate:staging${colors.reset}`);
        console.log('');
        log.info('Or start the staging server:');
        console.log(`  ${colors.cyan}npm run dev:staging${colors.reset}`);
    } else if (!hasErrors && hasWarnings) {
        log.warning('Setup is mostly complete, but there are some warnings.');
        console.log('');
        log.info('You can proceed with migration, but review the warnings above.');
        console.log(`  ${colors.cyan}npm run migrate:staging${colors.reset}`);
    } else {
        log.error('Setup is incomplete. Please fix the errors above.');
        console.log('');
        log.info('Quick setup:');
        console.log(`  ${colors.cyan}cp env.staging.template .env.staging${colors.reset}`);
        console.log(`  ${colors.cyan}cp env.production.template .env.production${colors.reset}`);
        console.log('');
        log.info('Then edit the files to add your actual credentials.');
    }

    console.log('');
    
    process.exit(hasErrors ? 1 : 0);
}

// Run verification
verify().catch(error => {
    log.error('Verification failed');
    console.error(error);
    process.exit(1);
});


