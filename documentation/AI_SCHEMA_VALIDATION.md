# AI Fight Generation - Schema Validation

## ✅ Comprehensive Schema Validation Implemented

The system now includes **complete schema validation** to ensure AI responses match the MongoDB schema exactly.

## Validation Process

### 1. AI Response Structure

The AI must return this exact structure:

```json
{
  "genAIDescription": "3-4 paragraph fight narrative...",
  "winnerId": "676d6ecceb38b2b97c6da945",
  "fighterStats": [
    {
      "fighterId": "676d6ecceb38b2b97c6da945",
      "stats": {
        "fightTime": 12.5,
        "finishingMove": "Roundhouse kick to the head",
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
      "fighterId": "676d7136eb38b2b97c6da953",
      "stats": {
        "fightTime": 12.5,
        "finishingMove": null,
        ... // Same structure
      }
    }
  ]
}
```

### 2. MongoDB Schema

This maps to the MongoDB schema:

```javascript
fightSchema {
  fighter1: ObjectId,
  fighter2: ObjectId,
  winner: ObjectId,              // from winnerId
  genAIDescription: String,      // from genAIDescription
  userDescription: String,        // separate (user input)
  isSimulated: Boolean,
  fighterStats: [
    {
      fighterId: ObjectId,       // from fighterId
      stats: {
        fightTime: Number,
        finishingMove: String,
        grappling: {
          accuracy: Number,
          defence: Number
        },
        significantStrikes: {
          accuracy: Number,
          attempted: Number,
          defence: Number,
          landed: Number,
          landedPerMinute: Number,
          positions: {
            clinching: Number,
            ground: Number,
            standing: Number
          }
        },
        strikeMap: {
          head: { absorb: Number, strike: Number },
          torso: { absorb: Number, strike: Number },
          leg: { absorb: Number, strike: Number }
        },
        submissions: {
          attemptsPer15Mins: Number,
          average: Number
        },
        takedowns: {
          accuracy: Number,
          attempted: Number,
          avgTakedownsLandedPerMin: Number,
          defence: Number,
          landed: Number
        }
      }
    }
  ]
}
```

## Validation Checks

### Top-Level Validation

✅ **1. Response Structure**
- Must be a valid JSON object
- Must contain all required fields

✅ **2. genAIDescription**
- Required
- Must be a non-empty string
- Should be 3-4 paragraphs

✅ **3. winnerId**
- Required
- Must be a string
- Must match either fighter1Id or fighter2Id

✅ **4. fighterStats Array**
- Required
- Must be an array
- Must contain exactly 2 elements

### Fighter Stats Validation

✅ **5. Fighter IDs**
- Each fighterStats entry must have a fighterId
- fighterId must be a string
- One must be fighter1Id, other must be fighter2Id
- No duplicate IDs

✅ **6. Stats Object**
- Must exist for each fighter
- Must contain all required sub-objects

### Individual Stats Validation

✅ **7. fightTime**
- Must be a number
- Must be greater than 0
- Must be identical for both fighters

✅ **8. finishingMove**
- Winner: Must be a non-null string
- Loser: Must be null
- Winner's move must be a knockout (not submission)

✅ **9. grappling**
- accuracy: Required number
- defence: Required number

✅ **10. significantStrikes**
- accuracy: Required number
- attempted: Required number
- defence: Required number
- landed: Required number
- landedPerMinute: Required number
- positions: Required object with:
  - clinching: Required number
  - ground: Required number
  - standing: Required number

✅ **11. Mathematical Consistency**
- `significantStrikes.landed` = sum of positions (clinching + ground + standing)
- Allows 1 strike tolerance for rounding

✅ **12. strikeMap**
- head: Required object with absorb and strike numbers
- torso: Required object with absorb and strike numbers
- leg: Required object with absorb and strike numbers

✅ **13. submissions**
- attemptsPer15Mins: Required number
- average: Required number

✅ **14. takedowns**
- accuracy: Required number
- attempted: Required number
- avgTakedownsLandedPerMin: Required number
- defence: Required number
- landed: Required number

## Validation Flow

```
1. AI returns JSON response
   ↓
2. Parse JSON
   ↓
3. Run comprehensive validation (40+ checks)
   ↓
4. If validation fails:
   ├─→ Log all errors
   ├─→ Attempt auto-fix
   ├─→ Re-validate
   └─→ If still fails: Throw error with details
   ↓
5. If validation passes:
   └─→ Return valid response for MongoDB
```

## Auto-Fix Features

The system can automatically fix common issues:

### ✅ Auto-Fixable Issues

1. **Incorrect Fighter IDs**
   - Detects if AI used wrong IDs
   - Replaces with correct fighter1Id and fighter2Id

