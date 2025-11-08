# AI-Powered Fight Generation

This feature integrates OpenAI's ChatGPT 4.1 mini model to generate realistic and detailed fight descriptions and statistics for the Amoyan Fighting Championship application.

## Overview

The AI Fight Generation feature allows users to:

1. **Simulate Fights**: Let the AI determine the winner and generate a complete fight description with statistics
2. **Generate Fights with User-Selected Winner**: Provide a winner (and optionally a description), and let the AI expand it into a detailed fight narrative with statistics

## How It Works

### Data Provided to the AI

For both simulation modes, the system provides the following data to the AI:

#### Fighter Statistics
- **Physical Attributes**: Height, weight, arm reach, leg reach, body type, KO power, durability, strength, endurance, agility
- **Skillset**: Martial arts training (e.g., MMA, Muay Thai, BJJ)
- **Fight Statistics**: Total fights, wins, losses, win percentage
- **Detailed Fight Stats**: Grappling accuracy, significant strikes, submissions, takedowns
- **Active Streak**: Current winning or losing streak
- **Recent Performance**: Last 5 performances/streaks

#### Head-to-Head History
- Total fights between the two fighters
- Win/loss record
- Historical fight details

### AI Output

The AI generates:

1. **Fight Description**: A detailed, exciting 4-6 paragraph narrative describing the fight from start to knockout
2. **Fight Statistics**: Realistic statistics for both fighters including:
   - Fight time
   - **Finishing move** (for winner) - Must be a knockout strike (e.g., "Roundhouse kick to the head", "Flying knee to the chin")
   - Grappling stats (accuracy, defense) - Can include grappling during the fight
   - Significant strikes (accuracy, attempted, landed, defense, positions)
   - Strike map (head, torso, leg - both strikes and absorbs)
   - Submissions (attempts, averages) - Submission attempts can occur but cannot be the finishing move
   - Takedowns (accuracy, attempts, landed, defense)

### Fight Constraints

- **Single Round**: All fights are single-round encounters
- **Knockout Only**: The fight MUST end with a knockout strike (no tap-outs or submissions as victory conditions)
  - Valid finishing moves: Roundhouse kick, flying knee, hook, uppercut, spinning back kick, axe kick, etc.
  - Invalid finishing moves: Rear naked choke, arm bar, triangle choke, guillotine, etc.
  - Note: Grappling and submission *attempts* can occur during the fight, but the final victory must be a knockout
- **Two Fighters**: Exactly 2 fighters per fight
- **One Winner**: One fighter must win by knockout strike

## GraphQL API

### Mutations

#### 1. Simulate Fight (AI Chooses Winner)

```graphql
mutation SimulateFight($input: SimulateFightInput!) {
  simulateFight(input: $input) {
    success
    message
    fight {
      winner {
        id
        firstName
        lastName
      }
      genAIDescription
      isSimulated
      fighterStats {
        fighterId
        stats {
          fightTime
          finishingMove
          grappling {
            accuracy
            defence
          }
          significantStrikes {
            accuracy
            attempted
            landed
            defence
            landedPerMinute
            positions {
              clinching
              ground
              standing
            }
          }
          strikeMap {
            head {
              strike
              absorb
            }
            torso {
              strike
              absorb
            }
            leg {
              strike
              absorb
            }
          }
          submissions {
            attemptsPer15Mins
            average
          }
          takedowns {
            accuracy
            attempted
            landed
            defence
            avgTakedownsLandedPerMin
          }
        }
      }
      fightStatus
    }
  }
}
```

**Input Variables:**
```json
{
  "input": {
    "competitionId": "507f1f77bcf86cd799439012",
    "seasonNumber": 9,
    "divisionNumber": 1,
    "roundNumber": 1,
    "fightIndex": 0,
    "fighter1Id": "507f1f77bcf86cd799439021",
    "fighter2Id": "507f1f77bcf86cd799439022",
    "fightDate": "2024-03-15T20:00:00Z"
  }
}
```

#### 2. Generate Fight with Winner (User Selects Winner)

```graphql
mutation GenerateFightWithWinner($input: GenerateFightWithWinnerInput!) {
  generateFightWithWinner(input: $input) {
    success
    message
    fight {
      winner {
        id
        firstName
        lastName
      }
      userDescription
      genAIDescription
      isSimulated
      fighterStats {
        fighterId
        stats {
          # Same structure as above
        }
      }
      fightStatus
    }
  }
}
```

**Input Variables:**
```json
{
  "input": {
    "competitionId": "507f1f77bcf86cd799439012",
    "seasonNumber": 9,
    "divisionNumber": 1,
    "roundNumber": 1,
    "fightIndex": 0,
    "fighter1Id": "507f1f77bcf86cd799439021",
    "fighter2Id": "507f1f77bcf86cd799439022",
    "winnerId": "507f1f77bcf86cd799439021",
    "userDescription": "Fighter 1 dominated with superior striking and landed a knockout roundhouse kick",
    "fightDate": "2024-03-15T20:00:00Z"
  }
}
```

### Input Types

