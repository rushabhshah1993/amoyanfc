/**
 * Update Fighters' Location Countries to Abbreviations
 * 
 * This script updates fighter location countries:
 * - "United States of America" → "USA"
 * - "United Arab Emirates" → "UAE"
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Import models
import { Fighter } from '../models/fighter.model.js';

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
 * Main function to update fighter location countries
 */
async function updateFighterLocationCountries() {
  console.log('\n' + '='.repeat(70));
  console.log('UPDATE FIGHTER LOCATION COUNTRIES TO ABBREVIATIONS');
  console.log('='.repeat(70));

  try {
    await connectDB();

    // Step 1: Check fighters with "United States of America"
    console.log('\n📊 Checking fighters with "United States of America"...');
    const usaFighters = await Fighter.find({
      'location.country': 'United States of America'
    });
    console.log(`Found ${usaFighters.length} fighters with "United States of America"`);

    if (usaFighters.length > 0) {
      console.log('Sample fighters:');
      usaFighters.slice(0, 5).forEach(f => {
        console.log(`  - ${f.firstName} ${f.lastName} (${f.location.city}, ${f.location.country})`);
      });
    }

    // Step 2: Check fighters with "United Arab Emirates"
    console.log('\n📊 Checking fighters with "United Arab Emirates"...');
    const uaeFighters = await Fighter.find({
      'location.country': 'United Arab Emirates'
    });
    console.log(`Found ${uaeFighters.length} fighters with "United Arab Emirates"`);

    if (uaeFighters.length > 0) {
      console.log('Sample fighters:');
      uaeFighters.slice(0, 5).forEach(f => {
        console.log(`  - ${f.firstName} ${f.lastName} (${f.location.city}, ${f.location.country})`);
      });
    }

    // Step 3: Update "United States of America" to "USA"
    if (usaFighters.length > 0) {
      console.log('\n🔄 Updating "United States of America" to "USA"...');
      const usaResult = await Fighter.updateMany(
        { 'location.country': 'United States of America' },
        { $set: { 'location.country': 'USA' } }
      );
      console.log(`✅ Updated ${usaResult.modifiedCount} fighters to USA`);
    }

    // Step 4: Update "United Arab Emirates" to "UAE"
    if (uaeFighters.length > 0) {
      console.log('\n🔄 Updating "United Arab Emirates" to "UAE"...');
      const uaeResult = await Fighter.updateMany(
        { 'location.country': 'United Arab Emirates' },
        { $set: { 'location.country': 'UAE' } }
      );
      console.log(`✅ Updated ${uaeResult.modifiedCount} fighters to UAE`);
    }

    // Step 5: Verification
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION');
    console.log('='.repeat(70));

    const verifyUSA = await Fighter.find({ 'location.country': 'USA' });
    const verifyUAE = await Fighter.find({ 'location.country': 'UAE' });
    const verifyOldUSA = await Fighter.find({ 'location.country': 'United States of America' });
    const verifyOldUAE = await Fighter.find({ 'location.country': 'United Arab Emirates' });

    console.log(`\n✅ Fighters with "USA": ${verifyUSA.length}`);
    console.log(`✅ Fighters with "UAE": ${verifyUAE.length}`);
    console.log(`✅ Fighters with "United States of America": ${verifyOldUSA.length} (should be 0)`);
    console.log(`✅ Fighters with "United Arab Emirates": ${verifyOldUAE.length} (should be 0)`);

    // Show sample updated data
    if (verifyUSA.length > 0) {
      console.log('\n📋 Sample USA fighters after update:');
      verifyUSA.slice(0, 3).forEach(f => {
        console.log(`  - ${f.firstName} ${f.lastName} (${f.location.city}, ${f.location.country})`);
      });
    }

    if (verifyUAE.length > 0) {
      console.log('\n📋 Sample UAE fighters after update:');
      verifyUAE.slice(0, 3).forEach(f => {
        console.log(`  - ${f.firstName} ${f.lastName} (${f.location.city}, ${f.location.country})`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ UPDATE COMPLETE! ✨');
    console.log('='.repeat(70));
    console.log('\nAll fighter location countries have been updated to abbreviations.');
    console.log('  - "United States of America" → "USA"');
    console.log('  - "United Arab Emirates" → "UAE"\n');

  } catch (error) {
    console.error('\n❌ Update failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the update
updateFighterLocationCountries();

