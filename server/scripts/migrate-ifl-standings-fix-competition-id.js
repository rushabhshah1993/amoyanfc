#!/usr/bin/env node

/**
 * Migration Script: Fix IFL Standings CompetitionId
 * 
 * Problem: IFL S1 standings were created with Competition._id instead of CompetitionMeta._id
 * This script migrates them to use the correct CompetitionMeta._id
 * 
 * Usage:
 *   NODE_ENV=staging node scripts/migrate-ifl-standings-fix-competition-id.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env' });

const CompetitionMetaSchema = new mongoose.Schema({
  competitionName: String,
  shortName: String,
  type: String
});

const CompetitionSchema = new mongoose.Schema({}, { strict: false });
const RoundStandingsSchema = new mongoose.Schema({}, { strict: false });

const CompetitionMeta = mongoose.model('CompetitionMeta', CompetitionMetaSchema);
const Competition = mongoose.model('Competition', CompetitionSchema);
const RoundStandings = mongoose.model('RoundStandings', RoundStandingsSchema);

async function migrateIFLStandings() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     IFL STANDINGS MIGRATION - FIX COMPETITION ID               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get IFL CompetitionMeta
    const iflMeta = await CompetitionMeta.findOne({ shortName: 'IFL' });
    if (!iflMeta) {
      console.log('❌ IFL CompetitionMeta not found');
      process.exit(1);
    }

    console.log('📋 IFL CompetitionMeta:');
    console.log('   - ID:', iflMeta._id.toString());
    console.log('   - Name:', iflMeta.competitionName);

    // Get IFL S1 Competition
    const iflS1 = await Competition.findOne({
      competitionMetaId: iflMeta._id,
      'seasonMeta.seasonNumber': 1
    });

    if (!iflS1) {
      console.log('\n❌ IFL S1 Competition not found');
      process.exit(1);
    }

    console.log('\n📅 IFL S1 Competition:');
    console.log('   - ID:', iflS1._id.toString());
    console.log('   - Season Number:', iflS1.seasonMeta.seasonNumber);

    // Find all standings with wrong competitionId (Competition._id)
    console.log('\n🔍 Searching for standings with wrong competitionId...');
    const wrongStandings = await RoundStandings.find({
      competitionId: iflS1._id,  // Wrong: using Competition._id
      seasonNumber: 1
    });

    console.log(`   Found ${wrongStandings.length} standings documents with wrong ID\n`);

    if (wrongStandings.length === 0) {
      console.log('✅ No migration needed - all standings already use correct ID');
      await mongoose.disconnect();
      return;
    }

    // Display what will be migrated
    console.log('📊 Documents to migrate:');
    wrongStandings.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.fightIdentifier} (Division ${s.divisionNumber}, Round ${s.roundNumber})`);
    });

    console.log('\n⚠️  Migration Plan:');
    console.log(`   - Change competitionId from: ${iflS1._id.toString()}`);
    console.log(`   - Change competitionId to:   ${iflMeta._id.toString()}`);
    console.log(`   - Total documents to update: ${wrongStandings.length}`);

    // Ask for confirmation if not in auto mode
    if (process.argv.includes('--dry-run')) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      await mongoose.disconnect();
      return;
    }

    console.log('\n🚀 Starting migration...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const standing of wrongStandings) {
      try {
        // Update the competitionId
        const result = await RoundStandings.findByIdAndUpdate(
          standing._id,
          {
            $set: {
              competitionId: iflMeta._id
            }
          },
          { new: true }
        );

        if (result) {
          console.log(`   ✅ Migrated: ${standing.fightIdentifier}`);
          successCount++;
        } else {
          console.log(`   ⚠️  Warning: Document not found: ${standing.fightIdentifier}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating ${standing.fightIdentifier}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total processed: ${wrongStandings.length}`);

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyCorrect = await RoundStandings.countDocuments({
      competitionId: iflMeta._id,
      seasonNumber: 1
    });

    const verifyWrong = await RoundStandings.countDocuments({
      competitionId: iflS1._id,
      seasonNumber: 1
    });

    console.log(`   - Standings with correct ID (CompetitionMeta): ${verifyCorrect}`);
    console.log(`   - Standings with wrong ID (Competition): ${verifyWrong}`);

    if (verifyWrong === 0 && verifyCorrect === wrongStandings.length) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration may have issues - please review');
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');

  } catch (error) {
    console.error('\n❌ Migration error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Show usage if --help flag is present
if (process.argv.includes('--help')) {
  console.log('\nUsage:');
  console.log('  node scripts/migrate-ifl-standings-fix-competition-id.js [options]');
  console.log('\nOptions:');
  console.log('  --dry-run    Show what would be migrated without making changes');
  console.log('  --help       Show this help message');
  console.log('\nExamples:');
  console.log('  NODE_ENV=staging node scripts/migrate-ifl-standings-fix-competition-id.js --dry-run');
  console.log('  NODE_ENV=staging node scripts/migrate-ifl-standings-fix-competition-id.js');
  process.exit(0);
}

// Run the migration
migrateIFLStandings();

