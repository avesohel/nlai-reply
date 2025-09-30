# Multi-stage build for optimized production image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Install client dependencies
WORKDIR /app/client
RUN npm ci --only=production && npm cache clean --force

# Build the source code
FROM base AS builder
WORKDIR /app

# Copy all source files
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Build TypeScript server
RUN npm run build:server

# Build React client
WORKDIR /app/client
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/build ./client/build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p logs
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 5000, path: '/api/health', timeout: 10000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Start application
CMD ["node", "dist/server.js"]