# 📅 Upcoming Fights - Homepage Display

## 📋 Overview

The `getUpcomingFights()` function retrieves the next scheduled fights from all active competitions for display on the homepage. It intelligently determines which fights to show based on competition type (league vs cup) and fighter availability.

---

## 🎯 Purpose

- **Homepage Display**: Show users what fights are coming up next
- **Multi-Competition Support**: Works for leagues (IFL) and cups (IC, CC)
- **Smart Filtering**: Only shows fights that are ready to happen
- **Efficient**: Returns minimal data needed for UI display

---

## 🔄 Logic

### **For League Competitions (IFL):**
1. Get each division (1, 2, 3)
2. For each division, find the **first fight** where `winner === null`
3. Return up to **3 fights** (one per division)

**Example:**
```
IFL Season 1:
- Division 1: Currently on Round 3, Fight 2
  → Next: IFL-S1-D1-R3-F3 (first fight without winner)
  
- Division 2: Currently on Round 2, Fight 5
  → Next: IFL-S1-D2-R2-F6
  
- Division 3: Currently on Round 4, Fight 1
  → Next: IFL-S1-D3-R4-F2
```

### **For Cup Competitions (IC, CC):**
1. Find the **first fight** where:
   - `winner === null` (fight not completed)
   - **AND** `fighter1 !== null` AND `fighter2 !== null` (both fighters determined)
2. Return **1 fight** per cup competition
3. Skip if fights don't exist yet

**Example:**
```
IC Season 5:
✅ R1-F1: Fighter A vs Fighter B (both set) → SHOW
❌ R2-F1: Fighter ? vs Fighter ? (not determined yet) → SKIP

CC Season 3:
❌ R1-F1: Already completed → SKIP
✅ R1-F2: Fighter C vs Fighter D (both set) → SHOW
```

---

## 🛠️ Implementation

### **Function: `getUpcomingFights()`**

**Location:** `/frontend/src/services/fightResultService.ts`

**Signature:**
```typescript
export const getUpcomingFights = (
    competitions: Array<any>
) => Array<{
    fightId: string;
    fightIdentifier: string;
    competitionName: string;
    competitionLogo?: string;
    competitionType: 'league' | 'cup';
    seasonNumber: number;
    divisionNumber?: number;
    divisionName?: string;
    roundNumber?: number;
    roundName?: string;
    fighter1: {
        id: string;
        firstName?: string;
        lastName?: string;
        profileImage?: string;
    };
    fighter2: {
        id: string;
        firstName?: string;
        lastName?: string;
        profileImage?: string;
    };
    date?: string;
}>
```

---

## 📊 Return Data Structure

### **League Fight Example:**
```json
{
  "fightId": "IFL-S1-D1-R3-F2",
  "fightIdentifier": "IFL-S1-D1-R3-F2",
  "competitionName": "International Fighting League",
  "competitionLogo": "competitions/ifl-logo.png",
  "competitionType": "league",
  "seasonNumber": 1,
  "divisionNumber": 1,
  "divisionName": "Championship Division",
  "roundNumber": 3,
  "fighter1": {
    "id": "676d6ecceb38b2b97c6da945"
  },
  "fighter2": {
    "id": "676d7631eb38b2b97c6da9ab"
  },
  "date": "2025-01-15T20:00:00Z"
}
```

### **Cup Fight Example:**
```json
{
  "fightId": "IC-S5-R2-F1",
  "fightIdentifier": "IC-S5-R2-F1",
  "competitionName": "Invicta Cup",
  "competitionLogo": "competitions/ic-logo.png",
  "competitionType": "cup",
  "seasonNumber": 5,
  "roundNumber": 2,
  "roundName": "Semi-finals",
  "fighter1": {
    "id": "676d6ecceb38b2b97c6da945"
  },
  "fighter2": {
    "id": "676d7631eb38b2b97c6da9ab"
  },
  "date": "2025-02-01T20:00:00Z"
}
```