2. **Invalid Winner ID**
   - Checks if winnerId doesn't match either fighter
   - Attempts to determine from finishingMove
   - Falls back to fighter1Id if unclear

3. **Missing Finishing Move (Winner)**
   - Detects if winner has no finishingMove
   - Adds default: "Knockout strike"

4. **Non-null Finishing Move (Loser)**
   - Detects if loser has finishingMove
   - Sets to null

5. **Mismatched Fight Times**
   - Detects if fighters have different fightTimes
   - Averages them and syncs both

### ❌ Non-Fixable Issues

These will cause the request to fail:

1. Missing required fields entirely
2. Wrong data types (string instead of number)
3. Missing nested objects
4. Malformed JSON

## Error Messages

### Example Validation Errors

```javascript
// Missing field
"Missing or invalid 'genAIDescription' field (must be a non-empty string)"

// Wrong winner ID
"winnerId '12345' must be either '676d6ecceb38b2b97c6da945' or '676d7136eb38b2b97c6da953'"

// Wrong array length
"fighterStats must contain exactly 2 fighters, got 1"

// Missing stats
"fighterStats[0].stats.grappling is required and must be an object"

// Mathematical inconsistency
"fighterStats[0].stats.significantStrikes: landed (35) must equal sum of positions (40)"

// Wrong finishing move
"Winner must have a finishingMove"
"Loser must have finishingMove set to null"

// Mismatched fight times
"Both fighters must have same fightTime. Got 12.5 and 15.0"
```

## Server Logs

### Successful Validation
```
Generating simulated fight between Sayali Raut and Jane Doe...
Fight simulated successfully. Winner: 676d6ecceb38b2b97c6da945
```

### Validation with Auto-Fix
```
AI response validation failed: [
  'Winner must have a finishingMove',
  'Both fighters must have same fightTime. Got 12.5 and 15.0'
]
Attempting to auto-fix response...
Syncing fight times: 12.5 and 15.0
Adding default finishing move to winner
Response auto-fixed successfully
Fight simulated successfully. Winner: 676d6ecceb38b2b97c6da945
```

### Validation Failure
```
AI response validation failed: [
  'Missing or invalid "genAIDescription" field',
  'fighterStats[0].stats.grappling is required and must be an object'
]
Attempting to auto-fix response...
Auto-fix failed. Remaining errors: [
  'fighterStats[0].stats.grappling is required and must be an object'
]
Error: AI response validation failed: fighterStats[0].stats.grappling is required and must be an object
```

## Testing Validation

### Test Case 1: Perfect Response
```json
{
  "genAIDescription": "Fight narrative...",
  "winnerId": "676d6ecceb38b2b97c6da945",
  "fighterStats": [...]
}
```
✅ Passes validation immediately

### Test Case 2: Wrong Fighter IDs
```json
{
  "genAIDescription": "Fight narrative...",
  "winnerId": "wrong-id",
  "fighterStats": [
    { "fighterId": "wrong-id-1", ... },
    { "fighterId": "wrong-id-2", ... }
  ]
}
```
⚠️ Fails validation → Auto-fixes → ✅ Passes

### Test Case 3: Missing Grappling Object
```json
{
  "genAIDescription": "Fight narrative...",
  "winnerId": "676d6ecceb38b2b97c6da945",
  "fighterStats": [
    {
      "fighterId": "676d6ecceb38b2b97c6da945",
      "stats": {
        "fightTime": 12.5,
        "finishingMove": "Kick",
        // grappling missing!
        "significantStrikes": {...},
        ...
      }
    }
  ]
}
```
❌ Fails validation → Auto-fix cannot add missing object → ❌ Throws error

## Benefits

### 1. Data Integrity ✅
- Ensures all fight data matches schema
- Prevents invalid data from reaching MongoDB
- Catches AI mistakes early

### 2. Consistency ✅
- Mathematical relationships verified
- Field names correct
- Data types correct

### 3. Reliability ✅
- Auto-fixes common issues
- Clear error messages
- Detailed logging

### 4. Debugging ✅
- Identifies exactly what's wrong
- Shows which fields are invalid
- Helps improve AI prompts

## Files

### Validator Service
**File**: `server/services/openai-fight-validator.js`
- `validateFightResponse()` - Main validation function
- `autoFixResponse()` - Auto-fix common issues
- Helper validation functions for each schema part

### Integration
**File**: `server/services/openai-fight.service.js`
- Imports validator
- Runs validation after AI response
- Attempts auto-fix if validation fails
- Throws detailed error if auto-fix fails

## Summary

✅ **Complete validation** of AI responses
✅ **Matches MongoDB schema** exactly
✅ **40+ validation checks**
✅ **Auto-fixes common issues**
✅ **Clear error messages**
✅ **Detailed logging**

The system now guarantees that only valid, schema-compliant data reaches your MongoDB database! 🚀

