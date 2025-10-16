import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { connectDB } from '../db/connectDB.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try loading from server/.env first, then from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const IFC_META_ID = '67780dcc09a4c4b25127f8f6';

// Season 4 division champions
const SEASON_4_CHAMPIONS = {
    1: '676d7613eb38b2b97c6da9a9', // Division 1: F034 (Unnati)
    2: '676d7554eb38b2b97c6da999', // Division 2: F029 (Sachi)
    3: '676d7663eb38b2b97c6da9af'  // Division 3: F037 (Vinaya)
};

async function updateSeason4Champions() {
    try {
        console.log('🚀 Starting Season 4 division champions update...\n');

        // Connect to MongoDB
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Get Season 4 competition
        console.log('📊 Fetching Season 4 competition...');
        const season4Competition = await Competition.findOne({
            competitionMetaId: new mongoose.Types.ObjectId(IFC_META_ID),
            'seasonMeta.seasonNumber': 4
        });

        if (!season4Competition) {
            console.log('❌ Season 4 competition not found in database');
            process.exit(1);
        }

        console.log(`✅ Found Season 4 competition: ${season4Competition._id}\n`);

        // Process each division champion
        let updatedCount = 0;
        for (const [divisionNumber, fighterId] of Object.entries(SEASON_4_CHAMPIONS)) {
            const divNum = parseInt(divisionNumber);

            console.log(`🏆 Processing Division ${divNum} champion (Fighter ID: ${fighterId})...`);

            // Find the fighter
            const fighter = await Fighter.findById(fighterId);
            if (!fighter) {
                console.log(`   ❌ Fighter not found: ${fighterId}`);
                continue;
            }

            console.log(`   ✅ Found fighter: ${fighter.firstName} ${fighter.lastName}`);

            // Find or create competitionHistory entry for IFC
            let compHistoryIndex = fighter.competitionHistory.findIndex(
                ch => ch.competitionId.toString() === IFC_META_ID
            );

            if (compHistoryIndex === -1) {
                console.log(`   ⚠️  No competition history found for IFC, creating new entry...`);
                fighter.competitionHistory.push({
                    competitionId: new mongoose.Types.ObjectId(IFC_META_ID),
                    numberOfSeasonAppearances: 0,
                    totalFights: 0,
                    totalWins: 0,
                    totalLosses: 0,
                    winPercentage: 0,
                    titles: {
                        totalTitles: 0,
                        details: []
                    }
                });
                compHistoryIndex = fighter.competitionHistory.length - 1;
            }

            const compHistory = fighter.competitionHistory[compHistoryIndex];

            // Initialize titles if not present
            if (!compHistory.titles) {
                compHistory.titles = {
                    totalTitles: 0,
                    details: []
                };
            }

            // Check if this title already exists
            const titleExists = compHistory.titles.details.some(
                detail => detail.seasonNumber === 4 && detail.divisionNumber === divNum
            );

            if (titleExists) {
                console.log(`   ℹ️  Title for Season 4, Division ${divNum} already exists, skipping...`);
                continue;
            }

            // Add the title
            compHistory.titles.details.push({
                competitionSeasonId: season4Competition._id,
                seasonNumber: 4,
                divisionNumber: divNum
            });
            compHistory.titles.totalTitles = compHistory.titles.details.length;

            // Convert to plain object to ensure Mongoose tracks changes
            const plainCompHistory = fighter.competitionHistory.map(ch => {
                const titles = ch.titles || { totalTitles: 0, details: [] };
                return {
                    competitionId: ch.competitionId,
                    numberOfSeasonAppearances: ch.numberOfSeasonAppearances || 0,
                    totalFights: ch.totalFights || 0,
                    totalWins: ch.totalWins || 0,
                    totalLosses: ch.totalLosses || 0,
                    winPercentage: ch.winPercentage || 0,
                    titles: {
                        totalTitles: titles.totalTitles || 0,
                        details: (titles.details || []).map(d => ({
                            competitionSeasonId: d.competitionSeasonId,
                            seasonNumber: d.seasonNumber,
                            divisionNumber: d.divisionNumber
                        }))
                    }
                };
            });

            fighter.competitionHistory = plainCompHistory;

            // Save the fighter
            await fighter.save();
            updatedCount++;

            console.log(`   ✅ Added title for Season 4, Division ${divNum}`);
            console.log(`   📊 Total titles: ${compHistory.titles.totalTitles}`);
        }

        console.log(`\n✅ Update complete!`);
        console.log(`📊 Updated ${updatedCount} fighter(s) with Season 4 division titles\n`);

        // Verification
        console.log('🔍 Verifying updated champions...\n');
        for (const [divisionNumber, fighterId] of Object.entries(SEASON_4_CHAMPIONS)) {
            const divNum = parseInt(divisionNumber);
            const fighter = await Fighter.findById(fighterId);
            if (fighter) {
                const compHistory = fighter.competitionHistory.find(
                    ch => ch.competitionId.toString() === IFC_META_ID
                );
                if (compHistory && compHistory.titles) {
                    console.log(`   ${fighter.firstName} ${fighter.lastName} (Division ${divNum}):`);
                    console.log(`      Total Titles: ${compHistory.titles.totalTitles}`);
                    const season4Titles = compHistory.titles.details.filter(d => d.seasonNumber === 4);
                    console.log(`      Season 4 Titles: ${season4Titles.map(d => `Division ${d.divisionNumber}`).join(', ')}`);
                }
            }
        }

        console.log('\n✅ All Season 4 division champions updated successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error updating Season 4 champions:', error);
        process.exit(1);
    }
}

// Run the update
updateSeason4Champions();
