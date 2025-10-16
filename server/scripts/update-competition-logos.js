/**
 * Script to update competition meta logo URLs in MongoDB
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

import { CompetitionMeta } from '../models/competition-meta.model.js';

// Define the updated logo URLs mapping (converting s3:// to HTTPS URLs with proper encoding)
const logoUpdates = {
  '67780dcc09a4c4b25127f8f6': 'https://amoyanfc-assets.s3.amazonaws.com/competitions/ifc.png', // Invictus Fighting Championship
  '67780e1d09a4c4b25127f8f8': 'https://amoyanfc-assets.s3.amazonaws.com/competitions/ifl.png', // Invictus Fight League
  '6778100309a4c4b25127f8fa': 'https://amoyanfc-assets.s3.amazonaws.com/competitions/champions-cup.png', // Champions' Cup
  '6778103309a4c4b25127f8fc': 'https://amoyanfc-assets.s3.amazonaws.com/competitions/invicta-cup.png', // Invicta Cup
  '677810b009a4c4b25127f8fe': 'https://amoyanfc-assets.s3.amazonaws.com/competitions/brawl-logo.jpg' // Brawl
};

async function updateCompetitionLogos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔄 Updating competition logo URLs...\n');
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const [competitionId, newLogoUrl] of Object.entries(logoUpdates)) {
      try {
        const competition = await CompetitionMeta.findById(competitionId);
        
        if (!competition) {
          console.log(`❌ Competition not found: ${competitionId}`);
          continue;
        }
        
        const oldLogoUrl = competition.logo;
        
        // Check if the URL is already updated
        if (oldLogoUrl === newLogoUrl) {
          console.log(`⏭️  Skipping ${competition.competitionName} - already has correct URL`);
          skippedCount++;
          continue;
        }
        
        // Update the logo URL
        competition.logo = newLogoUrl;
        await competition.save();
        
        console.log(`✅ Updated ${competition.competitionName}:`);
        console.log(`   Old: ${oldLogoUrl}`);
        console.log(`   New: ${newLogoUrl}`);
        console.log('');
        
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating competition ${competitionId}:`, error.message);
      }
    }
    
    console.log('📊 Update Summary:');
    console.log(`   Updated: ${updatedCount} competitions`);
    console.log(`   Skipped: ${skippedCount} competitions`);
    console.log(`   Total processed: ${Object.keys(logoUpdates).length} competitions`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...\n');
    const allCompetitions = await CompetitionMeta.find({}).sort({ createdAt: 1 });
    
    allCompetitions.forEach((competition, index) => {
      console.log(`${index + 1}. ${competition.competitionName}`);
      console.log(`   Logo: ${competition.logo}`);
      console.log(`   Updated: ${competition.updatedAt}`);
      console.log('─'.repeat(60));
    });
    
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    
  } catch (error) {
    console.error('❌ Error updating competition logos:', error);
    process.exit(1);
  }
}

// Run the script
updateCompetitionLogos();

export { updateCompetitionLogos };
