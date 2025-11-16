# 🔧 IC/CC Duplicate Prevention Fix

## 📋 Summary

This document describes the fix implemented to prevent duplicate IC (Invicta Cup) and CC (Champions Cup) seasons from being created for the same league season.

**Date:** November 16, 2025  
**Issue:** IC S6 was created as a duplicate when IC S5 already existed for the same league season.

---

## 🐛 Root Cause

### Schema Mismatch Bug

The `linkedLeagueSeason` schema in `competition.model.js` had a mismatch between the defined fields and what the code was using:

**Schema defined (BEFORE):**
```javascript
const linkedLeagueSeasonSchema = new Schema({
    competition: { type: Schema.Types.ObjectId, ref: 'CompetitionMeta' },
    season: { type: Schema.Types.ObjectId, ref: 'Season' }
})
```

**Code was using:**
```javascript
linkedLeagueSeason: {
    competitionId: competition._id,  // ❌ Field name mismatch
    seasonNumber: competition.seasonMeta.seasonNumber  // ❌ Field name mismatch
}
```

This mismatch caused:
1. `linkedLeagueSeason` data to not save properly
2. Duplicate check queries to fail
3. Multiple IC/CC seasons to be created for the same league season

---

## ✅ Solutions Implemented

### 1. Fixed Schema Definition

**File:** `server/models/competition.model.js`

**Changed:**
```javascript
const linkedLeagueSeasonSchema = new Schema({
    competitionId: { type: Schema.Types.ObjectId, ref: 'Competition' },
    seasonNumber: { type: Number }
})
```

**Benefits:**
- Schema now matches code usage
- `linkedLeagueSeason` data saves correctly
- Duplicate checks work as intended

---

### 2. Added Active Season Check for IC

**File:** `server/services/fight-result.service.js` (lines 909-919)

**Added validation:**
```javascript
// 3. Check if there's already an active IC season
const activeICSeasons = await Competition.find({
    competitionMetaId: icMeta._id,
    isActive: true
}).session(session);

if (activeICSeasons.length > 0) {
    console.log('   ⏭️  Skipping: An active IC season already exists');
    console.log(`      Active IC: ${activeICSeasons[0]._id} (S${activeICSeasons[0].seasonMeta.seasonNumber})`);
    return;
}
```

**Benefits:**
- Prevents creating a new IC season if one is already active
- Extra safety layer beyond `linkedLeagueSeason` check
- Works even if `linkedLeagueSeason` is null

---

### 3. Added Active Season Check for CC

**File:** `server/services/fight-result.service.js` (lines 1111-1121)

**Added validation:**
```javascript
// 3. Check if there's already an active CC season
const activeCCSeasons = await Competition.find({
    competitionMetaId: ccMeta._id,
    isActive: true
}).session(session);

if (activeCCSeasons.length > 0) {
    console.log('   ⏭️  Skipping: An active CC season already exists');
    console.log(`      Active CC: ${activeCCSeasons[0]._id} (S${activeCCSeasons[0].seasonNumber})`);
    return;
}
```

**Benefits:**
- Same protection for CC season creation
- Prevents duplicate CC seasons
- Consistent with IC logic

---

### 4. Database Cleanup (One-Time Scripts - Already Executed)

#### Script 1: Delete IC S6
**Purpose:** Removed the duplicate IC S6 season from the database

**Results:**
- ✅ IC S6 deleted successfully from staging
- ✅ Verified deletion
- ✅ Listed remaining IC seasons (S1-S5)

**Note:** This was a one-time cleanup script. It has been executed and removed from the codebase.

---

#### Script 2: Fix IC S5 Linking
**Purpose:** Linked IC S5 to the active IFL (Invictus Fight League) season

**Results:**
- ✅ IC S5 now linked to IFL S1
- ✅ `linkedLeagueSeason.competitionId`: IFL S1 ID
- ✅ `linkedLeagueSeason.seasonNumber`: 1

**Note:** This was a one-time cleanup script. It has been executed and removed from the codebase.

**Additional Note:** IC S1-S4 don't have `linkedLeagueSeason` set because they're from old IFC (Invictus Fighting Championship) seasons before IFL existed.

---

## 🔒 Prevention Logic

### Two-Layer Protection

Both IC and CC creation now have **two checks** to prevent duplicates:

#### Layer 1: LinkedLeagueSeason Check
```javascript
const existingSeasons = await Competition.find({
    'linkedLeagueSeason.competitionId': competition._id,
    'linkedLeagueSeason.seasonNumber': competition.seasonMeta.seasonNumber
}).session(session);

if (existingSeasons.length > 0) {
    console.log('   ⏭️  Skipping: Season already exists for this league season');
    return;
}
```

#### Layer 2: Active Season Check
```javascript
const activeSeasons = await Competition.find({
    competitionMetaId: cupMeta._id,
    isActive: true
}).session(session);

if (activeSeasons.length > 0) {
    console.log('   ⏭️  Skipping: An active season already exists');
    return;
}
```

