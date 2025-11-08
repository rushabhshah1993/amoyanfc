# Amoya NFC - Football Competition Management System

A full-stack application for managing football competitions, built with React frontend and Node.js/GraphQL backend.

## 🏗️ Architecture

- **Frontend**: React 18 with Apollo Client for GraphQL
- **Backend**: Node.js with Express and Apollo Server
- **Database**: MongoDB with Mongoose ODM
- **API**: GraphQL with comprehensive type definitions

## 📁 Project Structure

```
amoyanfc/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # Apollo Client and GraphQL queries
│   │   └── ...
│   └── package.json
├── server/                  # Node.js backend server
│   ├── models/             # Mongoose models
│   ├── resolvers/          # GraphQL resolvers
│   ├── typeDefs/           # GraphQL type definitions
│   ├── inputs/             # Input validation schemas
│   ├── types/              # Type definitions
│   └── package.json
├── sample/                 # Sample data files
├── package.json           # Root package.json with workspace config
├── docker-compose.yml     # Docker Compose for production
└── Dockerfile            # Multi-stage Docker build
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- npm or yarn

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd amoyanfc
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your MongoDB connection string
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```
   This will start both frontend (port 3000) and backend (port 4000) concurrently.

### Individual Services

- **Backend only:** `npm run dev:server`
- **Frontend only:** `npm run dev:frontend`

### 🧪 Staging Environment (Pre-Production Testing)

**NEW!** We now have a separate staging database for safe testing:

📖 **Quick Start:** See **[QUICK_START.md](./QUICK_START.md)** (3 steps, < 5 minutes)

📚 **Full Guide:** See **[STAGING_SETUP_GUIDE.md](./STAGING_SETUP_GUIDE.md)** (comprehensive documentation)

**Quick Commands:**
```bash
# Verify setup
npm run verify:staging

# Copy production data to staging
npm run migrate:staging

# Test with staging database
npm run dev:staging
```

**Key Benefits:**
- ✅ Test features without affecting production
- ✅ Separate `staging-amoyan` database (100% free)
- ✅ Easy data refresh from production
- ✅ Safe environment for experimentation

## 🤖 AI Fight Generation (NEW!)

Generate realistic fight descriptions and statistics using OpenAI's ChatGPT 4.1 mini model!

### Features
- **Simulate Fights**: Let AI determine the winner and create a complete fight narrative
- **User-Selected Winner**: Choose a winner and optionally provide a description - AI expands it into a detailed story
- **Realistic Statistics**: AI generates fight stats consistent with the description (strikes, takedowns, grappling, etc.)
- **Fighter Data Integration**: AI considers fighter attributes, skills, streaks, and head-to-head history

### Quick Setup
1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to your `.env` file:
   ```bash
   OPENAI_API_KEY=sk-your-api-key-here
   ```
3. Restart your server

### Documentation
- **[AI Fight Generation Guide](./AI_FIGHT_GENERATION.md)** - Complete feature documentation
- **[Frontend Examples](./AI_FIGHT_GENERATION_EXAMPLES.md)** - React components and usage examples

### GraphQL Mutations
```graphql
# Simulate a fight (AI chooses winner)
mutation SimulateFight($input: SimulateFightInput!) {
  simulateFight(input: $input) {
    success
    message
    fight { ... }
  }
}

# Generate with user-selected winner
mutation GenerateFightWithWinner($input: GenerateFightWithWinnerInput!) {
  generateFightWithWinner(input: $input) {
    success
    message
    fight { ... }
  }
}
```

## 🐳 Production Deployment

### Using Docker Compose

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Run in background:**
   ```bash
   docker-compose up -d
   ```

### Manual Production Setup

1. **Build frontend:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm run start:server
   ```

## 📊 Available Scripts

### Core Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:server` | Start only the backend server |
| `npm run dev:frontend` | Start only the frontend development server |
| `npm run start` | Start both services in production mode |
| `npm run build` | Build the frontend for production |
| `npm run install:all` | Install dependencies for all workspaces |

### Staging & Testing Scripts

| Script | Description |
|--------|-------------|
| `npm run verify:staging` | Verify staging environment setup |
| `npm run migrate:staging` | Copy production data to staging database |
| `npm run dev:staging` | Run application with staging database |
| `npm run start:staging` | Start staging server |
| `npm run start:production` | Start production server |

### Data Import Scripts

⚠️ **Important**: Some import scripts delete existing data! See [Import Scripts Safety Guide](server/scripts/IMPORT-SCRIPTS-SAFETY-GUIDE.md) for details.

#### Safe Import Scripts (Recommended)
- `npm run import:safe-round-standings` - Import round standings (won't delete existing data)
- `npm run import:safe-season2` - Import Season 2 data (won't delete existing data)
- `npm run import:safe-season3` - Import Season 3 data (won't delete existing data)

#### Destructive Import Scripts (Use with Caution)
- `npm run import:season2` - Import Season 2 data (⚠️ deletes existing data)
- `npm run import:season2-standings` - Import Season 2 standings (⚠️ deletes existing data)
- `npm run import:season3` - Import Season 3 data (⚠️ deletes existing data)
- `npm run import:season3-standings` - Import Season 3 standings (⚠️ deletes existing data)

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/amoyanfc

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend Configuration
REACT_APP_API_URL=http://localhost:4000/graphql
```

## 🎯 Features

### Current Features
- ✅ Competition management system
- ✅ GraphQL API with comprehensive type definitions
- ✅ MongoDB integration with Mongoose
- ✅ React frontend with Apollo Client
- ✅ Responsive design
- ✅ Docker containerization
- ✅ Production-ready build configuration

### Planned Features
- 🔄 User authentication and authorization
- 🔄 Team management
- 🔄 Match scheduling and results
- 🔄 Real-time notifications
- 🔄 Admin dashboard
- 🔄 Mobile app

## 🛠️ Development

### Adding New Features

1. **Backend (GraphQL):**
   - Add new types in `server/typeDefs/`
   - Create resolvers in `server/resolvers/`
   - Define models in `server/models/`

2. **Frontend (React):**
   - Create components in `frontend/src/components/`
   - Add pages in `frontend/src/pages/`
   - Update GraphQL queries in `frontend/src/services/`

### Code Structure

- **GraphQL Schema**: Comprehensive type definitions with proper documentation
- **Mongoose Models**: Well-structured database schemas with validation
- **React Components**: Reusable, well-documented components
- **Apollo Client**: Efficient GraphQL data fetching and caching

## 📝 API Documentation

The GraphQL API is available at `http://localhost:4000/graphql` with built-in GraphQL Playground for testing queries.

### Key Queries
- `getAllCompetitionsMeta` - Fetch all competitions
- `getCompetitionMeta(id)` - Fetch specific competition

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details

## 👨‍💻 Author

**Rushabh Mulraj Shah**
