#!/usr/bin/env node

/**
 * Script to clean up TEMP articles from the database
 * 
 * DATE: December 16, 2025
 * PURPOSE: Remove all TEMP and TEMP-THUMB articles
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
        console.log('🚀 TEMP Articles Cleanup Script');
        console.log('=' .repeat(60));
        
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log(`📊 Database: ${mongoose.connection.name}\n`);
        
        // Find all TEMP articles
        const tempArticles = await Articles.find({
            $or: [
                { title: { $regex: /^TEMP-\d+$/ } },
                { title: { $regex: /^TEMP-THUMB-\d+$/ } }
            ]
        }).lean();
        
        if (tempArticles.length === 0) {
            console.log('✅ No TEMP articles found - database is clean!');
        } else {
            console.log(`🗑️  Found ${tempArticles.length} TEMP article(s) to delete:\n`);
            
            tempArticles.forEach((article, index) => {
                console.log(`   ${index + 1}. ${article.title}`);
                console.log(`      ID: ${article._id}`);
                console.log(`      Created: ${new Date(article.createdAt).toLocaleString()}`);
            });
            
            // Create backup before deletion
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupsDir = join(__dirname, '../../backups');
            const backupPath = join(backupsDir, `temp-articles-backup-${timestamp}.json`);
            
            fs.writeFileSync(backupPath, JSON.stringify(tempArticles, null, 2));
            console.log(`\n📦 Backup created: ${backupPath}`);
            
            // Delete TEMP articles
            console.log('\n🗑️  Deleting TEMP articles...');
            
            const result = await Articles.deleteMany({
                $or: [
                    { title: { $regex: /^TEMP-\d+$/ } },
                    { title: { $regex: /^TEMP-THUMB-\d+$/ } }
                ]
            });
            
            console.log(`✅ Deleted ${result.deletedCount} TEMP article(s)`);
            
            // Show final state
            const remainingArticles = await Articles.find().lean();
            const realArticles = remainingArticles.filter(a => 
                !a.title.startsWith('TEMP-') && !a.title.startsWith('TEMP-THUMB-')
            );
            
            console.log(`\n📊 Final database state:`);
            console.log(`   Total articles: ${remainingArticles.length}`);
            console.log(`   Real articles: ${realArticles.length}`);
            console.log(`   TEMP articles: ${remainingArticles.length - realArticles.length}`);
            
            if (realArticles.length > 0) {
                console.log(`\n📰 Your articles:`);
                realArticles.forEach((article, index) => {
                    console.log(`   ${index + 1}. ${article.title}`);
                    console.log(`      Published: ${new Date(article.publishedDate).toLocaleString()}`);
                });
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Cleanup completed successfully');
        console.log('='.repeat(60));
        
        await mongoose.connection.close();
        console.log('\n👋 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('\n❌ Cleanup failed:', error);
        process.exit(1);
    }
}

main();

