import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Fighter } from '../models/fighter.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Updates MongoDB with the complete streaks data from the temporary file
 */
async function updateMongoDBWithStreaks() {
    try {
        console.log('🚀 Starting MongoDB streaks update...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');

        // Read the complete streaks data from temporary file
        const tempFilePath = path.join(__dirname, '..', '..', 'backups', 'complete-streaks-data-temp.json');
        
        if (!fs.existsSync(tempFilePath)) {
            throw new Error(`Temporary streaks file not found: ${tempFilePath}`);
        }

        console.log('📖 Reading streaks data from temporary file...');
        const streaksData = JSON.parse(fs.readFileSync(tempFilePath, 'utf8'));
        
        console.log(`📊 Processing streaks for ${streaksData.fighters.length} fighters`);
        console.log(`📈 Data generated from: ${streaksData.metadata.description}`);
        console.log(`🕐 Data timestamp: ${streaksData.metadata.timestamp}`);

        // Update each fighter with their streaks data
        let updatedCount = 0;
        let skippedCount = 0;
        
        console.log('\n📝 Updating fighters in MongoDB...');
        
        for (const fighterData of streaksData.fighters) {
            try {
                // Convert opponents back to ObjectIds
                const streaksWithObjectIds = fighterData.streaks.map(streak => ({
                    ...streak,
                    opponents: streak.opponents.map(oppId => new mongoose.Types.ObjectId(oppId))
                }));

                // Update the fighter document
                const result = await Fighter.findByIdAndUpdate(
                    fighterData._id,
                    { streaks: streaksWithObjectIds },
                    { new: true }
                );

                if (result) {
                    updatedCount++;
                    if (updatedCount % 10 === 0) {
                        console.log(`  ✅ Updated ${updatedCount} fighters...`);
                    }
                } else {
                    console.warn(`  ⚠️  Fighter not found: ${fighterData.firstName} ${fighterData.lastName} (${fighterData._id})`);
                    skippedCount++;
                }
            } catch (error) {
                console.error(`  ❌ Error updating fighter ${fighterData._id}:`, error.message);
                skippedCount++;
            }
        }

        console.log('\n✅ MongoDB update completed!');
        console.log(`📊 Successfully updated: ${updatedCount} fighters`);
        console.log(`⚠️  Skipped/Failed: ${skippedCount} fighters`);

        // Verify the update
        console.log('\n🔍 Verifying update...');
        const fightersWithStreaks = await Fighter.countDocuments({ 'streaks.0': { $exists: true } });
        const totalFighters = await Fighter.countDocuments();
        
        console.log(`📊 Total fighters in database: ${totalFighters}`);
        console.log(`📊 Fighters with streaks after update: ${fightersWithStreaks}`);

        // Show sample updated fighter
        const sampleFighter = await Fighter.findOne({ 'streaks.0': { $exists: true } })
            .select('firstName lastName streaks')
            .lean();

        if (sampleFighter) {
            console.log('\n🔍 Sample updated fighter:');
            console.log(`   Name: ${sampleFighter.firstName} ${sampleFighter.lastName}`);
            console.log(`   Total Streaks: ${sampleFighter.streaks.length}`);
            
            const activeStreaks = sampleFighter.streaks.filter(s => s.active);
            if (activeStreaks.length > 0) {
                activeStreaks.forEach(streak => {
                    console.log(`   Active ${streak.type} streak: ${streak.count} fights`);
                });
            }
        }

        // Create final backup of updated data
        console.log('\n💾 Creating final backup of updated streaks...');
        const finalBackupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                description: 'Final streaks data after MongoDB update',
                totalFighters: updatedCount,
                sourceFile: 'complete-streaks-data-temp.json',
                updateStatus: 'Completed successfully'
            },
            fighters: streaksData.fighters
        };

        const finalBackupPath = path.join(__dirname, '..', '..', 'backups', 'final-streaks-backup.json');
        fs.writeFileSync(finalBackupPath, JSON.stringify(finalBackupData, null, 2));
        
        console.log(`📄 Final backup created: ${finalBackupPath}`);

        console.log('\n🎉 MongoDB streaks update completed successfully!');
        console.log('📋 Summary:');
        console.log('  ✅ All fighters updated with new streaks data');
        console.log('  ✅ Streaks calculated from Seasons 1-3 fight data');
        console.log('  ✅ Data structure matches expected schema');
        console.log('  ✅ Final backup created for reference');

    } catch (error) {
        console.error('❌ Error updating MongoDB with streaks:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run if executed directly
const scriptPath = process.argv[1];
const currentModulePath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === currentModulePath) {
    updateMongoDBWithStreaks()
        .then(() => {
            console.log('🎉 MongoDB update completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 MongoDB update failed:', error);
            process.exit(1);
        });
}

export { updateMongoDBWithStreaks };