#### SimulateFightInput
```graphql
input SimulateFightInput {
  competitionId: ID!          # ID of the competition
  seasonNumber: Int!          # Season number
  divisionNumber: Int         # Division number (for league)
  roundNumber: Int!           # Round number
  fightIndex: Int!            # Fight index within the round
  fighter1Id: ID!             # ID of first fighter
  fighter2Id: ID!             # ID of second fighter
  fightDate: Date             # Optional fight date
}
```

#### GenerateFightWithWinnerInput
```graphql
input GenerateFightWithWinnerInput {
  competitionId: ID!          # ID of the competition
  seasonNumber: Int!          # Season number
  divisionNumber: Int         # Division number (for league)
  roundNumber: Int!           # Round number
  fightIndex: Int!            # Fight index within the round
  fighter1Id: ID!             # ID of first fighter
  fighter2Id: ID!             # ID of second fighter
  winnerId: ID!               # ID of the winner
  userDescription: String     # Optional user description
  fightDate: Date             # Optional fight date
}
```

## Setup

### 1. Install Dependencies

The OpenAI SDK is already installed via:
```bash
npm install openai
```

### 2. Configure Environment Variables

Add your OpenAI API key to your environment file:

```bash
# .env, .env.staging, or .env.production
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your environment file

## Usage Examples

### Example 1: Simulate a Fight

```javascript
// Frontend React component or API call
const simulateFight = async () => {
  const result = await apolloClient.mutate({
    mutation: SIMULATE_FIGHT_MUTATION,
    variables: {
      input: {
        competitionId: "67780dcc09a4c4b25127f8f6",
        seasonNumber: 6,
        divisionNumber: 1,
        roundNumber: 10,
        fightIndex: 0,
        fighter1Id: "676d6ecceb38b2b97c6da945",
        fighter2Id: "676d7136eb38b2b97c6da953"
      }
    }
  });
  
  console.log('Winner:', result.data.simulateFight.fight.winner.firstName);
  console.log('Description:', result.data.simulateFight.fight.genAIDescription);
};
```

### Example 2: Generate Fight with User-Selected Winner

```javascript
const generateWithWinner = async (winnerId, description) => {
  const result = await apolloClient.mutate({
    mutation: GENERATE_FIGHT_WITH_WINNER_MUTATION,
    variables: {
      input: {
        competitionId: "67780dcc09a4c4b25127f8f6",
        seasonNumber: 6,
        divisionNumber: 1,
        roundNumber: 10,
        fightIndex: 0,
        fighter1Id: "676d6ecceb38b2b97c6da945",
        fighter2Id: "676d7136eb38b2b97c6da953",
        winnerId: winnerId,
        userDescription: description || "Fighter 1 knocked out Fighter 2 with a powerful right hook"
      }
    }
  });
  
  console.log('User Description:', result.data.generateFightWithWinner.fight.userDescription);
  console.log('AI Expanded Description:', result.data.generateFightWithWinner.fight.genAIDescription);
};
```

## Architecture

### Service Layer
**File**: `server/services/openai-fight.service.js`

Contains the core logic for:
- Formatting fighter data for AI consumption
- Generating prompts based on fight mode
- Calling OpenAI API
- Parsing and validating AI responses

### GraphQL Layer
**TypeDefs**: `server/typeDefs/fight-generation.typedef.js`
**Resolvers**: `server/resolvers/fight-generation.resolver.js`

Handles:
- Input validation
- Database queries for fighters and competitions
- Calling the service layer
- Updating fight results in the database
- Returning formatted responses

## Error Handling

The system handles various error scenarios:

1. **Missing API Key**: Returns error if `OPENAI_API_KEY` is not configured
2. **Invalid Fight**: Validates that the fight exists and is in 'pending' status
3. **Fighter Mismatch**: Ensures provided fighter IDs match the scheduled fight
4. **Winner Validation**: For user-selected mode, validates winner is one of the two fighters
5. **API Errors**: Catches and reports OpenAI API errors

## Best Practices

1. **API Key Security**: Never commit your OpenAI API key to version control
2. **Rate Limiting**: Be mindful of OpenAI API rate limits
3. **Cost Management**: Monitor OpenAI API usage and costs
4. **Testing**: Test with various fighter combinations to ensure quality outputs
5. **User Descriptions**: Encourage detailed user descriptions for better AI expansion

## Future Enhancements

Potential improvements:
- Support for Cup competitions
- Multi-round fights
- Different fight styles (submission-only, striking-only)
- Historical fight replay with AI commentary
- Real-time fight simulation with round-by-round updates
- Custom prompt templates for different fight styles

## Troubleshooting

### Issue: "OpenAI API key is not configured"
**Solution**: Ensure `OPENAI_API_KEY` is set in your environment file and the server is restarted

### Issue: Fight generation returns generic descriptions
**Solution**: Check that fighter data is complete with physical attributes, fight stats, and history

### Issue: Statistics don't match description
**Solution**: This should be rare. The AI is prompted to align stats with description. Report if persistent.

### Issue: API timeout errors
**Solution**: OpenAI API may be experiencing high load. Implement retry logic or try again later.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the GraphQL API documentation
3. Examine server logs for detailed error messages
4. Verify your OpenAI API key is valid and has available credits

## License

This feature is part of the Amoyan Fighting Championship application.