---

## 🎯 When IC/CC Are Created

### IC (Invicta Cup)
- **Trigger:** Exactly 25% league completion (±0.5% tolerance)
- **Participants:** 8 fighters (1 previous champion + 7 from league)
- **linkedLeagueSeason:** Set to current league competition + season number

### CC (Champions Cup)
- **Trigger:** 100% league completion (all fights completed)
- **Participants:** 8 fighters (top 3 from Div 1, top 3 from Div 2, top 2 from Div 3)
- **linkedLeagueSeason:** Set to current league competition + season number

---

## 📊 Database State After Fix

### IC Seasons Status
| Season | Status | Linked To | Notes |
|--------|--------|-----------|-------|
| IC S1  | Active | None | Old IFC season |
| IC S2  | Active | None | Old IFC season |
| IC S3  | Active | None | Old IFC season |
| IC S4  | Active | None | Old IFC season |
| IC S5  | Active | IFL S1 | ✅ Fixed |
| IC S6  | ❌ Deleted | - | Duplicate removed |

---

## ✨ Testing Recommendations

1. **Test IC creation at 25% mark:**
   - Complete fights until exactly 25% done
   - Verify IC season is created
   - Try to trigger again → Should skip with "active season exists" message

2. **Test CC creation at 100% completion:**
   - Complete all league fights
   - Verify CC season is created
   - Try to trigger again → Should skip with "active season exists" message

3. **Verify linkedLeagueSeason:**
   - Check new IC/CC seasons have correct `linkedLeagueSeason.competitionId`
   - Check new IC/CC seasons have correct `linkedLeagueSeason.seasonNumber`

---

## 🔍 Key Files Modified (Committed to Repo)

1. ✅ `server/models/competition.model.js` - Schema fix
2. ✅ `server/services/fight-result.service.js` - IC creation logic (lines 898-919)
3. ✅ `server/services/fight-result.service.js` - CC creation logic (lines 1100-1121)
4. ✅ `server/resolvers/competition.resolver.js` - Fixed linkedLeagueSeason resolver
5. ✅ `documentation/IC_CC_DUPLICATE_PREVENTION_FIX.md` - This documentation

**Note:** One-time cleanup scripts (`delete-ic-s6.js` and `fix-ic-s5-linking.js`) were executed and removed from the codebase as they were only needed for the initial database cleanup.

---

## 🐛 Additional Fix: Resolver Issue

### Problem
After fixing the schema, when opening IC S5, the frontend showed:
```json
{
    "message": "Linked competition not found",
    "code": "INTERNAL_SERVER_ERROR",
    "details": null
}
```

### Root Cause
The `CompetitionLinkedLeagueSeason` resolver was trying to find `CompetitionMeta` directly by `competitionId`, but `competitionId` is actually a reference to a `Competition` (season) document, not `CompetitionMeta`.

### Solution
**File:** `server/resolvers/competition.resolver.js`

**Fixed the resolver:**
```javascript
CompetitionLinkedLeagueSeason: {
    competition: async(parent) => {
        const competitionId = parent.competitionId;
        if (!competitionId) return null;
        
        // competitionId references Competition (season)
        const competition = await Competition.findById(competitionId);
        if (!competition) throw new NotFoundError('Linked competition not found');
        
        // Get the CompetitionMeta from the Competition
        const competitionMeta = await CompetitionMeta.findById(competition.competitionMetaId);
        if (!competitionMeta) throw new NotFoundError('Competition meta not found');
        
        return competitionMeta;
    },
    season: async(parent) => {
        const competitionId = parent.competitionId;
        if (!competitionId) return null;
        
        const competition = await Competition.findById(competitionId);
        if (!competition) throw new NotFoundError('Linked season not found');
        
        return {
            id: competition._id,
            seasonNumber: competition.seasonMeta.seasonNumber,
            leagueDivisions: competition.seasonMeta.leagueDivisions
        };
    }
}
```

**Now the resolver:**
1. Finds the `Competition` (season) by `competitionId`
2. Gets its `CompetitionMeta` using `competition.competitionMetaId`
3. Returns the correct data structure

---

## 🎉 Results

- ✅ Schema mismatch fixed
- ✅ Duplicate IC S6 deleted
- ✅ IC S5 linked to IFL S1
- ✅ Two-layer duplicate prevention added
- ✅ Both IC and CC protected from duplicates
- ✅ Future IC/CC seasons will link properly to league seasons

---

## 📝 Notes

- Scripts use `.env.staging` for MongoDB Atlas connection
- Both scripts require `dotenv` to load environment variables
- The fix applies to both staging and production (when deployed)
- Old IC seasons (S1-S4) don't need `linkedLeagueSeason` as they're from IFC era

