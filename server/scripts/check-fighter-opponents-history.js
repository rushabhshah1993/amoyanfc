/**
 * Diagnostic Script: Check Fighter's Opponents History
 * 
 * This script checks a specific fighter's opponentsHistory to verify
 * that fights are being recorded correctly.
 * 
 * Run: node server/scripts/check-fighter-opponents-history.js
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
import { Fighter } from '../models/fighter.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';

async function checkFighterOpponentsHistory() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Search for fighter by name (adjust as needed)
        const fighterName = 'Aishwarya'; // Change this to the fighter you want to check
        
        const fighter = await Fighter.findOne({
            firstName: { $regex: new RegExp(fighterName, 'i') }
        });

        if (!fighter) {
            console.log(`❌ Fighter "${fighterName}" not found`);
            return;
        }

        console.log(`${'='.repeat(70)}`);
        console.log(`Fighter: ${fighter.firstName} ${fighter.lastName}`);
        console.log(`ID: ${fighter._id}`);
        console.log(`${'='.repeat(70)}\n`);

        // Check opponents history
        console.log(`📊 Opponents History: ${fighter.opponentsHistory?.length || 0} opponent(s)\n`);

        if (fighter.opponentsHistory && fighter.opponentsHistory.length > 0) {
            // Group fights by competition
            const fightsByCompetition = {};

            for (const opponent of fighter.opponentsHistory) {
                for (const detail of opponent.details) {
                    const compId = detail.competitionId.toString();
                    if (!fightsByCompetition[compId]) {
                        fightsByCompetition[compId] = [];
                    }
                    fightsByCompetition[compId].push({
                        ...detail,
                        opponentId: opponent.opponentId
                    });
                }
            }

            // Load competition names
            const competitionIds = Object.keys(fightsByCompetition);
            const competitions = await CompetitionMeta.find({
                _id: { $in: competitionIds }
            });

            const competitionMap = {};
            competitions.forEach(comp => {
                competitionMap[comp._id.toString()] = comp.competitionName;
            });

            // Display fights grouped by competition
            for (const [compId, fights] of Object.entries(fightsByCompetition)) {
                const compName = competitionMap[compId] || 'Unknown Competition';
                console.log(`\n📋 ${compName} (${compId.substring(0, 8)}...)`);
                console.log(`   Total fights: ${fights.length}`);
                
                // Sort by season, division, round
                fights.sort((a, b) => {
                    if (a.season !== b.season) return a.season - b.season;
                    if (a.division !== b.division) return a.division - b.division;
                    return a.round - b.round;
                });

                // Show last 5 fights
                const recentFights = fights.slice(-5);
                console.log(`   Recent fights (last ${recentFights.length}):`);
                recentFights.forEach((fight, idx) => {
                    const season = fight.season !== undefined ? fight.season : '?';
                    const division = fight.division !== undefined ? fight.division : '?';
                    const round = fight.round !== undefined ? fight.round : '?';
                    const fightIdStr = fight.fightId ? fight.fightId.toString().substring(0, 12) : 'N/A';
                    console.log(`      ${idx + 1}. S${season} D${division} R${round} - ${fight.isWinner ? '✅ WIN' : '❌ LOSS'}`);
                    console.log(`         FightID: ${fightIdStr}...`);
                });
            }

            // Show all fights chronologically (last 10)
            const allFights = fighter.opponentsHistory.flatMap(opponent =>
                opponent.details.map(detail => ({
                    ...detail,
                    opponentId: opponent.opponentId
                }))
            );

            allFights.sort((a, b) => {
                if (a.season !== b.season) return a.season - b.season;
                if (a.division !== b.division) return a.division - b.division;
                return a.round - b.round;
            });

            const last10Fights = allFights.slice(-10);
            console.log(`\n\n📅 Last 10 Fights (Chronologically):`);
            console.log(`${'='.repeat(70)}`);
            last10Fights.forEach((fight, idx) => {
                const compId = fight.competitionId ? fight.competitionId.toString() : 'unknown';
                const compName = competitionMap[compId] || 'Unknown';
                const season = fight.season !== undefined ? fight.season : '?';
                const division = fight.division !== undefined ? fight.division : '?';
                const round = fight.round !== undefined ? fight.round : '?';
                console.log(`${idx + 1}. ${compName} S${season} D${division} R${round} - ${fight.isWinner ? '✅ WIN' : '❌ LOSS'}`);
            });

        } else {
            console.log('   No opponents history found');
        }

        console.log(`\n${'='.repeat(70)}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
checkFighterOpponentsHistory()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

