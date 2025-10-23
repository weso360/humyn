# Multi-stage build for production
FROM node:18-alpine AS builder

# Build frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Production server
FROM node:18-alpine AS production

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server files
COPY . .

# Copy built frontend
COPY --from=builder /app/client/build ./client/build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S humyn -u 1001
USER humyn

EXPOSE 3001

CMD ["node", "server.js"]