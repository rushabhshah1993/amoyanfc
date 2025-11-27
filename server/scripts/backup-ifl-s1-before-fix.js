import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';

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
    
    console.log(`✅ Connected to: ${connection.connection.db.databaseName}`);
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Backup IFL S1 to JSON file
 */
async function backupIFLS1() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('BACKUP IFL S1 - BEFORE FIX');
    console.log('='.repeat(70));

    // Find IFL Meta
    const iflMeta = await CompetitionMeta.findOne({
      shortName: 'IFL'
    });

    if (!iflMeta) {
      console.log('❌ IFL Meta not found');
      return null;
    }

    console.log(`\n✅ Found IFL Meta: ${iflMeta._id}`);

    // Find IFL S1
    const iflS1 = await Competition.findOne({
      competitionMetaId: iflMeta._id,
      'seasonMeta.seasonNumber': 1
    }).lean(); // Use .lean() to get plain JavaScript object

    if (!iflS1) {
      console.log('❌ IFL S1 not found');
      return null;
    }

    console.log(`✅ Found IFL S1: ${iflS1._id}`);

    // Create backup directory if it doesn't exist
    const backupDir = resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}`);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `ifl-s1-before-fix-${timestamp}.json`;
    const filepath = resolve(backupDir, filename);

    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(iflS1, null, 2), 'utf8');

    console.log(`\n💾 Backup saved successfully!`);
    console.log(`   File: ${filename}`);
    console.log(`   Path: ${filepath}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

    // Display summary
    console.log('\n📊 Backed Up Data Summary:');
    console.log(`   Document ID: ${iflS1._id}`);
    console.log(`   Season Number: ${iflS1.seasonMeta.seasonNumber}`);
    console.log(`   Is Active: ${iflS1.isActive}`);
    console.log(`   Divisions: ${iflS1.leagueData?.divisions?.length || 0}`);
    
    if (iflS1.leagueData?.divisions) {
      let totalFights = 0;
      iflS1.leagueData.divisions.forEach(div => {
        const divFights = div.rounds?.reduce((sum, round) => 
          sum + (round.fights?.length || 0), 0
        ) || 0;
        totalFights += divFights;
        console.log(`      Division ${div.divisionNumber}: ${divFights} fights`);
      });
      console.log(`   Total Fights: ${totalFights}`);
    }

    console.log(`   seasonMeta.leagueDivisions: ${iflS1.seasonMeta.leagueDivisions?.length || 0} divisions`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ BACKUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n✓ You can now safely run the fix script.');
    console.log('✓ If anything goes wrong, restore from:');
    console.log(`  ${filepath}`);
    console.log('\n');

    return filepath;

  } catch (error) {
    console.error('\n❌ Error during backup:', error.message);
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
    const backupPath = await backupIFLS1();
    
    if (backupPath) {
      console.log('🎯 Next Step: Run the fix script');
      console.log('   node server/scripts/fix-ifl-s1-season-meta.js\n');
    }
    
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

