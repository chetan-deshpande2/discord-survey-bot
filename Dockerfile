# Base image
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Builder stage
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build application
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 botuser && \
    rm -rf /var/cache/apk/*

# Copy production artifacts
COPY --from=deps --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:nodejs /app/dist ./dist
COPY --from=builder --chown=botuser:nodejs /app/package.json ./package.json

USER botuser

CMD ["node", "dist/index.js"]
