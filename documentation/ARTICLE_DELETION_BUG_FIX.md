# Critical Article Deletion Bug - Fix Documentation

**Date:** December 16, 2025  
**Severity:** 🔴 CRITICAL  
**Status:** ✅ FIXED  
**Database:** Production (gql-db)

---

## 🚨 The Problem

When publishing an article with 5 images, the following occurred:
1. **Created:** Two temporary articles (`TEMP-{timestamp}` and `TEMP-THUMB-{timestamp}`)
2. **Deleted:** An existing article (wrong article deleted)
3. **Result:** Two temp articles left in database, one legitimate article lost

---

## 🔍 Root Cause Analysis

### Primary Bug: Incorrect Mongoose Method in Resolver

**File:** `server/resolvers/article.resolver.js`  
**Line:** 136

```javascript
// ❌ WRONG - This deletes the wrong article!
deleteArticle: catchAsyncErrors(async(_, { id }) => {
    let deletedArticle = await Articles.findOneAndDelete(id);
    if(!deletedArticle) {
        throw new NotFoundError("Article not found");
    }
    return deletedArticle;
})
```

**The Issue:**
- `findOneAndDelete(id)` expects a **filter object** as the first parameter, not a plain ID string
- When passing just an ID string (e.g., `"67890abc123"`), it's misinterpreted as a filter object
- This causes MongoDB to delete the **wrong article** (unpredictable behavior - could be first in collection, random article, etc.)

**Correct Implementation:**
```javascript
// ✅ CORRECT - Uses findByIdAndDelete
deleteArticle: catchAsyncErrors(async(_, { id }) => {
    let deletedArticle = await Articles.findByIdAndDelete(id);
    if(!deletedArticle) {
        throw new NotFoundError("Article not found");
    }
    return deletedArticle;
})
```

### Secondary Issue: Temporary Articles Not Cleaned Up

**File:** `frontend/src/pages/CreateArticlePage/CreateArticlePage.tsx`

The article creation flow creates TWO temporary articles:

1. **Lines 441-451:** Creates `TEMP-{timestamp}` for uploading content images
   - ❌ Never deleted - left in database
   
2. **Lines 471-498:** Creates `TEMP-THUMB-{timestamp}` for uploading thumbnail
   - ✅ Attempts to delete (lines 490-492)
   - ❌ BUT the deletion bug causes it to delete the wrong article!

---

## 🛠️ The Fix

### 1. Backend Fix: Correct Mongoose Method

**File:** `server/resolvers/article.resolver.js` (Line 136)

```javascript
// Changed from:
let deletedArticle = await Articles.findOneAndDelete(id);

// To:
let deletedArticle = await Articles.findByIdAndDelete(id);
```

### 2. Frontend Fix: Clean Up Content Temp Article

**File:** `frontend/src/pages/CreateArticlePage/CreateArticlePage.tsx`

**Added tracking for content temp article:**
```typescript
// Line 433 - Track the content temp article ID
let contentTempArticleId: string | null = null;

if (contentImages.size > 0 || contentVideos.size > 0) {
    const { data: tempData } = await createArticle({...});
    const uploadArticleId = tempData?.createArticle?.id;
    
    if (uploadArticleId) {
        contentTempArticleId = uploadArticleId; // ✅ Save for cleanup
        finalContent = await uploadContentMediaToS3(uploadArticleId, content);
    }
}
```

**Added cleanup after article creation:**
```typescript
// After article is successfully created (after line 531)
if (contentTempArticleId) {
    try {
        await deleteArticle({
            variables: { id: contentTempArticleId }
        });
        console.log('Content temp article deleted:', contentTempArticleId);
    } catch (deleteError) {
        console.error('Failed to delete content temp article:', deleteError);
        // Don't fail the article creation if deletion fails
    }
}
```

---

## 🧹 Maintenance Scripts

Two maintenance scripts are available:

### Backup Articles
```bash
cd server
npm run backup:articles
```
Creates a backup of all articles with detailed summary.

### Cleanup TEMP Articles
```bash
cd server
npm run cleanup:temp-articles
```
Removes all TEMP and TEMP-THUMB articles from the database.

---

## 📋 Recovery Steps

### Step 1: Fix the Code (✅ DONE)
- ✅ Backend resolver fixed
- ✅ Frontend temp article cleanup added
- ✅ Cleanup script created

### Step 2: Deploy the Fix

**Backend:**
```bash
# Deploy to staging first
./deploy-backend-staging.sh

# Test article creation on staging

# Deploy to production
./deploy-backend-production.sh
```

