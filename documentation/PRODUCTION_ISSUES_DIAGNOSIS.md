# Production Issues - Diagnosis & Fixes

**Date:** November 27, 2025  
**Database:** gql-db (Production)

---

## 🐛 Issue #1: "Temp-thumb" Articles Being Created

### Problem:
When publishing an article, a "TEMP-THUMB-{timestamp}" article is created and left in the database, appearing in the articles list.

### Root Cause:
**File:** `frontend/src/pages/CreateArticlePage/CreateArticlePage.tsx`  
**Lines:** 470-486

The article creation workflow has a hack:
1. Creates a temporary article to get an article ID
2. Uses that ID to upload thumbnail to S3  
3. Creates the actual article
4. **BUG: Never deletes the temporary article!**

```typescript
// Step 3: Upload thumbnail if exists
let thumbnailUrl = null;
if (thumbnailFile) {
    // Creates TEMP article
    const { data: tempData2 } = await createArticle({
        variables: {
            input: {
                title: `TEMP-THUMB-${Date.now()}`,  // ❌ This stays in DB!
                subtitle: 'Temporary',
                author: author.trim(),
                content: 'Temporary content',
                publishedDate: new Date().toISOString(),
            },
        },
    });
    
    const thumbArticleId = tempData2?.createArticle?.id;
    if (thumbArticleId) {
        thumbnailUrl = await uploadThumbnailToS3(thumbArticleId);
    }
    // ❌ MISSING: Delete the temp article!
}
```

### Solution:
**Option 1 (Recommended):** Don't create a temporary article at all
- Generate a UUID or use timestamp for the S3 path
- Upload directly to `articles/temp-{uuid}/thumbnail/`
- After article is created, move/copy to final location

**Option 2:** Delete the temporary article after upload
- Add `deleteArticle` mutation call after thumbnail upload
- Requires additional mutation and error handling

### Immediate Fix:
Delete existing TEMP-THUMB articles from production database.

---

## 🐛 Issue #2: Season Appearances Showing 2 Instead of 1

### Problem:
For fighters participating in IFL S1, their fighter page shows "Season Appearances: 2" instead of 1.

### Investigation Results:
**Database Check:** All IFL S1 fighters have:
- `numberOfSeasonAppearances: 0` (not updated)
- `competitionHistory` has entries but `seasonNumber: undefined`

**Sample Data:**
```javascript
{
  seasonAppearances: 0,  // ❌ Stored value is 0
  competitionHistory: [
    { competitionId: "67780dcc...", seasonNumber: undefined },  // IFC
    { competitionId: "6778100...", seasonNumber: undefined },  // CC
    { competitionId: "67780e1d...", seasonNumber: undefined }   // IFL
  ]
}
```

### Root Cause - Multiple Issues:

#### 1. **`competitionHistory` Added Without Season Number**
When IFL S1 was created, fighters were added to `competitionHistory` but without `seasonNumber` field.

**File:** Season creation script or mutation  
**Issue:** `competitionHistory` entries created with `seasonNumber: undefined`

#### 2. **`numberOfSeasonAppearances` Never Updated**
The `numberOfSeasonAppearances` field is only updated during fight completion, not during season creation.

**File:** `server/services/fight-result.service.js` lines 178-179, 213-214  
**Logic:** Increments only when first fight in a season is completed

#### 3. **Frontend Calculation Issue**
The frontend is showing "2" but database shows "0" - suggests frontend is calculating from competitionHistory length or summing across competitions incorrectly.

**Possible Calculation:**
- Frontend counts `competitionHistory` entries
- IFL S1 fighters have multiple comp entries (IFC, CC, IFL, IC)
- Frontend might be counting entries instead of unique seasons

### Why It Shows "2" Specifically:
Fighters in IFL S1 have:
- 1-4 entries in `competitionHistory` (from previous seasons)
- Frontend might be calculating: `seasonDetails.length` or similar
- Or summing `numberOfSeasonAppearances` across competitions (all 0) + some other calculation

### Solutions:

#### Solution A: Fix `competitionHistory` Data
1. Update all IFL S1 fighters' competitionHistory to include proper seasonNumber
2. Set `numberOfSeasonAppearances = 1` for IFL competition entry
3. Recalculate total season appearances in fighter resolver

#### Solution B: Fix Season Creation Logic
1. Update season creation to properly initialize competitionHistory
2. Set seasonNumber when adding fighters to a season
3. Initialize `numberOfSeasonAppearances` correctly

#### Solution C: Fix Frontend Calculation
1. Check how frontend calculates season appearances
2. Ensure it's reading from the correct field
3. Fix any incorrect summation logic

---

## 🔧 Recommended Fix Order:

### Priority 1: Issue #1 - Temp Thumb Articles
**Impact:** Medium - Pollutes articles list  
**Difficulty:** Easy  
**Fix:** 
1. Clean up existing TEMP-THUMB articles
2. Modify CreateArticlePage to not create temp articles

### Priority 2: Issue #2 - Season Appearances
**Impact:** High - Incorrect data displayed to users  
**Difficulty:** Medium  
**Fix:**
1. Investigate exact frontend calculation
2. Fix competitionHistory data for IFL S1 fighters
3. Update season creation logic for future seasons

---

## 📋 Next Steps:

1. **For Issue #1:**
   - Delete TEMP-THUMB articles from production
   - Implement proper thumbnail upload without temp articles

2. **For Issue #2:**
   - Check frontend FighterPage component to see calculation
   - Run script to fix IFL S1 fighters' competitionHistory
   - Update season creation mutation to set proper data

---

**Status:** Diagnosed - Awaiting implementation approval

