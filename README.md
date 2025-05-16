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

