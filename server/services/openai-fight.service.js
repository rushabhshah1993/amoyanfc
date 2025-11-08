/**
 * OpenAI Fight Generation Service
 * 
 * This service integrates with OpenAI's ChatGPT 4.1 mini model to generate
 * realistic fight descriptions and statistics based on fighter data.
 * 
 * @module services/openai-fight.service
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Formats fighter data for LLM consumption
 * @param {Object} fighter - Fighter object from database
 * @returns {Object} Formatted fighter data
 */
function formatFighterData(fighter) {
    // Get active streak
    const activeStreak = fighter.streaks?.find(s => s.active);
    
    // Get last 5 performances
    const last5Performances = [];
    if (fighter.streaks && fighter.streaks.length > 0) {
        const recentStreaks = fighter.streaks
            .sort((a, b) => {
                const aEnd = a.end?.season || 999;
                const bEnd = b.end?.season || 999;
                return bEnd - aEnd;
            })
            .slice(0, 5);
        
        for (const streak of recentStreaks) {
            last5Performances.push({
                type: streak.type,
                count: streak.count,
                opponents: streak.opponents?.length || 0
            });
        }
    }

    return {
        name: `${fighter.firstName} ${fighter.lastName}`,
        physicalAttributes: {
            height: fighter.physicalAttributes?.heightCm ? `${fighter.physicalAttributes.heightCm}cm (${fighter.physicalAttributes.heightFeet})` : 'N/A',
            weight: fighter.physicalAttributes?.weightKg ? `${fighter.physicalAttributes.weightKg}kg` : 'N/A',
            armReach: fighter.physicalAttributes?.armReach ? `${fighter.physicalAttributes.armReach}cm` : 'N/A',
            legReach: fighter.physicalAttributes?.legReach ? `${fighter.physicalAttributes.legReach}cm` : 'N/A',
            bodyType: fighter.physicalAttributes?.bodyType || 'N/A',
            koPower: fighter.physicalAttributes?.koPower || 'N/A',
            durability: fighter.physicalAttributes?.durability || 'N/A',
            strength: fighter.physicalAttributes?.strength || 'N/A',
            endurance: fighter.physicalAttributes?.endurance || 'N/A',
            agility: fighter.physicalAttributes?.agility || 'N/A'
        },
        skillset: fighter.skillset?.join(', ') || 'N/A',
        fightStats: fighter.fightStats ? {
            totalFights: fighter.fightStats.totalFights || 0,
            wins: fighter.fightStats.wins || 0,
            losses: fighter.fightStats.losses || 0,
            winPercentage: fighter.fightStats.winPercentage?.toFixed(2) || 0,
            grappling: fighter.fightStats.grappling || {},
            significantStrikes: fighter.fightStats.significantStrikes || {},
            submissions: fighter.fightStats.submissions || {},
            takedowns: fighter.fightStats.takedowns || {}
        } : null,
        activeStreak: activeStreak ? {
            type: activeStreak.type,
            count: activeStreak.count
        } : null,
        last5Performances
    };
}

/**
 * Formats head-to-head history between two fighters
 * @param {Object} fighter1 - First fighter object
 * @param {Object} fighter2 - Second fighter object
 * @returns {Object} Head-to-head statistics
 */
function formatHeadToHeadHistory(fighter1, fighter2) {
    const fighter1History = fighter1.opponentsHistory?.find(
        opp => opp.opponentId.toString() === fighter2._id.toString()
    );

    if (!fighter1History) {
        return {
            totalFights: 0,
            fighter1Wins: 0,
            fighter2Wins: 0,
            details: []
        };
    }

    return {
        totalFights: fighter1History.totalFights || 0,
        fighter1Wins: fighter1History.totalWins || 0,
        fighter2Wins: fighter1History.totalLosses || 0,
        winPercentage: fighter1History.winPercentage || 0,
        details: fighter1History.details || []
    };
}

/**
 * Generates the system prompt for fight generation
 * @returns {String} System prompt
 */
