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
├── frontend/          # Next.js + React frontend (to be added)
│   └── ...
│
└── docs/              # Project documentation
```

## Backend

The backend is an Express.js application written in TypeScript, providing API endpoints and WebSocket communication.

See [backend/README.md](./backend/README.md) for more details.

## Frontend (Coming Soon)

The frontend will be built using Next.js, React, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm package manager

### Quick Start

```bash
# Install dependencies for backend
cd backend
pnpm install

# Start backend development server
pnpm dev

# (Once frontend is added)
# cd frontend
# pnpm install
# pnpm dev
```

## Environment Setup

Both backend and frontend components require environment variables for proper configuration.

### Backend

See [backend/README.md](./backend/README.md) for backend environment setup.

### Frontend (Coming Soon)

Frontend environment setup will be provided when implemented. 