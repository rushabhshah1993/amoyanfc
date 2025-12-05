import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { Articles } from '../models/articles.model.js';

/**
 * Connect to Production MongoDB (gql-db)
 */
async function connectDB() {
  try {
    const baseUri = process.env.MONGODB_URI || '';
    const productionUri = baseUri.replace(/\/[^/?]+\?/, '/gql-db?');
    
    const connection = await mongoose.connect(productionUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(`✅ Connected to: ${connection.connection.db.databaseName}\n`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Delete TEMP-THUMB articles
 */
async function deleteTempThumbArticles() {
  try {
    console.log('='.repeat(70));
    console.log('DELETE TEMP-THUMB ARTICLES');
    console.log('='.repeat(70));

    // Find all TEMP-THUMB articles
    const tempArticles = await Articles.find({
      title: { $regex: /^TEMP-THUMB-/i }
    });

    console.log(`\n📊 Found ${tempArticles.length} TEMP-THUMB articles`);

    if (tempArticles.length === 0) {
      console.log('\n✅ No TEMP-THUMB articles to delete!');
      return;
    }

    // Display the articles
    console.log('\n📋 Articles to be deleted:\n');
    tempArticles.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title}`);
      console.log(`      ID: ${article._id}`);
      console.log(`      Author: ${article.author}`);
      console.log(`      Published: ${article.publishedDate}`);
      console.log('');
    });

    // Delete them
    console.log('🗑️  Deleting...\n');
    
    const result = await Articles.deleteMany({
      title: { $regex: /^TEMP-THUMB-/i }
    });

    console.log('='.repeat(70));
    console.log('DELETION SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Successfully deleted ${result.deletedCount} TEMP-THUMB articles`);
    console.log(`\n🎉 Articles list is now clean!`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error during deletion:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await connectDB();
    await deleteTempThumbArticles();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

main();

