/**
 * Script to fetch competition meta data from MongoDB
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { CompetitionMeta } from '../models/competition-meta.model.js';

async function fetchCompetitionMeta() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Get total count
    const totalCount = await CompetitionMeta.countDocuments({});
    console.log(`📊 Total competition meta records: ${totalCount}\n`);
    
    if (totalCount === 0) {
      console.log('❌ No competition meta data found in the database!');
      await mongoose.connection.close();
      return;
    }
    
    // Fetch all competition meta data
    const allCompetitions = await CompetitionMeta.find({}).sort({ createdAt: 1 });
    
    console.log('🏆 Competition Meta Data:\n');
    console.log('='.repeat(80));
    
    allCompetitions.forEach((competition, index) => {
      console.log(`\n${index + 1}. Competition: ${competition.competitionName}`);
      console.log(`   ID: ${competition._id}`);
      console.log(`   Type: ${competition.type}`);
      console.log(`   Short Name: ${competition.shortName || 'N/A'}`);
      console.log(`   Description: ${competition.description || 'N/A'}`);
      console.log(`   Logo: ${competition.logo}`);
      console.log(`   Created: ${competition.createdAt}`);
      console.log(`   Updated: ${competition.updatedAt}`);
      console.log('─'.repeat(60));
    });
    
    // Group by type
    const leagueCount = await CompetitionMeta.countDocuments({ type: 'league' });
    const cupCount = await CompetitionMeta.countDocuments({ type: 'cup' });
    
    console.log(`\n📈 Summary:`);
    console.log(`   League competitions: ${leagueCount}`);
    console.log(`   Cup competitions: ${cupCount}`);
    console.log(`   Total: ${totalCount}`);
    
    // Export to JSON file
    const exportData = {
      timestamp: new Date().toISOString(),
      totalCount,
      competitions: allCompetitions.map(comp => ({
        _id: comp._id,
        competitionName: comp.competitionName,
        type: comp.type,
        shortName: comp.shortName,
        description: comp.description,
        logo: comp.logo,
        createdAt: comp.createdAt,
        updatedAt: comp.updatedAt
      }))
    };
    
    const fs = await import('fs');
    const exportPath = path.join(__dirname, '../../backups/competition-meta-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`\n💾 Data exported to: ${exportPath}`);
    
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    
  } catch (error) {
    console.error('❌ Error fetching competition meta data:', error);
    process.exit(1);
  }
}

fetchCompetitionMeta();
