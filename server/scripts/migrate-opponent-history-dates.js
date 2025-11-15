/**
 * Migration Script: Populate dates in fighter's opponentsHistory from fight documents
 * 
 * This script:
 * 1. Gets all fighters
 * 2. For each fight in opponentsHistory, looks up the actual fight in Competition
 * 3. Populates the date field from the fight document
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.staging from project root (two levels up from scripts)
const envPath = path.join(__dirname, '../../.env.staging');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in environment');
    console.error(`   Tried to load from: ${envPath}`);
    console.error('   Please ensure .env.staging exists at project root');
    process.exit(1);
}

async function migrateOpponentHistoryDates() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const fighters = await Fighter.find({});
        console.log(`📊 Found ${fighters.length} fighters\n`);

        let totalUpdated = 0;
        let totalFightsProcessed = 0;

        for (const fighter of fighters) {
            console.log(`\n👤 Processing: ${fighter.firstName} ${fighter.lastName}`);
            
            if (!fighter.opponentsHistory || fighter.opponentsHistory.length === 0) {
                console.log('   ⚠️  No opponents history');
                continue;
            }

            let fighterUpdated = false;

            for (const opponent of fighter.opponentsHistory) {
                for (const detail of opponent.details) {
                    totalFightsProcessed++;

                    // Skip if date already exists
                    if (detail.date) {
                        continue;
                    }

                    try {
                        // Find the competition and the specific fight
                        // Note: seasonNumber is nested in seasonMeta
                        const competition = await Competition.findOne({
                            'competitionMetaId': detail.competitionId,
                            'seasonMeta.seasonNumber': detail.season
                        });

                        if (!competition) {
                            console.log(`   ⚠️  Competition not found for fight ${detail.fightId}`);
                            continue;
                        }

                        let fight = null;

                        // Search in league data
                        // Note: detail might have division/round OR divisionId/roundId
                        const detailDivision = detail.division || detail.divisionId;
                        const detailRound = detail.round || detail.roundId;
                        
                        if (competition.leagueData?.divisions) {
                            for (const division of competition.leagueData.divisions) {
                                if (division.divisionNumber === detailDivision) {
                                    for (const round of division.rounds || []) {
                                        if (round.roundNumber === detailRound) {
                                            fight = round.fights?.find(f => 
                                                f._id.toString() === detail.fightId.toString()
                                            );
                                            if (fight) break;
                                        }
                                    }
                                }
                                if (fight) break;
                            }
                        }

                        // Search in cup data if not found in league
                        if (!fight && competition.cupData?.fights) {
                            fight = competition.cupData.fights.find(f => 
                                f._id.toString() === detail.fightId.toString()
                            );
                        }

                        if (fight && fight.date) {
                            detail.date = fight.date;
                            fighterUpdated = true;
                            console.log(`   ✓ Updated fight ${detail.fightId.toString().substring(0, 8)}... with date ${fight.date.toISOString()}`);
                        } else if (fight) {
                            console.log(`   ⚠️  Fight ${detail.fightId.toString().substring(0, 8)}... has no date in competition`);
                        } else {
                            console.log(`   ⚠️  Fight ${detail.fightId.toString().substring(0, 8)}... not found in competition`);
                        }

                    } catch (error) {
                        console.log(`   ❌ Error processing fight ${detail.fightId}: ${error.message}`);
                    }
                }
            }

            if (fighterUpdated) {
                // Mark the nested array as modified so Mongoose saves it
                fighter.markModified('opponentsHistory');
                await fighter.save();
                totalUpdated++;
                console.log(`   💾 Saved updates for ${fighter.firstName} ${fighter.lastName}`);
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 MIGRATION COMPLETE');
        console.log('='.repeat(70));
        console.log(`✅ Fighters updated: ${totalUpdated}`);
        console.log(`📝 Total fights processed: ${totalFightsProcessed}`);
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
migrateOpponentHistoryDates();

