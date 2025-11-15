/**
 * Migration Script: Populate dates in fighter's opponentsHistory from fight documents (PRODUCTION)
 * 
 * PRODUCTION-SAFE VERSION:
 * - Excludes ALL IFL competition fights
 * - Only migrates IFC, IC, and CC competitions
 * 
 * This script:
 * 1. Gets all competition metas and identifies IFL competitions
 * 2. Gets all fighters
 * 3. For each fight in opponentsHistory:
 *    - SKIPS if it belongs to an IFL competition
 *    - Looks up the actual fight in Competition for IFC/IC/CC
 *    - Populates the date field from the fight document
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Fighter } from '../models/fighter.model.js';
import { Competition } from '../models/competition.model.js';
import { CompetitionMeta } from '../models/competition-meta.model.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.production from project root (two levels up from scripts)
const envPath = path.join(__dirname, '../../.env.production');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in environment');
    console.error(`   Tried to load from: ${envPath}`);
    console.error('   Please ensure .env.production exists at project root');
    process.exit(1);
}

async function migrateOpponentHistoryDatesProduction() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        
        const dbName = mongoose.connection.db.databaseName;
        console.log(`✅ Connected to MongoDB: ${dbName}\n`);

        // CRITICAL: Verify we're NOT on staging
        if (dbName === 'staging-amoyan') {
            console.error('❌ ERROR: This script detected STAGING database!');
            console.error('❌ This script should ONLY run on PRODUCTION database (gql-db)');
            console.error('❌ Migration ABORTED for safety.');
            process.exit(1);
        }

        console.log('🔍 Step 1: Identifying IFL competitions to exclude...\n');
        
        // Get all IFL competition metas
        const iflCompetitionMetas = await CompetitionMeta.find({
            $or: [
                { title: /IFL/i },
                { shortTitle: /IFL/i }
            ]
        });

        const iflCompetitionMetaIds = iflCompetitionMetas.map(cm => cm._id.toString());
        
        console.log(`📊 Found ${iflCompetitionMetas.length} IFL competition(s) to EXCLUDE:`);
        iflCompetitionMetas.forEach(comp => {
            console.log(`   ❌ EXCLUDING: ${comp.title || comp.shortTitle} (ID: ${comp._id})`);
        });
        
        if (iflCompetitionMetas.length === 0) {
            console.log('   ✅ No IFL competitions found (expected for production)\n');
        } else {
            console.log('   ⚠️  WARNING: IFL competitions found in production database!\n');
        }

        console.log('🔍 Step 2: Processing fighters...\n');
        
        const fighters = await Fighter.find({});
        console.log(`📊 Found ${fighters.length} fighters\n`);

        let updatedFighterCount = 0;
        let totalFightsProcessed = 0;
        let iflFightsSkipped = 0;

        for (const fighter of fighters) {
            console.log(`\n👤 Processing: ${fighter.firstName} ${fighter.lastName}`);
            
            if (!fighter.opponentsHistory || fighter.opponentsHistory.length === 0) {
                console.log('   ⚠️  No opponents history');
                continue;
            }

            let fighterModified = false;

            for (const opponentHistory of fighter.opponentsHistory) {
                for (const detail of opponentHistory.details) {
                    totalFightsProcessed++;

                    // CRITICAL: Skip IFL fights
                    const competitionIdStr = detail.competitionId.toString();
                    if (iflCompetitionMetaIds.includes(competitionIdStr)) {
                        iflFightsSkipped++;
                        console.log(`   🚫 SKIPPED IFL fight ${detail.fightId.toString().substring(0, 12)}...`);
                        continue;
                    }

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
                            console.log(`   ⚠️  Competition not found for fight ${detail.fightId.toString().substring(0, 12)}...`);
                            continue;
                        }

                        let fight = null;

                        // Search in league data
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
                            fighterModified = true;
                            console.log(`   ✓ Updated fight ${detail.fightId.toString().substring(0, 12)}... with date ${fight.date.toISOString().split('T')[0]}`);
                        } else if (fight && !fight.date) {
                            console.log(`   ⚠️  Fight ${detail.fightId.toString().substring(0, 12)}... has no date in competition`);
                        } else {
                            console.log(`   ❌ Fight ${detail.fightId.toString().substring(0, 12)}... not found in competition`);
                        }
                    } catch (error) {
                        console.error(`   ❌ Error processing fight ${detail.fightId}:`, error.message);
                    }
                }
            }

            if (fighterModified) {
                // Mark the nested array as modified so Mongoose saves it
                fighter.markModified('opponentsHistory');
                await fighter.save();
                updatedFighterCount++;
                console.log(`   💾 Saved updates for ${fighter.firstName} ${fighter.lastName}`);
            }
        }

        console.log('\n======================================================================');
        console.log('📊 PRODUCTION MIGRATION COMPLETE');
        console.log('======================================================================');
        console.log(`✅ Fighters updated: ${updatedFighterCount}`);
        console.log(`📝 Total fights processed: ${totalFightsProcessed}`);
        console.log(`🚫 IFL fights skipped: ${iflFightsSkipped}`);
        console.log(`📊 Database: ${dbName}`);
        console.log('======================================================================\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

migrateOpponentHistoryDatesProduction();

