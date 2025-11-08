# OpenAI Playground Prompts - WITH ENHANCED HEAD-TO-HEAD TIMELINE

## System Prompt (Same for Both Modes)

Use the same system prompt I provided earlier. It now includes:
```
- Consider the head-to-head timeline and recent momentum (if provided) - this is psychologically crucial
```

---

## 📋 User Prompt V1: SIMULATION MODE (AI Chooses Winner)

### WITH HEAD-TO-HEAD TIMELINE & MOMENTUM

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
  "recentMomentum": "Jane Smith has won the last 3 fight(s)",
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

INSTRUCTIONS:
Based on all this data, follow this process:
1. Analyze both fighters' strengths and weaknesses
2. Consider their physical attributes, skills, and recent performances
3. IMPORTANT: Consider the head-to-head timeline and momentum - Jane Smith has won the last 3 fights against Sayali, giving her a significant psychological advantage
4. Determine a realistic winner based on ALL factors including this recent dominance
5. Generate a detailed, exciting fight description (3-4 paragraphs) that culminates in a knockout
6. Go through your fight description sentence-by-sentence
7. For each sentence, identify the specific actions (strikes, takedowns, positions) and which fighter performed them
8. Generate accurate statistics for both fighters based on this sentence-by-sentence analysis
9. Use the fighter IDs (676d6ecceb38b2b97c6da945 and 676d7136eb38b2b97c6da953) in your JSON response for "winnerId" and "fighterId" fields
10. Use the fighter names (Sayali Raut and Jane Smith) naturally in the narrative text

Remember: This MUST end in a knockout. Return the response as a valid JSON object with "genAIDescription", "winnerId", and "fighterStats".
```

---

## 📋 User Prompt V2: USER-SELECTED WINNER

### WITH HEAD-TO-HEAD TIMELINE (Breaking the Streak)

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
  "recentMomentum": "Jane Smith has won the last 3 fight(s)",
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

Generate a detailed, exciting fight description (3-4 paragraphs) where Sayali Raut defeats Jane Smith by knockout. The description should:
- Acknowledge that Jane Smith has won the last 3 fights against Sayali, giving Jane psychological confidence
- Create a compelling narrative of Sayali breaking this losing streak
- Show Sayali overcoming the mental pressure and adapting her strategy
- Be consistent with both fighters' attributes, skills, and statistics
- Show a realistic progression of the fight
- Highlight the key moment where Sayali turns the tide
- End with a dramatic knockout by Sayali Raut

INSTRUCTIONS FOR STATISTICS:
1. After generating the fight description, go through it sentence-by-sentence
2. For each sentence, identify specific actions: strikes thrown, strikes landed, takedowns, positions, etc.
3. Track which fighter performed each action
4. Accumulate statistics based on what actually happened in your narrative
5. Ensure stats are realistic and mathematically consistent
6. Use the fighter IDs (676d6ecceb38b2b97c6da945 and 676d7136eb38b2b97c6da953) in your JSON response for "winnerId" and "fighterId" fields
7. Use the fighter names (Sayali Raut and Jane Smith) in the narrative text

Return the response as a valid JSON object with "genAIDescription", "winnerId" (must be 676d6ecceb38b2b97c6da945), and "fighterStats".
```

---

## 📊 Test Scenarios

### Scenario 1: Momentum Continuation
- Jane has won last 3 fights
- AI simulation likely picks Jane (momentum)
- Narrative acknowledges Jane's recent dominance

### Scenario 2: Breaking the Streak
- Jane has won last 3 fights
- User picks Sayali as winner
- AI creates underdog/redemption story
- Narrative shows Sayali's adaptation

### Scenario 3: No History
```json
"recentMomentum": "No previous fights",
"timeline": []
```
- AI weighs physical attributes and current form more

### Scenario 4: Back-and-Forth
```json
"recentMomentum": "Recent fights split: Sayali won 2, Jane won 1",
"timeline": [...alternating winners...]
```
- Competitive matchup
- Could go either way

## 🎯 What to Look For

When the AI responds, check:

1. ✅ **Momentum Acknowledgment**: Does the narrative mention the 3-fight streak?
2. ✅ **Psychological Elements**: Confidence for Jane, pressure for Sayali?
3. ✅ **Strategic Adaptation**: Does the winner show they learned from past fights?
4. ✅ **Realistic Choice**: In simulation, does momentum influence the winner?
5. ✅ **Compelling Story**: Is the underdog victory (if Sayali wins) well-justified?

## 💡 Expected AI Behavior

### With Momentum Data:
```
"The fight began with palpable tension. Jane Smith entered confidently, 
having defeated Sayali Raut in their last three encounters. Sayali, 
however, appeared determined to break this pattern, immediately pressing 
forward with aggressive strikes..."
```

### Without Momentum Data:
```
"The fight began with both fighters circling cautiously, each respecting 
the other's capabilities..."
```

## 📈 Benefits

✅ **More realistic outcomes** based on psychological factors
✅ **Better narratives** with historical context
✅ **Compelling underdog stories** when breaking streaks
✅ **Data-driven decisions** considering momentum

---

**Use these enhanced prompts to test how the AI responds to momentum and timeline data!** 🚀

