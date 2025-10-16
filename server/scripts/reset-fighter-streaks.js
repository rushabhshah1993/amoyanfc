import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Fighter } from '../models/fighter.model.js';

// Load environment variables
dotenv.config();

/**
 * Resets all fighter streaks
 */
async function resetAllFighterStreaks() {
    try {
        console.log('🚀 Resetting all fighter streaks...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');
        
        // Reset streaks for all fighters
        const result = await Fighter.updateMany(
            {},
            { $set: { streaks: [] } }
        );
        
        console.log(`✅ Reset streaks for ${result.modifiedCount} fighters`);
        
        // Verify reset
        const fightersWithStreaks = await Fighter.countDocuments({ 'streaks.0': { $exists: true } });
        console.log(`🔍 Fighters with streaks after reset: ${fightersWithStreaks}`);
        
    } catch (error) {
        console.error('❌ Error resetting fighter streaks:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run if executed directly
import { fileURLToPath } from 'url';
const scriptPath = process.argv[1];
const currentModulePath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === currentModulePath) {
    resetAllFighterStreaks()
        .then(() => {
            console.log('🎉 Reset completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Reset failed:', error);
            process.exit(1);
        });
}

export { resetAllFighterStreaks };
