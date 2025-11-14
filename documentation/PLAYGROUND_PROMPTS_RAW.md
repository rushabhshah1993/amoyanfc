# OpenAI Playground Test Prompts (Raw Data Format)

These are the ACTUAL user prompts that the application sends to the LLM. The application provides **raw data only** - the AI does all the analysis and interpretation.

---

## System Prompt

Use this system prompt for ALL tests. This is the same for both simulation and user-selected winner scenarios.

```
You are the Amoyan Fight Simulator, an expert MMA fight analyst and storyteller. Follow these rules STRICTLY:

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
- If head-to-head history is provided, analyze the timeline to identify momentum patterns (e.g., recent winning/losing streaks)
- Consider psychological factors: a fighter on a winning streak may have confidence; a fighter breaking a losing streak may have tactical improvements
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

Generate exciting, realistic, and statistically consistent fight results that honor the fighters' attributes and history.
```

---

## User Prompt 1: Simulation Mode (AI Chooses Winner)

```
Generate a detailed knockout fight between these two fighters:

FIGHTER 1: Sayali Raut (ID: 676d6ecceb38b2b97c6da945)
Physical Attributes:
{
  "height": "155cm (5'1)",
  "weight": "51kg",
  "armReach": "157cm",
  "legReach": "73cm",
  "koPower": 7.5,
  "durability": 8,
  "strength": 7,
  "endurance": 8.5,
  "agility": 7.5
}
Skills: MMA, Muay Thai
Fight Statistics:
{
  "totalFights": 54,
  "wins": 38,
  "losses": 16,
  "winPercentage": 70.37
}
Active Streak: 5 wins
Recent Performance: [
  { "type": "win", "count": 5, "opponents": 5 },
  { "type": "lose", "count": 2, "opponents": 2 }
]

FIGHTER 2: Jane Smith (ID: 676d7136eb38b2b97c6da953)
Physical Attributes:
{
  "height": "160cm (5'3)",
  "weight": "52kg",
  "armReach": "160cm",
  "legReach": "75cm",
  "koPower": 8,
  "durability": 7.5,
  "strength": 7.5,
  "endurance": 8,
  "agility": 8
}
Skills: MMA, BJJ, Kickboxing
Fight Statistics:
{
  "totalFights": 48,
  "wins": 32,
  "losses": 16,
  "winPercentage": 66.67
}
Active Streak: 3 wins
Recent Performance: [
  { "type": "win", "count": 3, "opponents": 3 },
  { "type": "lose", "count": 1, "opponents": 1 }
]

HEAD-TO-HEAD HISTORY:
{
  "totalFights": 5,
  "fighter1Wins": 2,
  "fighter2Wins": 3,
  "winPercentage": 40,
  "timeline": [
    {
      "fightNumber": 1,
      "season": 1,
      "round": 5,
      "winner": "Sayali Raut",
      "winnerId": "676d6ecceb38b2b97c6da945"
    },
    {
      "fightNumber": 2,
      "season": 2,
      "round": 3,
      "winner": "Sayali Raut",
      "winnerId": "676d6ecceb38b2b97c6da945"
    },
    {
      "fightNumber": 3,
      "season": 3,
      "round": 8,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    },
    {
      "fightNumber": 4,
      "season": 4,
      "round": 2,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    },
    {
      "fightNumber": 5,
      "season": 5,
      "round": 6,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    }
  ]
}

Based on all this data, analyze the fighters and generate a realistic fight outcome. Consider:
1. Both fighters' physical attributes, skills, and recent performances
2. The head-to-head timeline (analyze for momentum patterns yourself)
3. Determine a realistic winner
4. Generate a detailed, exciting 3-4 paragraph fight description that ends in a knockout
5. Go through your fight description sentence-by-sentence and generate accurate statistics for both fighters
6. Use the fighter IDs (676d6ecceb38b2b97c6da945 and 676d7136eb38b2b97c6da953) in your JSON response for "winnerId" and "fighterId" fields
7. Use the fighter names (Sayali Raut and Jane Smith) naturally in the narrative text

Return the response as a valid JSON object with "genAIDescription", "winnerId", and "fighterStats".
```

