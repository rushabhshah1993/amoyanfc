# Fight Service - Reference Documentation

## ⚠️ Important Note

**The files in this directory related to fight result processing are kept for REFERENCE ONLY.**

## What Changed?

### Before (Frontend Approach)
```
User Action → Frontend prepares complete payload → Backend saves to MongoDB
                ↑
        prepareFightResultPayload()
        (All 8 steps done in frontend)
```

### After (Backend Approach - Current)
```
User Action → Frontend calls mutation → Backend does EVERYTHING → MongoDB
                                            ↑
                                    fight-result.service.js
                                    (All 8 steps + transaction)
```

## Why Keep Reference Files?

1. **Documentation** - Shows the complete fight result data structure
2. **Debugging** - Helpful when comparing frontend expectations vs backend output
3. **Learning** - Useful for new developers to understand the flow
4. **Testing** - Can reference expected data shapes for test cases

## Active Files (Use These)

### Frontend
- `frontend/src/services/queries.ts` - GraphQL mutations
  - `SIMULATE_FIGHT` - AI determines winner
  - `GENERATE_FIGHT_WITH_WINNER` - User chooses winner
- `frontend/src/pages/FightPage/FightPage.tsx` - UI and mutation calls

### Backend
- `server/services/fight-result.service.js` - **ACTIVE IMPLEMENTATION**
  - All 8 MongoDB update steps
  - Transaction management
  - IC/CC season creation
  - Round standings calculation
  - Cup bracket progression

## Documentation Files

- `FIGHT_RESULT_SERVICE_README.md` - Detailed service documentation
- `BACKEND_FIGHT_RESULT_IMPLEMENTATION.md` - Backend implementation guide
- `AI_FIGHT_GENERATION.md` - AI fight generation flow
- `SEASON_COMPLETION_CHECK.md` - Season lifecycle documentation
- `CUP_BRACKET_PROGRESSION.md` - Cup tournament logic

## Reference Files (Do Not Use in Production)

- `fightService.REFERENCE.ts` - Original frontend payload preparation logic
  - **Status:** Kept for reference only
  - **Replaced by:** `server/services/fight-result.service.js`
  - **Last used:** Before November 8, 2025

## Migration History

**November 8, 2025:**
- ✅ Moved all fight result processing to backend
- ✅ Implemented all 8 MongoDB update steps on backend
- ✅ Added IC/CC season creation (25% and 100% completion)
- ✅ Frontend now only calls GraphQL mutations
- ✅ Moved old frontend logic to reference files

---

**If you need to modify fight result processing, edit:**
`server/services/fight-result.service.js`

**If you need to call fight generation from frontend, use:**
```typescript
import { SIMULATE_FIGHT, GENERATE_FIGHT_WITH_WINNER } from '../../services/queries';

const [simulateFight] = useMutation(SIMULATE_FIGHT);
const [generateFightWithWinner] = useMutation(GENERATE_FIGHT_WITH_WINNER);
```

