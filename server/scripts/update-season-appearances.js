import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';
import { connectDB } from '../db/connectDB.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const IFC_META_ID = '67780dcc09a4c4b25127f8f6';

/**
 * Update numberOfSeasonAppearances for all fighters based on their actual fight history
 */
async function updateSeasonAppearances() {
    try {
        console.log('🚀 Starting numberOfSeasonAppearances update...\n');

        // Connect to MongoDB
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Get all fighters
        console.log('📊 Fetching all fighters...');
        const allFighters = await Fighter.find({}).select('firstName lastName competitionHistory opponentsHistory');
        console.log(`✅ Found ${allFighters.length} fighters\n`);

        // Get all IFC competitions to map season numbers
        console.log('📊 Fetching IFC competitions...');
        const competitions = await Competition.find({
            competitionMetaId: new mongoose.Types.ObjectId(IFC_META_ID)
        }).select('_id seasonMeta.seasonNumber').sort({ 'seasonMeta.seasonNumber': 1 });

        console.log(`✅ Found ${competitions.length} IFC competitions:`);
        competitions.forEach(comp => {
            console.log(`   Season ${comp.seasonMeta.seasonNumber}: ${comp._id}`);
        });
        console.log('');

        // Create a map of competition ID to season number
        const competitionSeasonMap = {};
        competitions.forEach(comp => {
            competitionSeasonMap[comp._id.toString()] = comp.seasonMeta.seasonNumber;
        });

        let updatedCount = 0;
        let processedCount = 0;

        // Process each fighter
        for (const fighter of allFighters) {
            processedCount++;
            console.log(`📊 Processing ${fighter.firstName} ${fighter.lastName} (${processedCount}/${allFighters.length})...`);

            let needsUpdate = false;

            // Process each competition history entry
            for (const compHistory of fighter.competitionHistory) {
                if (compHistory.competitionId.toString() === IFC_META_ID) {
                    // Calculate actual season appearances from opponent history
                    const seasonAppearances = new Set();
                    
                    // Go through opponent history to find unique seasons
                    if (fighter.opponentsHistory && Array.isArray(fighter.opponentsHistory)) {
                        for (const opponentHistory of fighter.opponentsHistory) {
                            if (opponentHistory.details && Array.isArray(opponentHistory.details)) {
                                for (const detail of opponentHistory.details) {
                                    if (detail.competitionId.toString() === IFC_META_ID) {
                                        seasonAppearances.add(detail.season);
                                    }
                                }
                            }
                        }
                    }

                    const actualSeasonCount = seasonAppearances.size;
                    const currentSeasonCount = compHistory.numberOfSeasonAppearances || 0;

                    if (actualSeasonCount !== currentSeasonCount) {
                        console.log(`   🔄 Updating season appearances: ${currentSeasonCount} → ${actualSeasonCount}`);
                        console.log(`   📅 Seasons: ${Array.from(seasonAppearances).sort().join(', ')}`);
                        
                        compHistory.numberOfSeasonAppearances = actualSeasonCount;
                        needsUpdate = true;
                    } else {
                        console.log(`   ✅ Season appearances already correct: ${actualSeasonCount}`);
                    }
                }
            }

            if (needsUpdate) {
                // Convert to plain object to ensure Mongoose tracks changes
                const plainCompetitionHistory = fighter.competitionHistory.map(ch => ({
                    competitionId: ch.competitionId,
                    numberOfSeasonAppearances: ch.numberOfSeasonAppearances || 0,
                    totalFights: ch.totalFights || 0,
                    totalWins: ch.totalWins || 0,
                    totalLosses: ch.totalLosses || 0,
                    winPercentage: ch.winPercentage || 0,
                    titles: ch.titles || { totalTitles: 0, details: [] }
                }));

                fighter.competitionHistory = plainCompetitionHistory;
                await fighter.save();
                updatedCount++;
                console.log(`   ✅ Updated and saved`);
            }

            console.log('');
        }

        console.log('='.repeat(70));
        console.log('SUMMARY');
        console.log('='.repeat(70));
        console.log(`📊 Processed: ${processedCount} fighters`);
        console.log(`✅ Updated: ${updatedCount} fighters`);
        console.log(`📈 Success rate: ${((updatedCount / processedCount) * 100).toFixed(1)}%`);

        // Verification - show some examples
        console.log('\n🔍 Verification - Sample fighters:');
        const sampleFighters = await Fighter.find({})
            .select('firstName lastName competitionHistory')
            .limit(5);

        for (const fighter of sampleFighters) {
            const ifcHistory = fighter.competitionHistory.find(
                ch => ch.competitionId.toString() === IFC_META_ID
            );
            if (ifcHistory) {
                console.log(`   ${fighter.firstName} ${fighter.lastName}: ${ifcHistory.numberOfSeasonAppearances} seasons`);
            }
        }

        console.log('\n✅ numberOfSeasonAppearances update completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error updating season appearances:', error);
        process.exit(1);
    }
}

// Run the update
updateSeasonAppearances();
