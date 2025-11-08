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
    return `You are the Amoyan Fight Simulator, an expert MMA fight analyst and storyteller. Follow these rules STRICTLY:

GLOBAL CONSTRAINTS:
- Exactly 2 fighters. Single round only.
- The fight ALWAYS ends by KNOCKOUT (KO). No tap-outs, no submissions as victory conditions.
- Chokes, slams, and grappling may appear as damage/control tactics, but the final victory condition MUST be a knockout.
- Maintain realistic MMA logic based on provided fighter attributes (physical stats, skills, fight history).
- Use metric units for any distances/measurements.
- Tone: Cinematic, grounded, with psychological intensity. Exciting but realistic.

FINISHING MOVE RULES (CRITICAL):
- The "finishingMove" MUST be a knockout strike, such as, but not limited to:
  * "Roundhouse kick to the head"
  * "Spinning back kick to the temple"
  * "Flying knee to the chin"
  * "Hook to the jaw"
  * "Axe kick"
  * "Uppercut"
  * "Head kick"
  * "Overhand right"
- Grappling and submission attempts can be part of the fight narrative, but the fight MUST end with a knockout strike.

OUTPUT CONTRACT:
Your response MUST be a valid JSON object with this exact structure:
{
  "genAIDescription": "Detailed 3-4 paragraph fight narrative here...",
  "winnerId": "ID of the winning fighter (use the exact ID provided)",
  "fighterStats": [
    {
      "fighterId": "ID of fighter (use the exact ID provided in the prompt)",
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
      "fighterId": "ID of other fighter (use the exact ID provided in the prompt)",
      "stats": {
        "fightTime": 15.5,
        "finishingMove": null,
        "grappling": { ... },
        "significantStrikes": { ... },
        "strikeMap": { ... },
        "submissions": { ... },
        "takedowns": { ... }
      }
    }
  ]
}

CRITICAL ID AND MAPPING RULES:
1. You will be provided with fighter information in the format: "Fighter Name (ID: fighter_id_here)"
2. ALWAYS use "genAIDescription" for YOUR generated fight narrative (NOT "fightDescription", "narrative", "description", or "userDescription")
3. Note: "userDescription" is a separate field for user input - DO NOT use this field name in your output
4. Use "winnerId" with the EXACT ID provided in the prompt (NOT "winner" or "winnerName")
5. For each fighter in fighterStats, use "fighterId" with the EXACT ID provided in the prompt
6. In the narrative, use fighter names naturally (e.g., "John Smith", "Sarah Lee")
7. In the JSON structure (winnerId, fighterId), use the exact IDs provided

STATISTICAL CONSISTENCY (CRITICAL):
You MUST ensure these mathematical relationships hold:
1. significantStrikes.landed = positions.clinching + positions.ground + positions.standing
2. strikeMap.head.strike + strikeMap.torso.strike + strikeMap.leg.strike = significantStrikes.landed
3. For each fighter: strikeMap.head.absorb (from Fighter A) ≈ strikeMap.head.strike (from Fighter B)
4. significantStrikes.accuracy = (significantStrikes.landed / significantStrikes.attempted) × 100
5. takedowns.accuracy = (takedowns.landed / takedowns.attempted) × 100
6. Both fighters MUST have the same fightTime value
7. Only the winner has a finishingMove; the loser has finishingMove as null
8. landedPerMinute = significantStrikes.landed / fightTime
9. avgTakedownsLandedPerMin = takedowns.landed / fightTime
10. All stats must be realistic for the given fightTime

NARRATIVE REQUIREMENTS:
- Write 3-4 detailed paragraphs describing the fight progression (concise but engaging)
- Use the fighter names (NOT IDs) naturally throughout the narrative
- Show realistic fight tempo and momentum shifts
- Include specific techniques, positions, and tactical decisions
- Build tension toward the knockout finish
- Describe the knockout moment vividly and conclusively
- The narrative should make the statistics you generate feel earned and logical

STATISTICAL GENERATION PROCESS (CRITICAL):
You MUST analyze the fight narrative sentence-by-sentence to generate accurate statistics:
1. Read through each sentence of your generated fight description
2. For each action described, track which fighter performed it and update their stats
3. Count strikes: Every punch, kick, knee, elbow mentioned → add to significantStrikes.attempted
4. Count landed strikes: Strikes that "connected", "landed", "hit the target" → add to significantStrikes.landed
5. Track positions: "clinch" → clinching, "on the ground" → ground, "standing exchange" → standing
6. Track body targets: Head strikes → strikeMap.head.strike, torso → strikeMap.torso.strike, legs → strikeMap.leg.strike
7. Track absorbed strikes: When a fighter "absorbed", "took", "was hit by" → strikeMap.X.absorb
8. Count takedowns: "took down", "slammed", "brought to the ground" → takedowns.attempted (and .landed if successful)
9. Count submission attempts: "attempted arm bar", "locked in a choke" → submissions.attemptsPer15Mins
10. Calculate derived stats: accuracy, per-minute rates, etc.
11. Ensure symmetry: Fighter A's head strikes should approximately equal Fighter B's head absorbs
12. Make the stats realistic for the fight time and narrative length

VALIDATION & SELF-CHECK:
Before returning your response:
1. Verify the finishingMove is a knockout strike
2. Re-read the narrative sentence-by-sentence and verify stats match what was described
3. Check all mathematical relationships in the stats
4. Ensure fightTime aligns with narrative length and intensity
5. Confirm both fighters have identical fightTime
6. Verify winner has finishingMove, loser has null
7. Verify you used the correct IDs (not names) in winnerId and fighterId fields
8. Verify you used "genAIDescription" as the field name for your narrative (NOT "userDescription", "fightDescription", "description", or "narrative")
9. If any constraint is violated, silently fix it before responding

Generate exciting, realistic, and statistically consistent fight results that honor the fighters' attributes and history.`;
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

