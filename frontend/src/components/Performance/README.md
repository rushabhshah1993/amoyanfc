# Performance Component

A reusable React component that displays a fighter's recent fight history with visual indicators for wins and losses.

## Features

- **Visual Timeline**: Displays fights in a horizontal scrollable timeline
- **Win/Loss Indicators**: Green background for wins, red for losses
- **Configurable Count**: Show any number of recent fights (default: 5)
- **Competition Filtering**: Can filter fights by specific competition
- **Sorting Options**: Display fights oldest-to-newest or newest-to-oldest
- **Hover Information**: Shows detailed fight context on hover (competition, season, division, round, opponent)
- **Clickable**: Navigate to fight details page on click
- **Responsive**: Mobile-friendly design with horizontal scrolling
- **Name Display**: Configurable opponent name display (show/hide)

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `fighter` | `Fighter` | Yes | - | Fighter object with opponentsHistory and competitionHistory |
| `allFighters` | `Fighter[]` | No | `[]` | Array of all fighters for opponent name/image lookup |
| `competitionId` | `string` | No | `undefined` | Filter fights to specific competition (omit for all competitions) |
| `count` | `number` | No | `5` | Number of fights to display |
| `showOpponentName` | `boolean` | No | `true` | Whether to show opponent names below thumbnails |
| `sortOrder` | `'asc' \| 'desc'` | No | `'asc'` | Sort order: 'asc' = oldest first, 'desc' = newest first |

## Usage Examples

### Fighter Page (All Competitions)

Display last 5 fights across all competitions, newest first:

```tsx
import Performance from '../../components/Performance/Performance';

<Performance 
  fighter={fighter}
  allFighters={allFighters}
  count={5}
  showOpponentName={true}
  sortOrder="desc"
/>
```

### Division Page (Competition Filtered)

Display last 5 fights from specific competition only:

```tsx
import Performance from '../../components/Performance/Performance';

<Performance 
  fighter={topFighter}
  allFighters={allFighters}
  competitionId={competitionId}  // Filter to this competition
  count={5}
  showOpponentName={true}
  sortOrder="desc"
/>
```

### Custom Configuration Examples

```tsx
// Show last 10 fights, oldest first, no names
<Performance 
  fighter={fighter}
  allFighters={allFighters}
  count={10}
  showOpponentName={false}
  sortOrder="asc"
/>

// Show last 3 fights from specific competition
<Performance 
  fighter={fighter}
  allFighters={allFighters}
  competitionId="67780dcc09a4c4b25127f8f6"
  count={3}
  sortOrder="desc"
/>
```

## Data Requirements

The `fighter` object must have:

```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  opponentsHistory?: [{
    opponentId: string;
    details: [{
      competitionId: string;
      season: number;
      divisionId: number;
      roundId: number;
      fightId: string;
      isWinner: boolean;
    }]
  }];
  competitionHistory?: [{
    competitionId: string;
    competitionMeta?: {
      competitionName: string;
      logo?: string;
    }
  }];
}
```

## Visual Design

### Win Indicator
- **Background**: Green gradient (`rgba(34, 197, 94, 0.15)` to `rgba(34, 197, 94, 0.25)`)
- **Border**: Green (`rgba(34, 197, 94, 0.4)`)
- **Badge**: Green circle with "W"

### Loss Indicator
- **Background**: Red gradient (`rgba(239, 68, 68, 0.15)` to `rgba(239, 68, 68, 0.25)`)
- **Border**: Red (`rgba(239, 68, 68, 0.4)`)
- **Badge**: Red circle with "L"

### Hover Effects
- Component lifts up slightly
- Border color intensifies
- Thumbnail scales up
- Shows tooltip with full fight details

## Integration Points

### Current Integrations

1. **FighterPage** (`/fighter/:id`)
   - Shows last 5 fights across all competitions
   - Displays below Physical Attributes section

2. **DivisionPage** (`/competition/:competitionId/season/:seasonId/division/:divisionNumber`)
   - Shows last 5 fights from that specific competition
   - Displays for the top-ranked fighter
   - Positioned above the standings/fights grid

### Suggested Additional Uses

- Competition landing page (show recent fights of all fighters)
- Season summary page (show key performances)
- Versus page (show head-to-head recent form)
- Fighter comparison tool (side-by-side performance)

## Styling

The component uses CSS Modules (`Performance.module.css`) with:
- Dark theme compatible
- Fully responsive (mobile, tablet, desktop)
- Smooth transitions and hover effects
- Horizontal scrolling for overflow
- Custom scrollbar styling

## Performance Considerations

- Uses `useMemo` to optimize fight history computation
- Only processes fights up to the requested count
- Efficient sorting and filtering
- Lazy loading for opponent images
- Fallback placeholders for missing images

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires ES6+ support

## Accessibility

- Hover tooltips provide context
- Clickable elements have cursor pointer
- Alt text for images
- Semantic HTML structure
- Keyboard navigation support (via clickable elements)

## Future Enhancements

Potential improvements:
- Add animation on scroll into view
- Show fight method icons (KO, Submission, Decision)
- Add round number badge
- Include strike statistics preview
- Add export/share functionality
- Comparison mode (multiple fighters)

