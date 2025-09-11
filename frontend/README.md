# Amoya NFC Frontend

This is the React frontend for the Amoya NFC football competition management system.

## Features

- Home page displaying all available competitions
- GraphQL integration with the backend API
- Responsive design with modern UI components
- Real-time data fetching using Apollo Client

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Backend server running on port 4000

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will open in your browser at `http://localhost:3000`.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   └── CompetitionCard.js
│   ├── pages/
│   │   └── HomePage.js
│   ├── services/
│   │   ├── apolloClient.js
│   │   └── queries.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Technologies Used

- React 18
- Apollo Client for GraphQL
- CSS3 for styling
- Create React App for build tooling