---

## User Prompt 2: User-Selected Winner (No User Description)

```
Generate a detailed knockout fight with a predetermined winner:

FIGHTER 1: Sayali Raut (ID: 676d6ecceb38b2b97c6da945)
Physical Attributes:
{
  "height": "155cm (5'1)",
  "weight": "51kg",
  "armReach": "157cm",
  "legReach": "73cm",
  "koPower": 7.5,
  "durability": 8,
  "strength": 7,
  "endurance": 8.5,
  "agility": 7.5
}
Skills: MMA, Muay Thai
Fight Statistics:
{
  "totalFights": 54,
  "wins": 38,
  "losses": 16,
  "winPercentage": 70.37
}
Active Streak: 5 wins

FIGHTER 2: Jane Smith (ID: 676d7136eb38b2b97c6da953)
Physical Attributes:
{
  "height": "160cm (5'3)",
  "weight": "52kg",
  "armReach": "160cm",
  "legReach": "75cm",
  "koPower": 8,
  "durability": 7.5,
  "strength": 7.5,
  "endurance": 8,
  "agility": 8
}
Skills: MMA, BJJ, Kickboxing
Fight Statistics:
{
  "totalFights": 48,
  "wins": 32,
  "losses": 16,
  "winPercentage": 66.67
}
Active Streak: 3 wins

HEAD-TO-HEAD HISTORY:
{
  "totalFights": 5,
  "fighter1Wins": 2,
  "fighter2Wins": 3,
  "winPercentage": 40,
  "timeline": [
    {
      "fightNumber": 1,
      "season": 1,
      "round": 5,
      "winner": "Sayali Raut",
      "winnerId": "676d6ecceb38b2b97c6da945"
    },
    {
      "fightNumber": 2,
      "season": 2,
      "round": 3,
      "winner": "Sayali Raut",
      "winnerId": "676d6ecceb38b2b97c6da945"
    },
    {
      "fightNumber": 3,
      "season": 3,
      "round": 8,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    },
    {
      "fightNumber": 4,
      "season": 4,
      "round": 2,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    },
    {
      "fightNumber": 5,
      "season": 5,
      "round": 6,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    }
  ]
}

PREDETERMINED WINNER: Sayali Raut (ID: 676d6ecceb38b2b97c6da945)

Generate a detailed, exciting 3-4 paragraph fight description where Sayali Raut defeats Jane Smith by knockout. The description should:
1. Be consistent with both fighters' attributes, skills, and statistics
2. Analyze the head-to-head timeline yourself to understand the psychological context
3. Show a realistic progression of the fight leading to Sayali's victory
4. End with a dramatic knockout by Sayali Raut

After generating the narrative:
1. Go through your fight description sentence-by-sentence
2. Generate accurate statistics for both fighters based on what happened in the narrative
3. Use the fighter IDs (676d6ecceb38b2b97c6da945 and 676d7136eb38b2b97c6da953) in your JSON for "winnerId" and "fighterId"
4. Use the fighter names (Sayali Raut and Jane Smith) in the narrative text

Return the response as a valid JSON object with "genAIDescription", "winnerId" (must be 676d6ecceb38b2b97c6da945), and "fighterStats".
```

---

## User Prompt 3: User-Selected Winner (With User Description)

