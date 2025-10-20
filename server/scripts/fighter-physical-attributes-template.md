# Fighter Physical Attributes Template

This file contains a template for adding physical attributes to fighters in the Amoyan Fighting Championship database.

## Physical Attributes Schema

The following fields are available for each fighter's physical attributes:

- **heightCm**: Height in centimeters (Number)
- **heightFeet**: Height in feet and inches format, e.g., "5'10\"" (String)
- **weightKg**: Weight in kilograms (Number)
- **armReach**: Arm reach in centimeters (Number)
- **legReach**: Leg reach in centimeters (Number)
- **bodyType**: Body type description, e.g., "Athletic", "Stocky", "Lean" (String)
- **koPower**: Knockout power rating (1-10 scale) (Number)
- **durability**: Durability rating (1-10 scale) (Number)
- **strength**: Strength rating (1-10 scale) (Number)
- **endurance**: Endurance rating (1-10 scale) (Number)
- **agility**: Agility rating (1-10 scale) (Number)

## Fighter Data Template

### Fighter 1: Alex Thunder
- **ID**: 507f1f77bcf86cd799439021
- **Name**: Alex Thunder
- **Current Skillset**: Brazilian Jiu-Jitsu, Muay Thai, Wrestling
- **Location**: Los Angeles, United States
- **Birthday**: May 15, 1992 (32 years old)

**Physical Attributes Template:**
```json
{
  "heightCm": 180,
  "heightFeet": "5'11\"",
  "weightKg": 84,
  "armReach": 185,
  "legReach": 110,
  "bodyType": "Athletic",
  "koPower": 7,
  "durability": 8,
  "strength": 8,
  "endurance": 7,
  "agility": 6
}
```

---

### Fighter 2: Marcus Steel
- **ID**: 507f1f77bcf86cd799439022
- **Name**: Marcus Steel
- **Current Skillset**: Boxing, Kickboxing, Judo
- **Location**: London, United Kingdom
- **Birthday**: August 22, 1990 (34 years old)

**Physical Attributes Template:**
```json
{
  "heightCm": 175,
  "heightFeet": "5'9\"",
  "weightKg": 78,
  "armReach": 180,
  "legReach": 105,
  "bodyType": "Stocky",
  "koPower": 9,
  "durability": 7,
  "strength": 7,
  "endurance": 6,
  "agility": 7
}
```

---

## Additional Fighters (if any exist in database)

*Note: Add more fighters here as needed. You can query the database to get all fighter IDs and names.*

---

## Usage Instructions

1. **Copy the JSON template** for each fighter
2. **Fill in the appropriate values** based on the fighter's actual physical attributes
3. **Use the GraphQL mutation** `editFighter` to update each fighter with their physical attributes
4. **Example GraphQL mutation**:
```graphql
mutation EditFighter($id: ID!, $input: FighterInput!) {
  editFighter(id: $id, input: $input) {
    id
    firstName
    lastName
    physicalAttributes {
      heightCm
      heightFeet
      weightKg
      armReach
      legReach
      bodyType
      koPower
      durability
      strength
      endurance
      agility
    }
  }
}
```

## Notes

- All rating fields (koPower, durability, strength, endurance, agility) should be on a scale of 1-10
- Height can be provided in both centimeters and feet/inches format
- Weight should be in kilograms
- Reach measurements should be in centimeters
- Body type should be descriptive (e.g., "Athletic", "Stocky", "Lean", "Muscular", "Slim")

## Sample Values Reference

### Height Conversions
- 5'6" = 168cm
- 5'8" = 173cm
- 5'10" = 178cm
- 6'0" = 183cm
- 6'2" = 188cm

### Weight Classes (approximate)
- Lightweight: 70-77kg
- Welterweight: 77-84kg
- Middleweight: 84-93kg
- Light Heavyweight: 93-102kg
- Heavyweight: 102kg+

### Body Types
- Athletic: Well-proportioned, muscular
- Stocky: Compact, strong build
- Lean: Thin, low body fat
- Muscular: Heavily built, high muscle mass
- Slim: Thin frame, minimal muscle mass
