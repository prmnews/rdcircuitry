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

## Environment Setup

Both backend and frontend components require environment variables for proper configuration.

### Backend

See [backend/README.md](./backend/README.md) for backend environment setup.

### Frontend

See [frontend/README.md](./frontend/README.md) for frontend environment setup. 