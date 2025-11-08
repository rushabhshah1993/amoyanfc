/**
 * Migration Script: Fix currentRound for Divisions
 * 
 * This script updates the currentRound field for all divisions based on
 * the highest round number that has at least one completed fight.
 * 
 * Run: node server/scripts/fix-current-round.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.staging
dotenv.config({ path: path.resolve(__dirname, '../../.env.staging') });

// Import models
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { Competition } from '../models/competition.model.js';

async function fixCurrentRound() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all league competitions
        const competitions = await Competition.find({ 
            'leagueData.divisions': { $exists: true }
        });

        console.log(`📊 Found ${competitions.length} league competition(s)\n`);

        let totalUpdated = 0;

        for (const competition of competitions) {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`Competition: ${competition._id}`);
            console.log(`Season: ${competition.seasonMeta.seasonNumber}`);
            console.log(`Active: ${competition.isActive}`);
            console.log(`${'='.repeat(70)}`);

            if (!competition.leagueData || !competition.leagueData.divisions) {
                console.log('  ⏭️  No league divisions found, skipping...');
                continue;
            }

            let competitionUpdated = false;

            for (const division of competition.leagueData.divisions) {
                console.log(`\n  Division ${division.divisionNumber}:`);
                console.log(`    Current Round (before): ${division.currentRound || 0}`);

                // Find the highest round number with at least one completed fight
                let highestCompletedRound = 0;

                for (const round of division.rounds || []) {
                    const hasCompletedFight = round.fights.some(
                        fight => fight.fightStatus === 'completed' || fight.winner
                    );

                    if (hasCompletedFight && round.roundNumber > highestCompletedRound) {
                        highestCompletedRound = round.roundNumber;
                    }
                }

                console.log(`    Highest completed round: ${highestCompletedRound}`);

                // Update if different
                if (division.currentRound !== highestCompletedRound) {
                    division.currentRound = highestCompletedRound;
                    competitionUpdated = true;
                    totalUpdated++;
                    console.log(`    ✅ Updated: ${division.currentRound || 0} → ${highestCompletedRound}`);
                } else {
                    console.log(`    ℹ️  No change needed`);
                }
            }

            // Save the competition if updated
            if (competitionUpdated) {
                await competition.save();
                console.log(`\n  💾 Competition saved`);
            }
        }

        console.log(`\n${'='.repeat(70)}`);
        console.log(`✅ Migration complete!`);
        console.log(`📊 Total divisions updated: ${totalUpdated}`);
        console.log(`${'='.repeat(70)}\n`);

    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
fixCurrentRound()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

