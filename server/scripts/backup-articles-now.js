#!/usr/bin/env node

/**
 * Emergency backup of all current articles
 * 
 * DATE: December 16, 2025
 * PURPOSE: Backup before any recovery operations
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Articles } from '../models/articles.model.js';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

async function main() {
    try {
        console.log('🚀 Emergency Article Backup Script');
        console.log('=' .repeat(60));
        
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log(`📊 Database: ${mongoose.connection.name}\n`);
        
        // Fetch ALL articles
        const articles = await Articles.find().lean();
        
        console.log(`📰 Found ${articles.length} articles in database`);
        
        // Create backup file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupsDir = join(__dirname, '../../backups');
        
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
        
        const backupPath = join(backupsDir, `articles-emergency-backup-${timestamp}.json`);
        
        // Write backup
        fs.writeFileSync(backupPath, JSON.stringify(articles, null, 2));
        
        const fileSize = (fs.statSync(backupPath).size / 1024).toFixed(2);
        
        console.log(`\n✅ Backup created successfully!`);
        console.log(`   File: ${backupPath}`);
        console.log(`   Size: ${fileSize} KB`);
        console.log(`   Articles: ${articles.length}`);
        
        // Show summary
        const realArticles = articles.filter(a => 
            !a.title.startsWith('TEMP-') && !a.title.startsWith('TEMP-THUMB-')
        );
        const tempArticles = articles.filter(a => 
            a.title.startsWith('TEMP-') || a.title.startsWith('TEMP-THUMB-')
        );
        
        console.log(`\n📊 Breakdown:`);
        console.log(`   Real Articles: ${realArticles.length}`);
        console.log(`   TEMP Articles: ${tempArticles.length}`);
        
        if (realArticles.length > 0) {
            console.log(`\n📰 Real Articles:`);
            realArticles.forEach((article, index) => {
                console.log(`   ${index + 1}. ${article.title}`);
                console.log(`      ID: ${article._id}`);
                console.log(`      Published: ${new Date(article.publishedDate).toLocaleString()}`);
            });
        }
        
        if (tempArticles.length > 0) {
            console.log(`\n🗑️  TEMP Articles (to be cleaned):`);
            tempArticles.forEach((article, index) => {
                console.log(`   ${index + 1}. ${article.title} (${article._id})`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Backup complete - safe to proceed with operations');
        console.log('='.repeat(60));
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('\n❌ Backup failed:', error);
        process.exit(1);
    }
}

main();

