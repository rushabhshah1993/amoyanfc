# Sample Data Files

This directory contains comprehensive mock data examples for all object types in the MMA Fighting Competition system.

## File Structure

### Competition Meta Data
- `competition-meta.json` - League competition (IFC)
- `competition-meta-cup.json` - Cup competition (Champions Cup)

### Competition Seasons
- `competition-league.json` - Complete league season with divisions, rounds, and fights
- `competition-cup.json` - Complete cup tournament with knockout format

### Fighter Data
- `fighter.json` - Alex Thunder (Champion, #1 ranked)
- `fighter-2.json` - Marcus Steel (Former champion, #2 ranked)

### Rankings & Standings
- `global-rank.json` - Current global rankings for all fighters
- `round-standings.json` - Division 1 standings after Round 3
- `round-standings-division-2.json` - Division 2 standings after Round 2

### Content
- `article.json` - Fight recap article
- `article-2.json` - Tournament announcement
- `article-3.json` - Fighter profile story

## Data Relationships

### Key Object IDs (for reference)
- **Competition Meta (League)**: `507f1f77bcf86cd799439011`
- **Competition Meta (Cup)**: `507f1f77bcf86cd799439015`
- **League Season**: `507f1f77bcf86cd799439012`
- **Cup Season**: `507f1f77bcf86cd799439070`
- **Alex Thunder**: `507f1f77bcf86cd799439021`
- **Marcus Steel**: `507f1f77bcf86cd799439022`
- **Global Rankings**: `507f1f77bcf86cd799439031`

### Competition Structure
- **League Competitions**: Multi-division, round-robin format with points system
- **Cup Competitions**: Single-elimination knockout tournaments
- **Fighters**: Can participate in both league and cup competitions
- **Standings**: Updated after each fight in league competitions
- **Global Rankings**: Calculated periodically across all competitions

### Statistics Tracking
- **Fight Stats**: Per-fight statistics including striking, grappling, submissions
- **Career Stats**: Aggregated statistics across all fights
- **Earnings**: Tracked per competition season with detailed breakdowns
- **Streaks**: Win/loss streaks maintained per competition
- **Opponent History**: Detailed head-to-head records

## Usage

These sample files can be used for:
- API testing and development
- Frontend development and UI mockups
- Database seeding
- Documentation and examples
- Integration testing

Each file represents a complete, realistic data structure that follows the schema definitions in the `/server/models/` and `/server/typeDefs/` directories.
