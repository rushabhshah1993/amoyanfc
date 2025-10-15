import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { Fighter } from '../models/fighter.model.js';
import { connectDB } from '../db/connectDB.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Check a few fighters' competition history
const FIGHTER_IDS = [
    '676d7452eb38b2b97c6da981', // Season 1 winner
    '676d6ecceb38b2b97c6da945', // Season 2 winner
    '676d7613eb38b2b97c6da9a9'  // Season 3 winner
];

async function checkFighterCompetitionHistory() {
    try {
        console.log('🔍 Checking fighter competition history...\n');

        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        for (const fighterId of FIGHTER_IDS) {
            const fighter = await Fighter.findById(fighterId);
            
            if (!fighter) {
                console.log(`❌ Fighter not found: ${fighterId}\n`);
                continue;
            }

            console.log(`\n👤 Fighter: ${fighter.firstName} ${fighter.lastName} (${fighterId})`);
            console.log('─'.repeat(60));
            
            if (!fighter.competitionHistory || fighter.competitionHistory.length === 0) {
                console.log('⚠️  No competition history found');
            } else {
                console.log(`✅ Found ${fighter.competitionHistory.length} competition history record(s):\n`);
                
                fighter.competitionHistory.forEach((history, index) => {
                    console.log(`   ${index + 1}. Competition ID: ${history.competitionId}`);
                    console.log(`      Season Appearances: ${history.numberOfSeasonAppearances}`);
                    console.log(`      Total Fights: ${history.totalFights}`);
                    console.log(`      Total Wins: ${history.totalWins}`);
                    console.log(`      Total Losses: ${history.totalLosses}`);
                    console.log(`      Win Percentage: ${history.winPercentage}%`);
                    
                    if (history.titles && history.titles.totalTitles > 0) {
                        console.log(`      🏆 Titles: ${history.titles.totalTitles}`);
                        history.titles.details.forEach(title => {
                            console.log(`         - Season ${title.seasonNumber}, Division ${title.divisionNumber}`);
                        });
                    } else {
                        console.log(`      🏆 Titles: 0`);
                    }
                    console.log('');
                });
            }
        }

        console.log('\n✅ Check complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error checking fighter competition history:', error);
        process.exit(1);
    }
}

checkFighterCompetitionHistory();

