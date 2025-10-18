/**
 * Audit Database Indexes
 * This script checks all indexes on critical collections
 * and warns about dangerous configurations (TTL indexes, etc.)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log(`✅ Connected to MongoDB at ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Check indexes on a collection
 */
async function checkCollectionIndexes(db, collectionName, expectedIndexes) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COLLECTION: ${collectionName}`);
  console.log('='.repeat(70));

  try {
    const collection = db.collection(collectionName);
    const indexes = await collection.indexes();

    console.log(`\n📊 Found ${indexes.length} indexes:\n`);

    let hasDangerousIndexes = false;
    let hasUnexpectedIndexes = false;

    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}`);
      console.log(`   Keys: ${JSON.stringify(index.key)}`);
      
      if (index.unique) {
        console.log(`   ✅ Unique: true`);
      }
      
      if (index.expireAfterSeconds !== undefined) {
        console.log(`   🚨 TTL Index: Expires after ${index.expireAfterSeconds} seconds`);
        console.log(`   ⚠️  WARNING: This will auto-delete old documents!`);
        hasDangerousIndexes = true;
      }
      
      if (index.sparse) {
        console.log(`   ⚠️  Sparse: true (may skip some documents)`);
      }
      
      if (index.partialFilterExpression) {
        console.log(`   ⚠️  Partial Index: ${JSON.stringify(index.partialFilterExpression)}`);
      }
      
      console.log('');
    });

    // Check for expected indexes
    if (expectedIndexes) {
      console.log(`\n📋 Expected Indexes:`);
      expectedIndexes.forEach(exp => {
        const found = indexes.find(idx => idx.name === exp.name);
        if (found) {
          console.log(`   ✅ ${exp.name}`);
        } else {
          console.log(`   ❌ ${exp.name} - MISSING`);
          hasUnexpectedIndexes = true;
        }
      });
    }

    // Summary
    if (hasDangerousIndexes) {
      console.log(`\n🚨 DANGER: Found dangerous indexes!`);
      console.log(`   Action required: Review and drop TTL/partial indexes`);
      return false;
    } else if (hasUnexpectedIndexes) {
      console.log(`\n⚠️  WARNING: Index configuration doesn't match expected`);
      return false;
    } else {
      console.log(`\n✅ All indexes look good!`);
      return true;
    }

  } catch (error) {
    console.error(`\n❌ Error checking ${collectionName}:`, error.message);
    return false;
  }
}

/**
 * Main audit function
 */
async function auditDatabaseIndexes() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DATABASE INDEXES AUDIT');
  console.log('='.repeat(70));
  console.log('Checking all critical collections for dangerous index configurations...\n');

  try {
    // Connect to database
    await connectDB();
    const db = mongoose.connection.db;

    // Define expected indexes for each collection
    const expectedIndexes = {
      roundstandings: [
        { name: '_id_' },
        { name: 'competitionId_1_seasonNumber_1_roundNumber_1' },
        { name: 'fightIdentifier_1' },
        { name: 'standings.fighterId_1' }
      ],
      fighters: [
        { name: '_id_' }
        // Note: Fighters collection has additional indexes for performance
        // No specific expected indexes beyond _id
      ],
      competitions: [
        { name: '_id_' }
      ],
      competitionmetas: [
        { name: '_id_' }
      ]
    };

    // Check each collection
    const results = {
      roundstandings: await checkCollectionIndexes(db, 'roundstandings', expectedIndexes.roundstandings),
      fighters: await checkCollectionIndexes(db, 'fighters', expectedIndexes.fighters),
      competitions: await checkCollectionIndexes(db, 'competitions', expectedIndexes.competitions),
      competitionmetas: await checkCollectionIndexes(db, 'competitionmetas', expectedIndexes.competitionmetas)
    };

    // Overall summary
    console.log('\n' + '='.repeat(70));
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(70));

    const allGood = Object.values(results).every(r => r === true);

    Object.entries(results).forEach(([collection, status]) => {
      const icon = status ? '✅' : '⚠️';
      const statusText = status ? 'SAFE' : 'NEEDS REVIEW';
      console.log(`\n${icon} ${collection}: ${statusText}`);
    });

    if (allGood) {
      console.log('\n' + '='.repeat(70));
      console.log('✨ AUDIT PASSED - ALL INDEXES ARE SAFE! ✨');
      console.log('='.repeat(70));
      console.log('\n🛡️  No dangerous indexes found.');
      console.log('   Database is properly configured.\n');
    } else {
      console.log('\n' + '='.repeat(70));
      console.log('⚠️  AUDIT FOUND ISSUES - REVIEW REQUIRED');
      console.log('='.repeat(70));
      console.log('\n🚨 Some collections have dangerous or unexpected indexes.');
      console.log('   Review the output above and take corrective action.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the audit
auditDatabaseIndexes();

