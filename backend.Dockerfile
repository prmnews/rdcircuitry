FROM node:20.17.0-alpine AS base

# Install pnpm and MongoDB client tools
RUN apk add --no-cache mongodb-tools && \
    npm install -g pnpm@10.7.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY backend/package.json ./backend/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build backend
RUN pnpm build:backend

# Production image
FROM node:20.17.0-alpine AS runner
WORKDIR /app

# Install MongoDB client tools for database operations
RUN apk add --no-cache mongodb-tools

# Copy built backend and necessary files
COPY --from=base /app/backend/dist ./backend/dist
COPY --from=base /app/backend/package.json ./backend/
COPY --from=base /app/backend/src/data ./backend/dist/data
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/pnpm-workspace.yaml ./

# Install production dependencies only
RUN npm install -g pnpm@10.7.1 && \
    pnpm install --prod --frozen-lockfile

# Set proper environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV WEBSOCKET_PORT=3001

# Create directory for logs
RUN mkdir -p /app/logs

# Expose ports
EXPOSE 4000
EXPOSE 3001

# Set working directory to backend
WORKDIR /app/backend

# Start ETL backend
CMD ["pnpm", "start"] 