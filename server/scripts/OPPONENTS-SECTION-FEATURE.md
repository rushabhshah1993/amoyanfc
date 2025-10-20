# Opponents Section Feature

## Overview

Added a new "League Opponents" section to the Fighter Page that displays thumbnails of all fighters in the league. Fighters that have been faced are shown as active/clickable with their fight statistics, while fighters that haven't been faced yet are shown as disabled/grayed out.

## What Was Implemented

### 1. GraphQL Query Update

**File**: `frontend/src/services/queries.ts`

Updated `GET_FIGHTER_INFORMATION` query to include `opponentsHistory` data:

```graphql
opponentsHistory {
    opponentId
    totalFights
    totalWins
    totalLosses
    winPercentage
}
```

### 2. Fighter Page Component

**File**: `frontend/src/pages/FighterPage/FighterPage.tsx`

**New Features**:
- Added query to fetch all fighters using `GET_ALL_FIGHTERS`
- Added `OpponentHistory` interface for type safety
- Logic to categorize fighters into "fought" vs "not fought"
- Helper functions:
  - `hasFoughtOpponent()` - checks if a fighter has faced an opponent
  - `getOpponentStats()` - retrieves fight statistics against an opponent

**UI Components**:
- New "League Opponents" section displayed below Physical Attributes
- Shows count: "Fighters faced: X of Y"
- Grid layout of fighter thumbnails
- Each thumbnail shows:
  - Fighter image
  - Fighter name
  - Fight record (wins-losses and win percentage) if fought
  - Grayed-out overlay if not fought
- Clickable navigation to opponent's page (only for fought opponents)
- Hover tooltips showing fight statistics

### 3. Styling

**File**: `frontend/src/pages/FighterPage/FighterPage.css`

**New Classes**:
- `.opponents-section` - Main container
- `.opponents-content` - Content wrapper with max-width
- `.opponents-title` - Section title
- `.opponents-subtitle` - Shows "Fighters faced: X of Y"
- `.opponents-grid` - Responsive grid layout
- `.opponent-card` - Individual fighter card
- `.opponent-fought` - Active state (blue border, clickable, hover effects)
- `.opponent-not-fought` - Disabled state (reduced opacity, not clickable)
- `.opponent-image-wrapper` - Image container
- `.opponent-image` - Fighter image with zoom on hover
- `.opponent-overlay` - Gray overlay for unfaced fighters
- `.opponent-info` - Name and stats container
- `.opponent-name` - Fighter name
- `.opponent-record` - Win-loss record display
- `.opponent-win-rate` - Win percentage

**Responsive Design**:
- Desktop: Grid with 140px minimum columns
- Tablet (768px): Grid with 100px minimum columns
- Mobile (480px): Grid with 90px minimum columns
- Proper spacing and font size adjustments for all screen sizes

## Visual Design Features

### Active/Fought Opponents
- **Border**: Blue (#4285f4)
- **Cursor**: Pointer
- **Hover Effect**: 
  - Lifts up 4px
  - Blue glow shadow
  - Image zooms 10%
- **Display**: Full opacity with fight stats visible

### Inactive/Not Fought Opponents
- **Border**: Default border color
- **Cursor**: Not allowed
- **Opacity**: 40% (50% on hover)
- **Overlay**: Dark semi-transparent overlay with blur effect
- **Display**: No fight stats shown

### Statistics Display
For fought opponents:
```
Fighter Name
2W-1L (67%)
```

Shows:
- Win count
- Loss count
- Win percentage in parentheses

## User Experience

1. **Visual Feedback**: Clear distinction between fought and unfought opponents
2. **Hover Tooltips**: Detailed info on hover (name, fight count, record, or "not yet faced")
3. **Click Navigation**: Click fought opponents to navigate to their profile
4. **Progress Tracking**: Header shows "Fighters faced: X of Y" for quick overview
5. **Responsive**: Works seamlessly on all device sizes
6. **Theme Support**: Adapts to light/dark theme

## Data Flow

```
FighterPage
  ├─ GET_FIGHTER_INFORMATION (current fighter + opponentsHistory)
  ├─ GET_ALL_FIGHTERS (all league fighters)
  │
  ├─ Create Set of fought opponent IDs
  ├─ Filter out current fighter from all fighters
  │
  └─ For each fighter:
      ├─ Check if in foughtOpponentIds set
      ├─ If fought:
      │   ├─ Show active card (blue border)
      │   ├─ Display fight stats
      │   └─ Enable navigation
      └─ If not fought:
          ├─ Show disabled card (gray overlay)
          └─ Display "Not yet faced"
```

## Example Use Cases

### Fighter with 9 Opponents Faced
**Kinjal (Season 3)**:
- Shows 9 active cards with fight records
- Shows remaining fighters as grayed out
- Header: "Fighters faced: 9 of 23"

### Fighter with Multiple Seasons
If a fighter competed in multiple seasons:
- All unique opponents across all seasons are marked as "fought"
- Aggregated statistics shown (total fights, total W-L, overall win %)

### New Fighter (No Fights Yet)
- All opponent cards would be grayed out
- Header: "Fighters faced: 0 of 23"

## Technical Details

### Performance
- Lazy loading for opponent images
- Single query for all fighters (no N+1 problem)
- Efficient Set lookup for opponent checking: O(1)

### Type Safety
- TypeScript interfaces for all data structures
- Proper null/undefined handling
- Type-safe navigation

### Accessibility
- `title` attributes for hover information
- Proper semantic HTML structure
- Keyboard-accessible navigation (click handlers)
- Visual indicators for disabled state

## Future Enhancements

Potential additions:
1. **Filter Controls**: Toggle to show only fought/unfought opponents
2. **Sort Options**: Sort by win rate, total fights, fighter name
3. **Detailed Stats Modal**: Click for expanded fight history with dates, rounds, etc.
4. **Fight Timeline**: Visual timeline of when fights occurred
5. **Head-to-Head Details**: Link to fight detail page from the thumbnail
6. **Search/Filter**: Search for specific opponents

## Testing Checklist

- [x] No TypeScript/linter errors
- [ ] Verify data loads correctly from GraphQL
- [ ] Test hover states (fought vs not fought)
- [ ] Test click navigation for fought opponents
- [ ] Test disabled state for unfought opponents
- [ ] Verify responsive design on mobile/tablet/desktop
- [ ] Test with fighters who have 0 opponents (new fighters)
- [ ] Test with fighters who have faced all opponents
- [ ] Test theme switching (light/dark)
- [ ] Verify tooltips display correct information
- [ ] Test with missing/broken images

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid support required
- Backdrop-filter for blur effect (graceful degradation)

## Notes

- The feature uses the `opponentsHistory` data that was populated by the `update-fighters-history.js` script
- All opponents shown are from the same league (IFC)
- Multi-competition support can be added in the future by filtering opponents by competition