function getSystemPrompt() {
    return `You are an expert MMA fight analyst and storyteller. Your task is to generate realistic and detailed fight descriptions and statistics for single-round knockout fights.

CRITICAL CONSTRAINTS:
- This is a single round KO fight
- There are NO tap-outs, ONLY knockouts
- There are exactly 2 fighters competing
- One fighter MUST win by knockout
- The fight description should be detailed, exciting, and realistic
- Statistics must be consistent with the fight description

Your response MUST be a valid JSON object with the following structure:
{
  "fightDescription": "Detailed fight description here...",
  "winner": "Fighter Name",
  "fighterStats": [
    {
      "fighterId": "ID of fighter",
      "stats": {
        "fightTime": 15.5,
        "finishingMove": "Knockout move description",
        "grappling": {
          "accuracy": 85.5,
          "defence": 12
        },
        "significantStrikes": {
          "accuracy": 78.2,
          "attempted": 45,
          "defence": 8,
          "landed": 35,
          "landedPerMinute": 2.3,
          "positions": {
            "clinching": 5,
            "ground": 15,
            "standing": 15
          }
        },
        "strikeMap": {
          "head": { "absorb": 3, "strike": 12 },
          "torso": { "absorb": 2, "strike": 8 },
          "leg": { "absorb": 1, "strike": 5 }
        },
        "submissions": {
          "attemptsPer15Mins": 2.1,
          "average": 1.5
        },
        "takedowns": {
          "accuracy": 70.0,
          "attempted": 4,
          "avgTakedownsLandedPerMin": 0.26,
          "defence": 1,
          "landed": 3
        }
      }
    },
    {
      "fighterId": "ID of other fighter",
      "stats": { ... }
    }
  ]
}

IMPORTANT:
- Generate realistic statistics that align with the fight description
- The winner should have a finishingMove, the loser should have finishingMove as null
- Both fighters should have the same fightTime
- Statistics should reflect the events described in the fight
- Strike numbers should be consistent (strikes landed + strikes absorbed = total strikes in the fight)`;
}

/**
 * Generates a fight simulation (AI chooses winner and creates description)
 * @param {Object} fighter1Data - Formatted fighter 1 data
 * @param {Object} fighter2Data - Formatted fighter 2 data
 * @param {Object} headToHeadData - Head-to-head history
 * @param {String} fighter1Id - Fighter 1 database ID
 * @param {String} fighter2Id - Fighter 2 database ID
 * @returns {Promise<Object>} Generated fight result
 */