FIGHTER 1: ${fighter1Data.name} (ID: ${fighter1Id})
Physical Attributes:
${JSON.stringify(fighter1Data.physicalAttributes, null, 2)}
Skills: ${fighter1Data.skillset}
Fight Statistics:
${JSON.stringify(fighter1Data.fightStats, null, 2)}
Active Streak: ${fighter1Data.activeStreak ? `${fighter1Data.activeStreak.count} ${fighter1Data.activeStreak.type}s` : 'None'}
Recent Performance: ${JSON.stringify(fighter1Data.last5Performances, null, 2)}

FIGHTER 2: ${fighter2Data.name} (ID: ${fighter2Id})
Physical Attributes:
${JSON.stringify(fighter2Data.physicalAttributes, null, 2)}
Skills: ${fighter2Data.skillset}
Fight Statistics:
${JSON.stringify(fighter2Data.fightStats, null, 2)}
Active Streak: ${fighter2Data.activeStreak ? `${fighter2Data.activeStreak.count} ${fighter2Data.activeStreak.type}s` : 'None'}
Recent Performance: ${JSON.stringify(fighter2Data.last5Performances, null, 2)}

HEAD-TO-HEAD HISTORY:
${JSON.stringify(headToHeadData, null, 2)}

INSTRUCTIONS:
Based on all this data, follow this process:
1. Analyze both fighters' strengths and weaknesses
2. Consider their physical attributes, skills, and recent performances
3. Determine a realistic winner
4. Generate a detailed, exciting fight description (3-4 paragraphs) that culminates in a knockout
5. Go through your fight description sentence-by-sentence
6. For each sentence, identify the specific actions (strikes, takedowns, positions) and which fighter performed them
7. Generate accurate statistics for both fighters based on this sentence-by-sentence analysis
8. Use the fighter IDs (${fighter1Id} and ${fighter2Id}) in your JSON response for "winnerId" and "fighterId" fields
9. Use the fighter names (${fighter1Data.name} and ${fighter2Data.name}) naturally in the narrative text

