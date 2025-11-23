# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production

# Build the frontend
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY frontend/package*.json ./frontend/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for frontend build
# These will be overridden by Cloud Build
ARG REACT_APP_API_URL=placeholder
ARG REACT_APP_BACKEND_URL=placeholder
ARG REACT_APP_COMPETITION_ID_IFC=placeholder
ARG REACT_APP_COMPETITION_ID_IFL=placeholder
ARG REACT_APP_COMPETITION_ID_CC=placeholder
ARG REACT_APP_COMPETITION_ID_IC=placeholder

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_COMPETITION_ID_IFC=$REACT_APP_COMPETITION_ID_IFC
ENV REACT_APP_COMPETITION_ID_IFL=$REACT_APP_COMPETITION_ID_IFL
ENV REACT_APP_COMPETITION_ID_CC=$REACT_APP_COMPETITION_ID_CC
ENV REACT_APP_COMPETITION_ID_IC=$REACT_APP_COMPETITION_ID_IC

# Disable treating warnings as errors for build
ENV CI=false

# Build frontend
RUN cd frontend && npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy built frontend
COPY --from=builder /app/frontend/build ./frontend/build

# Copy server code
COPY server/ ./server/

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Change ownership
RUN chown -R appuser:nodejs /app
USER appuser

# Expose port (Cloud Run uses $PORT environment variable)
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server/index.js"]
