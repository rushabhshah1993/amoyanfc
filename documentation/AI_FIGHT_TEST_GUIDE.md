# AI Fight Generation - Quick Test Guide

This guide will help you test the AI fight generation feature in 5 minutes.

## Prerequisites
- ✅ Server is running (`npm run dev`)
- ✅ OpenAI API key is configured in `.env`
- ✅ You have a competition with scheduled (pending) fights

## Step 1: Open GraphQL Playground

1. Navigate to: http://localhost:4000/graphql
2. You should see the GraphQL Playground interface

## Step 2: Test Fight Simulation (AI Chooses Winner)

Copy and paste this mutation into the left panel:

```graphql
mutation TestSimulateFight {
  simulateFight(input: {
    competitionId: "67780dcc09a4c4b25127f8f6"
    seasonNumber: 6
    divisionNumber: 1
    roundNumber: 10
    fightIndex: 0
    fighter1Id: "676d6ecceb38b2b97c6da945"
    fighter2Id: "676d7136eb38b2b97c6da953"
  }) {
    success
    message
    fight {
      _id
      fighter1 {
        id
        firstName
        lastName
      }
      fighter2 {
        id
        firstName
        lastName
      }
      winner {
        id
        firstName
        lastName
      }
      fightIdentifier
      date
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

**Note**: Replace the IDs with actual IDs from your database:
- `competitionId`: ID of your competition
- `fighter1Id` and `fighter2Id`: IDs of the two fighters in a scheduled fight

Click the Play button (▶️) to execute the mutation.

### Expected Result:
```json
{
  "data": {
    "simulateFight": {
      "success": true,
      "message": "Fight simulated successfully",
      "fight": {
        "_id": "...",
        "winner": {
          "firstName": "...",
          "lastName": "..."
        },
        "genAIDescription": "An exciting 4-6 paragraph fight description...",
        "isSimulated": true,
        "fighterStats": [...]
      }
    }
  }
}
```

## Step 3: Test User-Selected Winner

Now test the second mode where you choose the winner:

```graphql
mutation TestGenerateWithWinner {
  generateFightWithWinner(input: {
    competitionId: "67780dcc09a4c4b25127f8f6"
    seasonNumber: 6
    divisionNumber: 1
    roundNumber: 10
    fightIndex: 1
    fighter1Id: "676d6ecceb38b2b97c6da945"
    fighter2Id: "676d7136eb38b2b97c6da953"
    winnerId: "676d6ecceb38b2b97c6da945"
    userDescription: "In an intense battle, Fighter 1 used superior leg strength to land devastating kicks. Fighter 2 tried to take the fight to the ground but Fighter 1's takedown defense was excellent. In the final moments, Fighter 1 landed a perfect roundhouse kick to the head, knocking out Fighter 2."
  }) {
    success
    message
    fight {
      _id
      fighter1 {
        firstName
        lastName
      }
      fighter2 {
        firstName
        lastName
      }
      winner {
        firstName
        lastName
      }
      userDescription
      genAIDescription
      isSimulated
      fighterStats {
        fighterId
        stats {
          fightTime
          finishingMove
          significantStrikes {
            accuracy
            attempted
            landed
          }
          takedowns {
            accuracy
            attempted
            landed
          }
        }
      }
      fightStatus
    }
  }
}
```

**Note**: 
- The `winnerId` must be either `fighter1Id` or `fighter2Id`
- The `userDescription` is optional - leave it out to let AI create the entire description

### Expected Result:
```json
{
  "data": {
    "generateFightWithWinner": {
      "success": true,
      "message": "Fight generated successfully",
      "fight": {
        "winner": {
          "firstName": "...",
          "lastName": "..."
        },
        "userDescription": "Your provided description...",
        "genAIDescription": "AI expanded description based on your input...",
        "isSimulated": false
      }
    }
  }
}
```

## Step 4: Verify in Database

Check that the fight was updated in MongoDB:

```javascript
// In MongoDB Compass or mongosh
db.competitions.findOne(
  { "_id": ObjectId("67780dcc09a4c4b25127f8f6") },
  { "leagueData.divisions.rounds.fights": 1 }
)
```

Look for:
- ✅ `fightStatus` changed to "completed"
- ✅ `winner` is set
- ✅ `genAIDescription` is populated
- ✅ `fighterStats` array has two objects
- ✅ `isSimulated` is true/false appropriately

## Step 5: Get Fighter IDs for Your Database

If you need to find fighter IDs in your database:

```graphql
query GetFighters {
  getAllFighters {
    id
    firstName
    lastName
  }
}
```

Or get fighters in a specific competition:

```graphql
query GetCompetition {
  getCompetition(id: "your-competition-id") {
    seasonMeta {
      leagueDivisions {
        divisionNumber
        fighters
      }
    }
  }
}
```

## Troubleshooting

### Error: "OpenAI API key is not configured"
**Solution**: 
1. Check your `.env` file has `OPENAI_API_KEY=sk-...`
2. Restart the server: `npm run dev`

### Error: "Competition not found"
**Solution**: 
1. Use the query above to get valid competition IDs
2. Make sure you're using the correct environment (dev/staging/production)

### Error: "Fight has already been completed"
**Solution**: 
1. The fight you're trying to generate has already been completed
2. Use a different fight with `fightStatus: "pending"`
3. Or manually reset the fight status in the database

### Error: "Winner must be one of the two fighters"
**Solution**: 
1. Make sure `winnerId` matches either `fighter1Id` or `fighter2Id` exactly
2. Check for typos in the IDs

### Error: "Fighter IDs do not match the scheduled fight"
**Solution**: 
1. The fighters you specified don't match what's in the database
2. Query the competition to see the actual fighter IDs for that fight

### No description generated / Generic descriptions
**Solution**:
1. Ensure fighters have complete data (physical attributes, fight stats, history)
2. Try with fighters that have more fight history
3. Check server logs for any API errors

## Testing Tips

1. **Start Simple**: Test simulation mode first with well-established fighters
2. **Try Different Descriptions**: Test user-selected mode with varying description lengths
3. **Check Console**: Watch the server console for logs about the generation process
4. **Monitor Stats**: Verify that generated statistics make sense with the description
5. **Test Edge Cases**: Try with fighters who have never fought, or fighters with extreme stats

## Quick Reference: Find Your Data

### Get Competition ID
```graphql
query {
  getAllCompetitions {
    id
    competitionMeta {
      competitionName
    }
    seasonMeta {
      seasonNumber
    }
  }
}
```

### Get Scheduled Fights
```graphql
query {
  getCompetition(id: "your-competition-id") {
    leagueData {
      divisions {
        divisionNumber
        rounds {
          roundNumber
          fights {
            fighter1 { id firstName lastName }
            fighter2 { id firstName lastName }
            fightStatus
            fightIdentifier
          }
        }
      }
    }
  }
}
```

## Success Indicators

✅ **Successful simulation:**
- Returns `success: true`
- Has a `winner` object
- Has a detailed `genAIDescription`
- Has `fighterStats` array with two fighter stats
- `fightStatus` is "completed"
- Server logs show: "Fight simulated successfully"

✅ **Successful user-selected generation:**
- Returns `success: true`
- Winner matches your `winnerId`
- Has both `userDescription` and `genAIDescription`
- `isSimulated` is false
- Statistics align with the description

## What to Look For in Results

### Good Fight Description
- ✅ 4-6 paragraphs long
- ✅ Mentions specific techniques (roundhouse kick, rear naked choke, etc.)
- ✅ Shows progression of the fight
- ✅ Ends with a knockout
- ✅ Feels realistic and exciting

### Good Fight Statistics
- ✅ Winner has a `finishingMove`
- ✅ Loser has `finishingMove: null`
- ✅ Strike numbers seem reasonable (e.g., 20-50 strikes landed)
- ✅ Both fighters have the same `fightTime`
- ✅ Statistics reflect the fight description

## Next Steps

Once testing is successful:
1. Integrate the mutations into your React frontend
2. Create UI components for fight generation
3. Add the feature to your competition/season views
4. Test with real users
5. Monitor OpenAI API costs

## Questions?

- See [AI_FIGHT_GENERATION.md](./AI_FIGHT_GENERATION.md) for detailed documentation
- See [AI_FIGHT_GENERATION_EXAMPLES.md](./AI_FIGHT_GENERATION_EXAMPLES.md) for React examples
- Check server logs for detailed error messages

---

**Happy Testing! 🧪🥊**

