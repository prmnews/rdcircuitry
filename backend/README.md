# RDCircuitry Backend

This is the backend API for RDCircuitry, providing authentication, WebSocket communication, and database operations.

## Tech Stack

- Node.js
- TypeScript
- Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication

## Project Structure

```
src/
├── config/            # Configuration files
├── lib/               # Utility libraries
├── middleware/        # Express middleware
├── models/            # Mongoose models
├── routes/            # Express routes
├── services/          # Business logic
├── types/             # TypeScript types
├── websocket/         # WebSocket handlers
├── index.ts           # Entry point
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm package manager
- MongoDB

### Installation

```bash
# Install dependencies
pnpm install
```

### Setup Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=rdcircuitry
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
FRONTEND_URL=http://localhost:3000
WEBSOCKET_PORT=3001
```

### Running the Server

```bash
# Development mode
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires authentication)

### Health Check

- `GET /api/health` - Check API status

## WebSocket Events

### Connection

- `authenticate` - Authenticate socket connection
- `client:connected` - Client connected event
- `client:disconnected` - Client disconnected event

### Timer

- `timer:start` - Start timer (admin only)
- `timer:stop` - Stop timer (admin only)
- `timer:reset` - Reset timer (admin only)
- `timer:update` - Timer update event
- `timer:expired` - Timer expired event

### Notifications

- `notification` - General notification event

## Development

### Linting

```bash
pnpm lint
```

### Formatting

```bash
pnpm format
``` 