---

## 🖥️ Homepage Implementation

### **Step 1: Query Active Competitions**

```typescript
import { useQuery } from '@apollo/client';
import { GET_ACTIVE_COMPETITIONS } from '../services/queries';
import { getUpcomingFights } from '../services/fightResultService';

// In HomePage component
const { data: competitionsData } = useQuery(GET_ACTIVE_COMPETITIONS);
```

### **Step 2: Get Upcoming Fights**

```typescript
const upcomingFights = React.useMemo(() => {
  if (!competitionsData?.getActiveCompetitions) return [];
  
  return getUpcomingFights(competitionsData.getActiveCompetitions);
}, [competitionsData]);
```

### **Step 3: Query Fighter Data**

```typescript
// Extract unique fighter IDs
const fighterIds = React.useMemo(() => {
  const ids = new Set<string>();
  upcomingFights.forEach(fight => {
    ids.add(fight.fighter1.id);
    ids.add(fight.fighter2.id);
  });
  return Array.from(ids);
}, [upcomingFights]);

// Query fighter details
const { data: fightersData } = useQuery(GET_FIGHTERS_BY_IDS, {
  variables: { ids: fighterIds },
  skip: fighterIds.length === 0
});
```

### **Step 4: Merge Fighter Data**

```typescript
const enrichedFights = React.useMemo(() => {
  if (!fightersData?.getFightersByIds) return upcomingFights;
  
  return upcomingFights.map(fight => ({
    ...fight,
    fighter1: fightersData.getFightersByIds.find(f => f.id === fight.fighter1.id) || fight.fighter1,
    fighter2: fightersData.getFightersByIds.find(f => f.id === fight.fighter2.id) || fight.fighter2
  }));
}, [upcomingFights, fightersData]);
```

### **Step 5: Render UI**

```tsx
<div className="upcoming-fights-section">
  <h2>Upcoming Fights</h2>
  
  <div className="fights-grid">
    {enrichedFights.map(fight => (
      <Link 
        to={`/fight/${fight.fightId}`} 
        key={fight.fightId}
        className="fight-card"
      >
        {/* Competition Name + Season */}
        <div className="fight-header">
          {fight.competitionLogo && (
            <img src={fight.competitionLogo} alt={fight.competitionName} />
          )}
          <span>{fight.competitionName} S{fight.seasonNumber}</span>
        </div>

        {/* Fighter Thumbnails */}
        <div className="fighters">
          <div className="fighter">
            <S3Image
              s3Key={fight.fighter1.profileImage}
              alt={`${fight.fighter1.firstName} ${fight.fighter1.lastName}`}
              className="fighter-thumbnail"
            />
            <span className="fighter-name">
              {fight.fighter1.firstName} {fight.fighter1.lastName}
            </span>
          </div>

          <div className="vs-divider">VS</div>

          <div className="fighter">
            <S3Image
              s3Key={fight.fighter2.profileImage}
              alt={`${fight.fighter2.firstName} ${fight.fighter2.lastName}`}
              className="fighter-thumbnail"
            />
            <span className="fighter-name">
              {fight.fighter2.firstName} {fight.fighter2.lastName}
            </span>
          </div>
        </div>

        {/* Division/Round Info */}
        <div className="fight-footer">
          {fight.competitionType === 'league' ? (
            <span>Division {fight.divisionNumber} - Round {fight.roundNumber}</span>
          ) : (
            <span>{fight.roundName}</span>
          )}
        </div>
      </Link>
    ))}
  </div>
</div>
```

---

## 🎨 UI Display Format

### **Card Layout:**

```
┌─────────────────────────────────┐
│  [Logo] IFL Season 1            │  ← Competition Name + Season
├─────────────────────────────────┤
│                                  │
│   [Thumbnail]    VS   [Thumbnail]│  ← Fighter Images
│   Sayali Raut         Marina Silva│  ← Fighter Names
│                                  │
├─────────────────────────────────┤
│   Division 1 - Round 3           │  ← Division + Round (League)
│   OR                             │
│   Semi-finals                    │  ← Round Name (Cup)
└─────────────────────────────────┘
```

