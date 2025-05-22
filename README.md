# RDCircuitry

A modern TypeScript application with separated backend and frontend components.

## Project Structure

This is a monorepo project with the following structure:

```
/
├── backend/           # Express + TypeScript backend
│   ├── src/           # Source code
│   ├── dist/          # Compiled output
│   └── ...
│
├── frontend/          # Next.js + React frontend
│   ├── src/           # Source code
│   └── ...
│
└── docs/              # Project documentation
```

## Backend

The backend is an Express.js application written in TypeScript, providing API endpoints and WebSocket communication.

See [backend/README.md](./backend/README.md) for more details.

## Frontend

The frontend is built using Next.js, React, TypeScript, and Tailwind CSS.

See [frontend/README.md](./frontend/README.md) for more details.

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm package manager (v10+)

### Quick Start

```bash
# Install dependencies for both backend and frontend
pnpm install

# Start both backend and frontend in development mode
pnpm dev

# Or start them individually
pnpm dev:backend
pnpm dev:frontend
```

## Docker Support

This project supports containerization with Docker for consistent deployment across environments.

### Docker-related Files

- `docker-compose.yml` - Defines and configures the multi-container application with frontend and backend services.
- `frontend.Dockerfile` - Builds the Next.js frontend in a multi-stage process for optimized production deployment.
- `backend.Dockerfile` - Builds the Express backend with MongoDB tools support for ETL operations.
- `docker-build.sh` - Helper script that cleans and builds Docker containers.
- `.dockerignore` - Specifies files and directories to exclude from Docker builds.

### Docker Commands

```bash
# Build the Docker containers
./docker-build.sh
# Or manually with docker-compose
docker-compose build

# Start the application (in detached mode)
docker-compose up -d

# View container logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild and restart a specific service
docker-compose up -d --build backend
```

## Environment Setup

Both backend and frontend components require environment variables for proper configuration.

### Backend

See [backend/README.md](./backend/README.md) for backend environment setup.

### Frontend

See [frontend/README.md](./frontend/README.md) for frontend environment setup.

## Environment Variables

The application requires the following environment variables:

### Server Configuration
- `PORT`: API server port (default: 4000)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: URL for the frontend application
- `WEBSOCKET_PORT`: Port for WebSocket server (default: 3001)
- `SERVER_IP`: Server IP address (for CORS configuration)
- `PRODUCTION_DOMAIN`: Production domain name (default: rdcircuitry.com)
- `PRODUCTION_URL`: Full production URL (default: https://rdcircuitry.com)
- `ALLOWED_DOMAINS`: Comma-separated list of additional allowed domains for CORS

### Database Configuration
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB`: MongoDB database name

### Security Configuration
- `JWT_SECRET`: Secret for JWT token generation
- `ENCRYPTION_KEY`: 32-character key for encryption
- `MESSAGE_WEBHOOK_SECRET`: Secret for webhook authentication

### Timer Configuration
- `TIMER_INITIAL_MINUTES`: Initial timer duration in minutes
- `MESSAGE_ENABLE`: Enable/disable message functionality
- `MESSAGE_YELLOW_MINUTES`: Minutes threshold for yellow warning
- `MESSAGE_RED_MINUTES`: Minutes threshold for red warning
- `LAG_TIME_MINUTES`: Minutes to add for lag compensation
- `MESSAGE_CHECK_INTERVAL_MS`: Interval for checking message timers (milliseconds)

### Twitter/X API Configuration
- `TWITTER_API_KEY`: Twitter/X API key
- `TWITTER_API_SECRET`: Twitter/X API secret
- `TWITTER_ACCESS_TOKEN`: Twitter/X access token
- `TWITTER_ACCESS_SECRET`: Twitter/X access token secret
- `TWITTER_BEARER_TOKEN`: Twitter/X bearer token

 