```
Generate a detailed knockout fight with a predetermined winner:

FIGHTER 1: Sayali Raut (ID: 676d6ecceb38b2b97c6da945)
Physical Attributes:
{
  "height": "155cm (5'1)",
  "weight": "51kg",
  "armReach": "157cm",
  "legReach": "73cm",
  "koPower": 7.5,
  "durability": 8,
  "strength": 7,
  "endurance": 8.5,
  "agility": 7.5
}
Skills: MMA, Muay Thai
Fight Statistics:
{
  "totalFights": 54,
  "wins": 38,
  "losses": 16,
  "winPercentage": 70.37
}
Active Streak: 5 wins

FIGHTER 2: Jane Smith (ID: 676d7136eb38b2b97c6da953)
Physical Attributes:
{
  "height": "160cm (5'3)",
  "weight": "52kg",
  "armReach": "160cm",
  "legReach": "75cm",
  "koPower": 8,
  "durability": 7.5,
  "strength": 7.5,
  "endurance": 8,
  "agility": 8
}
Skills: MMA, BJJ, Kickboxing
Fight Statistics:
{
  "totalFights": 48,
  "wins": 32,
  "losses": 16,
  "winPercentage": 66.67
}
Active Streak: 3 wins

HEAD-TO-HEAD HISTORY:
{
  "totalFights": 5,
  "fighter1Wins": 2,
  "fighter2Wins": 3,
  "winPercentage": 40,
  "timeline": [
    {
      "fightNumber": 1,
      "season": 1,
      "round": 5,
      "winner": "Sayali Raut",
      "winnerId": "676d6ecceb38b2b97c6da945"
    },
    {
      "fightNumber": 2,
      "season": 2,
      "round": 3,
      "winner": "Sayali Raut",
      "winnerId": "676d6ecceb38b2b97c6da945"
    },
    {
      "fightNumber": 3,
      "season": 3,
      "round": 8,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    },
    {
      "fightNumber": 4,
      "season": 4,
      "round": 2,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    },
    {
      "fightNumber": 5,
      "season": 5,
      "round": 6,
      "winner": "Jane Smith",
      "winnerId": "676d7136eb38b2b97c6da953"
    }
  ]
}

PREDETERMINED WINNER: Sayali Raut (ID: 676d6ecceb38b2b97c6da945)

USER'S FIGHT DESCRIPTION:
"Sayali came in with a new game plan, focusing on her Muay Thai leg kicks to slow down Jane's movement. Jane tried to take the fight to the ground using her BJJ, but Sayali's takedown defense held strong. In the final moments, Sayali landed a devastating spinning back kick to Jane's temple, knocking her out cold."

Using this as a foundation, expand it into a detailed 3-4 paragraph fight narrative that:
1. Incorporates all the user's key points (leg kicks, takedown defense, spinning back kick KO)
2. Analyzes the head-to-head timeline to understand the psychological context
3. Adds technical details, atmosphere, and vivid imagery
4. Maintains consistency with the fighters' attributes and skills
5. Ensures it ends with a knockout by Sayali Raut via spinning back kick

After generating the narrative:
1. Go through your fight description sentence-by-sentence
2. Generate accurate statistics for both fighters based on what happened in the narrative
3. Use the fighter IDs (676d6ecceb38b2b97c6da945 and 676d7136eb38b2b97c6da953) in your JSON for "winnerId" and "fighterId"
4. Use the fighter names (Sayali Raut and Jane Smith) in the narrative text

Return the response as a valid JSON object with "genAIDescription", "winnerId" (must be 676d6ecceb38b2b97c6da945), and "fighterStats".
```

---

## Key Differences from Previous Version

✅ **What Changed:**
1. **Removed `recentMomentum`**: Application no longer generates analysis text like "Jane Smith has won the last 3 fight(s)"
2. **AI Does Analysis**: The AI now analyzes the raw timeline data itself to identify momentum patterns
3. **More Flexible**: AI can consider different momentum interpretations and psychological factors
4. **Cleaner Code**: Application just sends raw facts, not pre-computed insights

✅ **What to Test:**
1. Does the AI correctly identify momentum patterns from the timeline?
2. Does the AI mention psychological factors (confidence, pressure, adaptation)?
3. For simulation mode: Does the AI use momentum as a factor in choosing the winner?
4. Are the narratives still realistic and engaging?


