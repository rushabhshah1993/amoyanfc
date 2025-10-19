# SeasonRanking Component

A minimal and elegant component that displays fighters ranked by win percentage across all divisions in a season.

## Features

- **Cross-Division Rankings**: Shows all fighters from all divisions in a single leaderboard
- **Win Percentage Calculation**: Automatically calculates win percentage based on completed fights
- **Visual Rankings**: Top 3 fighters get trophy/medal icons (gold, silver, bronze)
- **Interactive**: Click on any fighter to navigate to their profile page
- **Responsive Design**: Adapts layout for mobile, tablet, and desktop views
- **Visual Progress Bars**: Win percentage displayed with both number and progress bar
- **Minimal Design**: Clean borders, transparent backgrounds, matching DivisionPage/FighterPage aesthetic

## Props

```typescript
interface SeasonRankingProps {
    season: Season;        // The complete season data including fights and divisions
    competitionId: string; // Competition ID for navigation purposes
}
```

## Data Processing

The component:
1. Collects all fighters from `season.seasonMeta.leagueDivisions`
2. Processes all completed fights from `season.leagueData.divisions[].rounds[].fights`
3. Calculates win/loss records and win percentages for each fighter
4. Sorts fighters by win percentage (with total wins as tiebreaker)
5. Only displays fighters who have completed at least one fight

## Display Format

Each row shows:
- **Rank**: Position number or icon for top 3
- **Fighter**: Profile image and full name (clickable)
- **Division**: Division number badge
- **Record**: Wins-Losses (colored green/red)
- **Win %**: Visual progress bar + percentage value

## Usage

```tsx
import SeasonRanking from '../../components/SeasonRanking';

<SeasonRanking season={seasonData} competitionId={competitionId} />
```

## Responsive Behavior

- **Desktop**: Full table layout with all columns visible
- **Tablet**: Slightly condensed columns
- **Mobile**: Stacked layout with rank positioned in top-right corner

## Theme Support

Fully supports light/dark theme switching through CSS variables.

