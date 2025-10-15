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

// Season winners
const SEASON_WINNERS = {
    1: '676d7452eb38b2b97c6da981', // Season 1 winner
    2: '676d6ecceb38b2b97c6da945', // Season 2 winner
    3: '676d7613eb38b2b97c6da9a9'  // Season 3 winner
};

async function updateFightersTitles() {
    try {
        console.log('🚀 Starting fighters titles update...\n');

        // Connect to MongoDB
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Get all IFC competition seasons
        console.log('📊 Fetching IFC competition seasons...');
        const competitions = await Competition.find({
            competitionMetaId: new mongoose.Types.ObjectId(IFC_META_ID)
        }).select('_id seasonMeta.seasonNumber').sort({ 'seasonMeta.seasonNumber': 1 });

        if (competitions.length === 0) {
            console.log('❌ No IFC competitions found in database');
            process.exit(1);
        }

        console.log(`✅ Found ${competitions.length} IFC competition seasons\n`);

        // Create a map of season number to competition ObjectId
        const seasonCompetitionMap = {};
        competitions.forEach(comp => {
            const seasonNumber = comp.seasonMeta.seasonNumber;
            seasonCompetitionMap[seasonNumber] = comp._id;
            console.log(`   Season ${seasonNumber}: ${comp._id}`);
        });
        console.log('');

        // Process each season winner
        let updatedCount = 0;
        for (const [seasonNumber, fighterId] of Object.entries(SEASON_WINNERS)) {
            const seasonNum = parseInt(seasonNumber);
            const competitionSeasonId = seasonCompetitionMap[seasonNum];

            if (!competitionSeasonId) {
                console.log(`⚠️  Season ${seasonNum} competition not found in database, skipping...`);
                continue;
            }

            console.log(`\n🏆 Processing Season ${seasonNum} winner (Fighter ID: ${fighterId})...`);

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
                detail => detail.seasonNumber === seasonNum
            );

            if (titleExists) {
                console.log(`   ℹ️  Title for Season ${seasonNum} already exists, skipping...`);
                continue;
            }

            // Add the title
            compHistory.titles.details.push({
                competitionSeasonId: competitionSeasonId,
                seasonNumber: seasonNum,
                divisionNumber: 1
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

            console.log(`   ✅ Added title for Season ${seasonNum}`);
            console.log(`   📊 Total titles: ${compHistory.titles.totalTitles}`);
        }

        console.log(`\n✅ Update complete!`);
        console.log(`📊 Updated ${updatedCount} fighter(s) with title information\n`);

        // Verification
        console.log('🔍 Verifying updated fighters...\n');
        for (const [seasonNumber, fighterId] of Object.entries(SEASON_WINNERS)) {
            const fighter = await Fighter.findById(fighterId);
            if (fighter) {
                const compHistory = fighter.competitionHistory.find(
                    ch => ch.competitionId.toString() === IFC_META_ID
                );
                if (compHistory && compHistory.titles) {
                    console.log(`   ${fighter.firstName} ${fighter.lastName}:`);
                    console.log(`      Total Titles: ${compHistory.titles.totalTitles}`);
                    console.log(`      Titles: ${compHistory.titles.details.map(d => `Season ${d.seasonNumber}`).join(', ')}`);
                }
            }
        }

        console.log('\n✅ All done!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error updating fighters titles:', error);
        process.exit(1);
    }
}

// Run the update
updateFightersTitles();

