# SeasonTimeline Component

A minimal and elegant timeline visualization component that shows season duration and fight activity across divisions over time.

## Features

### Left Side - Duration Information
- **Dynamic Duration Display**: 
  - Shows elapsed time for ongoing seasons ("X days so far")
  - Shows total duration for completed seasons (months, days, hours)
  - Visual "Ongoing" badge for active seasons
- **Start/End Dates**: Formatted timestamps with date and time
- **Clean Icon**: Clock icon indicating temporal information

### Right Side - Activity Graph
- **SVG-Based Visualization**: Lightweight, responsive graph built with SVG
- **Dynamic Scaling**: 
  - X-axis adapts to season length (days, weeks, months, or quarters)
  - Y-axis adjusts to number of divisions
- **Color-Coded Divisions**: Auto-generated HSL colors for each division
- **Fight Markers**: 
  - Vertical rectangles showing when fights occurred
  - Intelligent stacking for overlapping fights (< 2% timeline apart)
  - Hover interactions with detailed tooltips
- **Interactive Tooltips**:
  - Date and time of fight
  - Fight identifier (Season-Division-Round)
  - Fighter thumbnails with winner highlighted in green
  - Follows mouse cursor

## Conditional Rendering

The component only renders if both `startDate` and `endDate` are present in `season.seasonMeta`. Returns `null` otherwise.

## Props

```typescript
interface SeasonTimelineProps {
    season: Season;  // Complete season data including dates, divisions, and fights
}
```

## Data Processing

1. **Date Calculations**:
   - Determines if season is ongoing (active && current date < endDate)
   - Calculates duration breakdown (months, days, hours, minutes, seconds)
   - For ongoing seasons: uses current date as end point

2. **Fight Data**:
   - Processes all completed fights across all divisions
   - Extracts fight dates and calculates timeline positions
   - Links fighter data for tooltip display
   - Handles overlapping fights with offset positioning

3. **Timeline Scaling**:
   - ≤7 days: Shows daily markers
   - ≤60 days: Shows weekly markers  
   - ≤365 days: Shows monthly markers
   - >365 days: Shows quarterly markers

## Visual Design

### Minimal Aesthetic
- Transparent backgrounds
- Simple border dividers
- Clean typography with uppercase labels
- SVG-based graphics for crisp scaling
- Theme-aware colors using CSS variables

### Color Generation
Divisions are assigned colors using HSL:
```
hue = (divisionIndex / totalDivisions) * 360
color = hsl(hue, 60%, 55%)
```
This ensures visually distinct colors regardless of division count.

## Interactive Features

### Hover Tooltip
- **Position**: Follows cursor with 15px offset
- **Content**:
  - Formatted date/time
  - Fight identifier
  - Fighter thumbnails (40x40px)
  - Winner gets green background highlight
  - "vs" separator between fighters
- **Styling**: Matches application theme, rounded corners, subtle shadow

### Graph Interactions
- Hover over fight markers reveals tooltip
- Mouse movement updates tooltip position
- Leaving marker hides tooltip

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Season Timeline                                     │
├─────────────────────┬───────────────────────────────┤
│ Duration Info       │   Activity Graph              │
│ ┌─────────────────┐ │   ┌─────────────────────────┐ │
│ │ 🕐 X days/months│ │   │ D1 ████│█│███│          │ │
│ │                 │ │   │ D2  ██│███│██│          │ │
│ └─────────────────┘ │   │ D3 │█││█│███││          │ │
│ Start: [DateTime]   │   └─────────────────────────┘ │
│ End:   [DateTime]   │   Mar  Apr  May  Jun  Jul    │
└─────────────────────┴───────────────────────────────────┘
```

## Usage

```tsx
import SeasonTimeline from '../../components/SeasonTimeline';

<SeasonTimeline season={seasonData} />
```

The component will automatically:
- Calculate duration based on dates
- Extract and position all fights
- Generate division colors
- Scale the timeline appropriately
- Handle responsive breakpoints

## Responsive Behavior

- **Desktop (>1024px)**: 2-column layout, full features
- **Tablet (768-1024px)**: 2-column layout, slightly condensed
- **Mobile (<768px)**: Stacked layout, duration on top, graph below
- **Small Mobile (<480px)**: Compact spacing, smaller tooltips

## WIP Section

A placeholder section for future timeline features is included at the bottom with minimal styling.

## Performance Considerations

- **Lightweight**: Built with pure SVG, no heavy charting libraries
- **Memoized**: Fight markers calculated once with `useMemo`
- **Efficient**: Only completed fights are processed and rendered
- **Responsive**: SVG scales naturally without recalculation

## Theme Support

Fully supports light/dark theme switching:
- Text colors use `var(--text-primary)` and `var(--text-secondary)`
- Backgrounds use `var(--bg-primary)` and `var(--bg-secondary)`
- Borders use `var(--border-color)`
- SVG elements adapt to theme dynamically