export async function generateSimulatedFight(fighter1Data, fighter2Data, headToHeadData, fighter1Id, fighter2Id) {
    const userPrompt = `Generate a detailed knockout fight between these two fighters:

FIGHTER 1: ${fighter1Data.name}
Physical Attributes:
${JSON.stringify(fighter1Data.physicalAttributes, null, 2)}
Skills: ${fighter1Data.skillset}
Fight Statistics:
${JSON.stringify(fighter1Data.fightStats, null, 2)}
Active Streak: ${fighter1Data.activeStreak ? `${fighter1Data.activeStreak.count} ${fighter1Data.activeStreak.type}s` : 'None'}
Recent Performance: ${JSON.stringify(fighter1Data.last5Performances, null, 2)}

FIGHTER 2: ${fighter2Data.name}
Physical Attributes:
${JSON.stringify(fighter2Data.physicalAttributes, null, 2)}
Skills: ${fighter2Data.skillset}
Fight Statistics:
${JSON.stringify(fighter2Data.fightStats, null, 2)}
Active Streak: ${fighter2Data.activeStreak ? `${fighter2Data.activeStreak.count} ${fighter2Data.activeStreak.type}s` : 'None'}
Recent Performance: ${JSON.stringify(fighter2Data.last5Performances, null, 2)}

HEAD-TO-HEAD HISTORY:
${JSON.stringify(headToHeadData, null, 2)}

Based on all this data:
1. Analyze both fighters' strengths and weaknesses
2. Consider their physical attributes, skills, and recent performances
3. Determine a realistic winner
4. Generate a detailed, exciting fight description (4-6 paragraphs) that culminates in a knockout
5. Generate realistic statistics for both fighters that match the fight description

Remember: This MUST end in a knockout. Return the response as a valid JSON object.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8,
            max_tokens: 3000
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        // Map fighter names to IDs in the response
        result.fighterStats = result.fighterStats.map((stats, index) => ({
            ...stats,
            fighterId: index === 0 ? fighter1Id : fighter2Id
        }));

        // Determine winner ID
        const winnerName = result.winner.toLowerCase();
        result.winnerId = winnerName.includes(fighter1Data.name.toLowerCase()) 
            ? fighter1Id 
            : fighter2Id;

        return result;
    } catch (error) {
        console.error('Error generating simulated fight:', error);
        throw new Error(`Failed to generate simulated fight: ${error.message}`);
    }
}

/**
 * Generates a fight with user-specified winner and optional description
 * @param {Object} fighter1Data - Formatted fighter 1 data
 * @param {Object} fighter2Data - Formatted fighter 2 data
 * @param {Object} headToHeadData - Head-to-head history
 * @param {String} fighter1Id - Fighter 1 database ID
 * @param {String} fighter2Id - Fighter 2 database ID
 * @param {String} winnerId - ID of the winning fighter
 * @param {String} userDescription - Optional user-provided fight description
 * @returns {Promise<Object>} Generated fight result
 */
export async function generateUserSelectedFight(
    fighter1Data, 
    fighter2Data, 
    headToHeadData, 
    fighter1Id, 
    fighter2Id, 
    winnerId, 
    userDescription
) {
    const winnerData = winnerId === fighter1Id ? fighter1Data : fighter2Data;
    const loserData = winnerId === fighter1Id ? fighter2Data : fighter1Data;

    let descriptionPrompt = '';
    if (userDescription && userDescription.trim() !== '') {
        descriptionPrompt = `The user has provided this description of the fight:
"${userDescription}"

Using this as a foundation, expand it into a detailed, exciting fight description (4-6 paragraphs) that:
- Incorporates all the user's key points
- Adds more technical details and atmosphere
- Makes the fight come alive with vivid imagery
- Maintains consistency with the fighters' attributes and skills
- Ensures it ends with a knockout by ${winnerData.name}`;
    } else {
        descriptionPrompt = `Generate a detailed, exciting fight description (4-6 paragraphs) where ${winnerData.name} defeats ${loserData.name} by knockout. The description should:
- Be consistent with both fighters' attributes, skills, and statistics
- Show a realistic progression of the fight
- Highlight key moments and turning points
- End with a dramatic knockout by ${winnerData.name}`;
    }

    const userPrompt = `Generate a detailed knockout fight with a predetermined winner:

FIGHTER 1: ${fighter1Data.name}
Physical Attributes:
${JSON.stringify(fighter1Data.physicalAttributes, null, 2)}
Skills: ${fighter1Data.skillset}
Fight Statistics:
${JSON.stringify(fighter1Data.fightStats, null, 2)}
Active Streak: ${fighter1Data.activeStreak ? `${fighter1Data.activeStreak.count} ${fighter1Data.activeStreak.type}s` : 'None'}

FIGHTER 2: ${fighter2Data.name}
Physical Attributes:
${JSON.stringify(fighter2Data.physicalAttributes, null, 2)}
Skills: ${fighter2Data.skillset}
Fight Statistics:
${JSON.stringify(fighter2Data.fightStats, null, 2)}
Active Streak: ${fighter2Data.activeStreak ? `${fighter2Data.activeStreak.count} ${fighter2Data.activeStreak.type}s` : 'None'}

HEAD-TO-HEAD HISTORY:
${JSON.stringify(headToHeadData, null, 2)}

WINNER: ${winnerData.name}

${descriptionPrompt}

Then generate realistic fight statistics for both fighters that match the description. Return the response as a valid JSON object.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 3000
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        // Map fighter names to IDs in the response
        result.fighterStats = result.fighterStats.map((stats, index) => ({
            ...stats,
            fighterId: index === 0 ? fighter1Id : fighter2Id
        }));

        // Set the winner ID
        result.winnerId = winnerId;

        return result;
    } catch (error) {
        console.error('Error generating user-selected fight:', error);
        throw new Error(`Failed to generate fight with selected winner: ${error.message}`);
    }
}

/**
 * Main service function to generate fight results
 * @param {Object} fighter1 - First fighter from database
 * @param {Object} fighter2 - Second fighter from database
 * @param {Boolean} isSimulated - Whether to simulate (true) or use user-selected winner (false)
 * @param {String} winnerId - ID of winner (only for non-simulated fights)
 * @param {String} userDescription - Optional user description (only for non-simulated fights)
 * @returns {Promise<Object>} Complete fight result with description and stats
 */
export async function generateFightResult(fighter1, fighter2, isSimulated, winnerId = null, userDescription = null) {
    // Validate inputs
    if (!fighter1 || !fighter2) {
        throw new Error('Both fighters must be provided');
    }

    if (!isSimulated && !winnerId) {
        throw new Error('Winner ID must be provided for non-simulated fights');
    }

    if (!isSimulated && winnerId !== fighter1._id.toString() && winnerId !== fighter2._id.toString()) {
        throw new Error('Winner ID must match one of the fighters');
    }

    // Format fighter data
    const fighter1Data = formatFighterData(fighter1);
    const fighter2Data = formatFighterData(fighter2);
    const headToHeadData = formatHeadToHeadHistory(fighter1, fighter2);

    const fighter1Id = fighter1._id.toString();
    const fighter2Id = fighter2._id.toString();

    // Generate fight based on mode
    if (isSimulated) {
        return await generateSimulatedFight(
            fighter1Data,
            fighter2Data,
            headToHeadData,
            fighter1Id,
            fighter2Id
        );
    } else {
        return await generateUserSelectedFight(
            fighter1Data,
            fighter2Data,
            headToHeadData,
            fighter1Id,
            fighter2Id,
            winnerId,
            userDescription
        );
    }
}

