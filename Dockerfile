# Multi-stage build for production deployment
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies for building
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Security: Run as non-root user
USER node

WORKDIR /app

# Copy package files
COPY --chown=node:node package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production --omit=dev && npm cache clean --force

# Copy built frontend from build stage
COPY --from=build --chown=node:node /app/dist ./dist

# Copy server code
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared

# Set production environment
ENV NODE_ENV=production
ENV DEPLOYMENT_MODE=self-hosted

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/setup/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application (database tables are created automatically on startup)
CMD ["node", "dist/index.js"]
