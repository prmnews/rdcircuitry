FROM node:20.17.0-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.7.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY frontend/package.json ./frontend/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN pnpm build:frontend

# Production image
FROM node:20.17.0-alpine AS runner
WORKDIR /app

# Copy built frontend and necessary files
COPY --from=base /app/frontend/.next ./frontend/.next
COPY --from=base /app/frontend/public ./frontend/public
COPY --from=base /app/frontend/package.json ./frontend/
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/pnpm-workspace.yaml ./

# Install production dependencies only
RUN npm install -g pnpm@10.7.1 && \
    pnpm install --prod --frozen-lockfile

# Set proper environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Set working directory to frontend
WORKDIR /app/frontend

# Start frontend
CMD ["pnpm", "start"] 