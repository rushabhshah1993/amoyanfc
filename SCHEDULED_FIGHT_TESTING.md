# Scheduled Fight Feature - Testing Guide

## Overview
This document describes how to test the new scheduled fight UI feature that was implemented in the FightPage component.

## What Was Implemented

### 1. **CompactHeadToHead Component**
- A new condensed version of the HeadToHead component
- Shows all competitions in a single horizontally scrollable div
- Displays:
  - Total fights across all competitions
  - Wins for each fighter
  - Competition name at the top of each fight card
  - Fight date at the bottom of each fight card
- Located at: `frontend/src/components/CompactHeadToHead/`

### 2. **Scheduled Fight UI in FightPage**
When a fight has `fightStatus: 'scheduled'`, the following UI is displayed:

#### a. CompactHeadToHead Component
- Shows historical head-to-head data between the two fighters

#### b. Action Buttons (Side-by-side)
- **Simulate Fight**: Triggers AI-powered fight simulation
- **Choose Winner**: Allows manual winner selection

#### c. Conditional Action Panels

**When "Simulate Fight" is clicked:**
- Shows confirmation message
- Explains what the simulation will do
- Two buttons: "Confirm Simulation" and "Cancel"
- On confirmation: Logs data to console (placeholder for OpenAI API call)

**When "Choose Winner" is clicked:**
- Shows both fighter thumbnails side-by-side
- User can click on a fighter to select them as winner
- Text area below for fight description
- Two buttons: "Submit Result" and "Cancel"
- On submission: Logs data to console (placeholder for database API call)

## How to Test

### Using Mock Data

1. **Navigate to the mock scheduled fight:**
   ```
   http://localhost:3000/fight/scheduled-mock
   ```

2. **The page will display:**
   - **Real fighter images and data from MongoDB** (Sayali Raut vs Marina Silva)
   - Fighter IDs used: `676d6ecceb38b2b97c6da945` and `676d7631eb38b2b97c6da9ab`
   - Competition information
   - **Real head-to-head history from `opponentsHistory`** showing their actual previous fights
   - Two action buttons: "Simulate Fight" and "Choose Winner"

**Note:** The system uses a hybrid approach:
- Mock data provides the fight structure (scheduled status, competition context)
- Real fighter data (images, names, stats) is fetched from MongoDB
- **Real head-to-head data is extracted from `fighter.opponentsHistory`** and transformed for display

### Test Scenarios

#### Test 1: Simulate Fight
1. Click the "Simulate Fight" button
2. Verify the confirmation panel appears
3. Check console logs when clicking "Confirm Simulation"
4. Verify the panel closes after confirmation

#### Test 2: Choose Winner
1. Click the "Choose Winner" button
2. Verify the winner selection panel appears
3. Click on one fighter's thumbnail to select them
4. Verify the selection is highlighted
5. Type a description in the text area
6. Click "Submit Result"
7. Check console logs for the submitted data
8. Verify the panel closes after submission

#### Test 3: Cancel Actions
1. Click either action button
2. Click "Cancel"
3. Verify the action panel closes
4. Verify you can open the other action

#### Test 4: Responsive Design
1. Resize the browser window
2. Verify the CompactHeadToHead component scrolls horizontally
3. Verify action buttons stack vertically on mobile

## Mock Data Location
- **Fight Data**: `/frontend/src/mocks/fight-scheduled.mock.ts`
- **Includes**:
  - Two fighters with IDs matching existing fighters in MongoDB
  - `fightStatus: 'scheduled'`
  - Competition context for the scheduled fight

### How It Works
The implementation uses a **hybrid approach**:
1. **Mock fight structure** (scheduled status, competition context)
2. **Real fighter data** fetched from MongoDB via GraphQL queries
3. **Real head-to-head history** extracted from fighter's `opponentsHistory`

When you navigate to `/fight/scheduled-mock`:
- The page recognizes it's a mock fight and uses the mock data structure
- It extracts the fighter IDs from the mock data
- It queries MongoDB for full fighter information using `GET_FIGHTER_INFORMATION`
- Real fighter data (including images, names, stats, `opponentsHistory`) is merged into the fight object
- The `opponentsHistory` for the opponent is found and transformed into head-to-head data:
  - Groups fights by competition
  - Calculates wins/losses for each fighter per competition
  - Retrieves competition metadata (name, logo) from `competitionHistory`
- You see actual fighter images from your S3/CloudFront storage and real fight history

## Future Implementation (Placeholders)

### 1. Simulate Fight API
Location: `FightPage.tsx` - `handleSimulateFightConfirm()`
```typescript
// TODO: Call OpenAI API to simulate fight
// const result = await simulateFightWithAI(fighter1, fighter2);
```

### 2. Save Winner API
Location: `FightPage.tsx` - `handleChooseWinnerSubmit()`
```typescript
// TODO: Call API to save winner and description to database
// await saveFightResult(fightId, selectedWinner, fightDescription);
```

## Clean Up Instructions

When integrating with the backend, remember to:

1. **Remove mock data import** from `FightPage.tsx`:
   ```typescript
   // Remove this line:
   import { mockScheduledFight } from '../../mocks/fight-scheduled.mock';
   ```

2. **Remove mock data usage**:
   ```typescript
   // Remove these lines:
   const useMockData = fightId === 'scheduled-mock';
   const fight: Fight | null = useMockData ? mockScheduledFight : ...
   ```

3. **Replace with normal data fetching**:
   ```typescript
   const fight: Fight | null = data?.getCupFightById || data?.getFightById || null;
   ```

4. **Head-to-head data handling**:
   The head-to-head data is already extracted from real fighter's `opponentsHistory`, so no changes needed.
   The `transformHeadToHeadData()` function will automatically work with real fight data from the database.

5. **Delete the mock data file and folder**:
   ```bash
   rm -rf frontend/src/mocks/
   ```

## Notes
- All styling is responsive and follows the existing design system
- Uses existing S3Image component for fighter images
- Integrates with existing navigation and routing
- Console logs are in place for testing API integration points