Remember: This MUST end in a knockout. Return the response as a valid JSON object with "genAIDescription", "winnerId", and "fighterStats".`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8,
            max_tokens: 2000  // Reduced from 3000 for cost efficiency
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        // Validate the response structure
        if (!result.genAIDescription || !result.winnerId || !result.fighterStats) {
            throw new Error('Invalid response structure from AI. Missing required fields.');
        }

        // Validate fighter IDs are correct
        const fighterIds = result.fighterStats.map(stats => stats.fighterId);
        if (!fighterIds.includes(fighter1Id) || !fighterIds.includes(fighter2Id)) {
            console.warn('AI returned incorrect fighter IDs. Fixing...');
            // Fix the IDs if AI messed them up
            result.fighterStats = result.fighterStats.map((stats, index) => ({
                ...stats,
                fighterId: index === 0 ? fighter1Id : fighter2Id
            }));
        }

        // Validate winner ID
        if (result.winnerId !== fighter1Id && result.winnerId !== fighter2Id) {
            console.warn('AI returned incorrect winner ID. Attempting to fix...');
            // Try to determine winner from the stats (who has the finishing move)
            const winnerStats = result.fighterStats.find(s => s.stats.finishingMove);
            if (winnerStats) {
                result.winnerId = winnerStats.fighterId;
            } else {
                // Default to fighter1 if we can't determine
                result.winnerId = fighter1Id;
            }
        }

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

FIGHTER 1: ${fighter1Data.name} (ID: ${fighter1Id})
Physical Attributes:
${JSON.stringify(fighter1Data.physicalAttributes, null, 2)}
Skills: ${fighter1Data.skillset}
Fight Statistics:
${JSON.stringify(fighter1Data.fightStats, null, 2)}
Active Streak: ${fighter1Data.activeStreak ? `${fighter1Data.activeStreak.count} ${fighter1Data.activeStreak.type}s` : 'None'}

FIGHTER 2: ${fighter2Data.name} (ID: ${fighter2Id})
Physical Attributes:
${JSON.stringify(fighter2Data.physicalAttributes, null, 2)}
Skills: ${fighter2Data.skillset}
Fight Statistics:
${JSON.stringify(fighter2Data.fightStats, null, 2)}
Active Streak: ${fighter2Data.activeStreak ? `${fighter2Data.activeStreak.count} ${fighter2Data.activeStreak.type}s` : 'None'}

HEAD-TO-HEAD HISTORY:
${JSON.stringify(headToHeadData, null, 2)}

PREDETERMINED WINNER: ${winnerData.name} (ID: ${winnerId})

${descriptionPrompt}

INSTRUCTIONS FOR STATISTICS:
1. After generating the fight description, go through it sentence-by-sentence
2. For each sentence, identify specific actions: strikes thrown, strikes landed, takedowns, positions, etc.
3. Track which fighter performed each action
4. Accumulate statistics based on what actually happened in your narrative
5. Ensure stats are realistic and mathematically consistent
6. Use the fighter IDs (${fighter1Id} and ${fighter2Id}) in your JSON response for "winnerId" and "fighterId" fields
7. Use the fighter names (${fighter1Data.name} and ${fighter2Data.name}) in the narrative text

Return the response as a valid JSON object with "genAIDescription", "winnerId" (must be ${winnerId}), and "fighterStats".`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 2000  // Reduced from 3000 for cost efficiency
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        // Validate the response structure
        if (!result.genAIDescription || !result.winnerId || !result.fighterStats) {
            throw new Error('Invalid response structure from AI. Missing required fields.');
        }

        // Validate fighter IDs are correct
        const fighterIds = result.fighterStats.map(stats => stats.fighterId);
        if (!fighterIds.includes(fighter1Id) || !fighterIds.includes(fighter2Id)) {
            console.warn('AI returned incorrect fighter IDs. Fixing...');
            // Fix the IDs if AI messed them up
            result.fighterStats = result.fighterStats.map((stats, index) => ({
                ...stats,
                fighterId: index === 0 ? fighter1Id : fighter2Id
            }));
        }

        // Validate winner ID matches user-selected winner
        if (result.winnerId !== winnerId) {
            console.warn(`AI returned incorrect winner ID. Expected ${winnerId}, got ${result.winnerId}. Fixing...`);
            result.winnerId = winnerId;
        }

        // Ensure the winner has a finishing move
        const winnerStatsIndex = result.fighterStats.findIndex(s => s.fighterId === winnerId);
        if (winnerStatsIndex !== -1 && !result.fighterStats[winnerStatsIndex].stats.finishingMove) {
            console.warn('Winner is missing finishingMove. Adding default...');
            result.fighterStats[winnerStatsIndex].stats.finishingMove = 'Knockout strike';
        }

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

