# DetailedTimelinePage Component

A comprehensive timeline page that displays all fights in a season grouped by day and division, with a vertical timeline design.

## Features

### Layout & Design
- **Vertical Timeline**: Left-side timeline with circles at each date and connecting lines
- **Minimal Aesthetic**: Clean, elegant design matching DivisionPage/FighterPage style
- **Day Grouping**: Fights grouped by date with count displayed
- **Division Sub-Grouping**: Within each day, fights are grouped by division
- **Wrappable Cards**: Fight cards wrap to new lines to prevent clutter

### Fight Cards
- **Fighter Thumbnails**: Visual representation of both fighters (50x50px)
- **Winner Highlighting**: Winner's card has green background tint
- **Time Display**: Shows time of each fight
- **Clickable**: Navigate to fight detail page on click

### Controls
- **Sort Toggle**: Button to switch between ascending (oldest first) and descending (newest first)
- **Back Navigation**: Returns to season page
- **Header**: Season number display

## Route

```
/competition/:competitionId/season/:seasonId/timeline
```

## Data Structure

### Day Groups
```typescript
{
  date: Date,
  dateString: string,  // "October 19, 2024"
  fightCount: number,
  divisionGroups: [
    {
      divisionNumber: number,
      divisionName?: string,
      fights: FightWithContext[]
    }
  ]
}
```

### Fight Context
```typescript
{
  fight: Fight,
  divisionNumber: number,
  divisionName?: string,
  roundNumber: number,
  date: Date,
  fighter1Data?: Fighter,
  fighter2Data?: Fighter
}
```

## Visual Structure

```
┌─────────────────────────────────────────┐
│ Season X Timeline    [Sort: ↑/↓]       │
│ [← Back to Season]                      │
├─────────────────────────────────────────┤
│                                         │
│ ○────  October 19, 2024 · 3 fights     │
│ │      Division 1                       │
│ │      [Card] [Card]                    │
│ │      Division 3                       │
│ │      [Card]                           │
│ │                                       │
│ ○────  October 18, 2024 · 2 fights     │
│ │      Division 2                       │
│        [Card] [Card]                    │
│                                         │
└─────────────────────────────────────────┘
```

## Fight Card Structure

```
┌─────────────────┐
│    14:30        │  ← Time
│  ┌───┐   ┌───┐ │
│  │ ✓ │vs │   │ │  ← Fighters (✓ = winner with green bg)
│  └───┘   └───┘ │
│  A.Smith J.Doe │  ← Names (abbreviated first name)
└─────────────────┘
```

## Usage

### Navigation
The page is accessed via the "View detailed timeline" button in the SeasonTimeline component.

### Interactivity
1. **Sort Fights**: Click the sort button to reverse chronological order
2. **View Fight Details**: Click any fight card to navigate to that fight's page
3. **Return to Season**: Use the back button to return to the season overview

## Processing Logic

1. **Data Collection**: Collects all completed fights across all divisions
2. **Sorting**: Sorts by date (ascending or descending based on toggle)
3. **Day Grouping**: Groups fights by date using locale-formatted date strings
4. **Division Grouping**: Within each day, groups by division number
5. **Division Sorting**: Divisions ordered numerically (1, 2, 3, etc.)

## States

- **Loading**: Spinner displayed while fetching data
- **Error**: Error message if query fails
- **No Data**: Message if no completed fights exist
- **Loaded**: Full timeline displayed

## Responsive Behavior

- **Desktop**: Full 2-column layout (timeline node + content)
- **Tablet**: Slightly narrower timeline node (30px)
- **Mobile**: 
  - Vertical stacking
  - Full-width fight cards
  - Smaller fighter images (40px)
  - Compact spacing

## Theme Support

Fully supports light/dark theme switching:
- Circle nodes use `--text-primary`
- Timeline line uses `--border-color`
- Cards adapt to theme colors
- Winner highlighting adjusts opacity for dark mode

## Performance

- **Memoized Processing**: Timeline data calculation is memoized
- **Single Query**: Uses existing `GET_SEASON_DETAILS` query
- **Efficient Grouping**: Map-based grouping for O(n) complexity
- **Only Completed Fights**: Filters out incomplete/scheduled fights

