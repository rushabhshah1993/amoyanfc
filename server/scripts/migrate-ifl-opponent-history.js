import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.staging') });

const Fighter = mongoose.model('Fighter', new mongoose.Schema({}, { strict: false }));
const Competition = mongoose.model('Competition', new mongoose.Schema({}, { strict: false }));

async function migrateIFLOpponentHistory() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const iflMetaId = '67780e1d09a4c4b25127f8f8';
        
        // Get IFL competition
        const iflComp = await Competition.findOne({ 
            competitionMetaId: mongoose.Types.ObjectId.createFromHexString(iflMetaId) 
        });
        
        if (!iflComp) {
            console.log('❌ No IFL competition found');
            return;
        }
        
        console.log(`📋 Found IFL Season ${iflComp.seasonMeta.seasonNumber}\n`);
        
        // Build a map of fightId -> {division, round, date}
        const fightDataMap = new Map();
        
        iflComp.leagueData.divisions.forEach(division => {
            const divNumber = division.divisionNumber;
            
            division.rounds.forEach(round => {
                const roundNumber = round.roundNumber;
                
                round.fights.forEach(fight => {
                    fightDataMap.set(fight._id.toString(), {
                        division: divNumber,
                        round: roundNumber,
                        date: fight.date,
                        season: iflComp.seasonMeta.seasonNumber
                    });
                });
            });
        });
        
        console.log(`📊 Mapped ${fightDataMap.size} IFL fights\n`);
        
        // Now update all fighters
        const allFighters = await Fighter.find({});
        console.log(`👥 Checking ${allFighters.length} fighters...\n`);
        
        let fightersUpdated = 0;
        let fightsUpdated = 0;
        
        for (const fighter of allFighters) {
            let fighterModified = false;
            
            if (!fighter.opponentsHistory) continue;
            
            fighter.opponentsHistory.forEach(opponent => {
                opponent.details?.forEach(detail => {
                    // Check if this is an IFL fight
                    if (detail.competitionId?.toString() === iflMetaId) {
                        const fightData = fightDataMap.get(detail.fightId?.toString());
                        
                        if (fightData) {
                            // Update missing fields
                            // MongoDB schema uses divisionId and roundId (not division and round)
                            if (detail.divisionId == null && fightData.division != null) {
                                detail.divisionId = fightData.division;
                                fighterModified = true;
                            }
                            if (detail.roundId == null && fightData.round != null) {
                                detail.roundId = fightData.round;
                                fighterModified = true;
                            }
                            if (detail.date == null && fightData.date != null) {
                                detail.date = fightData.date;
                                fighterModified = true;
                            }
                            
                            if (fighterModified) {
                                fightsUpdated++;
                            }
                        }
                    }
                });
            });
            
            if (fighterModified) {
                fighter.markModified('opponentsHistory');
                await fighter.save();
                fightersUpdated++;
                console.log(`✅ Updated: ${fighter.firstName} ${fighter.lastName}`);
            }
        }
        
        console.log(`\n📈 Migration Complete:`);
        console.log(`   Fighters updated: ${fightersUpdated}`);
        console.log(`   IFL fights updated: ${fightsUpdated}`);

        await mongoose.connection.close();
        console.log('\n✅ Disconnected');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

migrateIFLOpponentHistory();