**Frontend:**
```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase
firebase deploy --only hosting:production
```

### Step 3: Clean Up Production Database

```bash
cd server
npm run fix:article-deletion-bug
```

1. Review the output - it will show:
   - All TEMP articles that exist
   - Recent articles (to help identify what's missing)
   - Recent backups
   
2. Identify the deleted article:
   - Check the most recent backup before the bug occurred
   - Compare with current articles
   - Find the missing article

3. Uncomment the deletion line in the script (line 157):
   ```javascript
   // UNCOMMENT THIS LINE:
   await deleteTempArticles(tempArticles);
   ```

4. Run again to delete TEMP articles:
   ```bash
   npm run fix:article-deletion-bug
   ```

### Step 4: Restore the Deleted Article

**Option A: Manual Restore via MongoDB Compass**
1. Open the backup file (in `backups/` folder)
2. Find the deleted article's data
3. Use MongoDB Compass to insert it back
4. Remove the `_id` field or ensure it's unique

**Option B: Create Restore Script**
```bash
# TODO: Create restore-article.js script if needed
node scripts/restore-article.js --backup=[backup-file] --article-id=[article-id]
```

**Option C: Re-publish the Article**
If you have the original content, simply re-publish it through the UI.

---

## 🔒 Prevention Measures

### Immediate Actions Taken:
1. ✅ Fixed `findOneAndDelete` → `findByIdAndDelete`
2. ✅ Added cleanup for content temp articles
3. ✅ Existing thumbnail temp article cleanup already in place
4. ✅ Created monitoring script

### Recommended Future Improvements:

#### 1. Eliminate Temporary Articles Entirely
Instead of creating temporary articles for S3 uploads:
```typescript
// Generate unique ID without database insertion
const tempId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const mediaUrl = await uploadToS3(tempId, file);
// After article created, move from temp location to final location
await moveS3Object(tempId, articleId);
```

#### 2. Add Monitoring for TEMP Articles
Create a scheduled job to:
- Detect TEMP articles older than 1 hour
- Send alerts
- Auto-cleanup stale temp articles

#### 3. Add Linting/Testing
Create unit tests for resolvers:
```javascript
describe('deleteArticle resolver', () => {
    it('should delete the correct article by ID', async () => {
        const article1 = await Articles.create({...});
        const article2 = await Articles.create({...});
        
        await deleteArticle(article1._id);
        
        expect(await Articles.findById(article1._id)).toBeNull();
        expect(await Articles.findById(article2._id)).toBeDefined();
    });
});
```

#### 4. Add Code Review Checklist
- [ ] Verify Mongoose methods: `findById` vs `findOne`, `findByIdAndDelete` vs `findOneAndDelete`
- [ ] Ensure temp resources are always cleaned up
- [ ] Add error handling for cleanup operations
- [ ] Test deletion operations thoroughly

---

## 📊 Impact Assessment

### What Happened:
- **Date:** December 16, 2025
- **Articles affected:** 
  - ✅ 2 TEMP articles created (pollution)
  - ❌ 1 existing article deleted (data loss)
- **User impact:** Medium - One article lost, two ghost articles visible
- **Data loss:** 1 article (can be restored from backup)

### Why It Happened:
1. **Code bug:** Incorrect Mongoose method in resolver
2. **Missing cleanup:** First temp article never deleted
3. **Lack of testing:** No unit tests for deletion logic
4. **No monitoring:** No alerts for TEMP articles

### Lessons Learned:
1. Always use correct Mongoose methods (`findByIdAndDelete` vs `findOneAndDelete`)
2. Always clean up temporary resources
3. Add unit tests for critical operations (especially deletions!)
4. Monitor for data anomalies
5. Always backup before bulk operations

---

## ✅ Verification Checklist

After deploying the fix, verify:

- [ ] Backend deployed with fix
- [ ] Frontend deployed with fix
- [ ] TEMP articles cleaned up from production
- [ ] Deleted article restored (if needed)
- [ ] Test article creation with multiple images
- [ ] Verify no TEMP articles created
- [ ] Verify correct article is created
- [ ] Check S3 buckets for orphaned files

---

## 📞 Support

If you encounter issues:
1. Check the backup files in `backups/` folder
2. Run the cleanup script with `npm run fix:article-deletion-bug`
3. Review MongoDB logs
4. Check S3 bucket for uploaded files

---

**Status:** ✅ CODE FIXED - AWAITING DEPLOYMENT  
**Next Steps:** Deploy to production and run cleanup script  
**Priority:** 🔴 HIGH - Deploy ASAP to prevent further issues