---

## 📝 Console Output Example

```
📅 Getting Upcoming Fights...
   🥊 International Fighting League S1 D1: IFL-S1-D1-R3-F2
   🥊 International Fighting League S1 D2: IFL-S1-D2-R2-F5
   🥊 International Fighting League S1 D3: IFL-S1-D3-R4-F1
   🏆 Invicta Cup S5: IC-S5-R2-F1 (Semi-finals)
   🏆 Champions Cup S3: CC-S3-R1-F3 (Quarter-finals)
✅ Found 5 upcoming fight(s)
```

---

## ⚙️ GraphQL Queries Needed

### **1. Get Active Competitions**
```graphql
query GetActiveCompetitions {
  getActiveCompetitions {
    id
    competitionMetaId
    isActive
    competitionMeta {
      competitionName
      logo
    }
    seasonMeta {
      seasonNumber
    }
    leagueData {
      divisions {
        divisionNumber
        divisionName
        rounds {
          roundNumber
          fights {
            fightIdentifier
            fighter1
            fighter2
            winner
            date
          }
        }
      }
    }
    cupData {
      currentStage
      fights {
        fightIdentifier
        fighter1
        fighter2
        winner
        date
      }
    }
  }
}
```

### **2. Get Fighters By IDs**
```graphql
query GetFightersByIds($ids: [ID!]!) {
  getFightersByIds(ids: $ids) {
    id
    firstName
    lastName
    profileImage
  }
}
```

---

## 🔄 Real-Time Updates

### **Automatic Refresh After Fight Result:**
```typescript
// After fight result is saved
const { refetch: refetchCompetitions } = useQuery(GET_ACTIVE_COMPETITIONS);

const handleFightResultSaved = () => {
  // Refetch competitions to get updated upcoming fights
  refetchCompetitions();
};
```

---

## 🎯 Edge Cases Handled

### **1. No Upcoming Fights**
```typescript
if (upcomingFights.length === 0) {
  return <div>No upcoming fights scheduled</div>;
}
```

### **2. Season Completed**
```typescript
// Function automatically skips inactive competitions
// Returns empty array if all seasons are complete
```

### **3. Cup Fighters Not Determined**
```typescript
// IC R2-F1: Fighter ? vs Fighter ?
// Function skips this fight until both fighters are set
```

### **4. Multiple Active Seasons**
```typescript
// Returns fights from ALL active competitions
// Example: IFL S1 (3 fights) + IC S5 (1 fight) + CC S3 (1 fight) = 5 total
```

---

## 🧪 Testing

### **Test Cases:**

1. **League with 3 divisions:**
   - ✅ Returns 3 fights (one per division)
   - ✅ Each fight has no winner
   - ✅ Correct division and round numbers

2. **Cup with scheduled fights:**
   - ✅ Returns 1 fight
   - ✅ Both fighters are determined
   - ✅ Correct round name (Quarter-finals, Semi-finals, Finals)

3. **Cup with incomplete bracket:**
   - ✅ Skips fights where fighters are TBD
   - ✅ Only shows ready-to-fight matchups

4. **Mixed competitions:**
   - ✅ Returns fights from IFL + IC + CC
   - ✅ Correct total count

5. **No active competitions:**
   - ✅ Returns empty array
   - ✅ No errors

---

## 📚 Related Documentation

- **FIGHT_RESULT_SERVICE_README.md** - Full service documentation
- **FightPage.tsx** - Individual fight display
- **HomePage Component** - Where upcoming fights are displayed

---

**Last Updated:** November 2, 2025  
**Version:** 1.0.0  
**Status:** ✅ Implemented (UI integration pending)

