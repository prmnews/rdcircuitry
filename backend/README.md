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

Create a `.env.local` file in the root directory with the following variables:

```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=rdcircuitry
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
FRONTEND_URL=http://localhost:3000
WEBSOCKET_PORT=3001
```

### Database Hydration

Run the following commands to hydrate the database with initial data:

```bash
# Hydrate all collections at once
pnpm hydrate:all

# Or hydrate individual collections
pnpm hydrate:countries
pnpm hydrate:users
pnpm hydrate:apikeys
pnpm hydrate:state
pnpm hydrate:messagetimer

# Run hydration scripts in non-interactive mode (skip confirmation)
pnpm hydrate:state --drop
# Add --confirm flag to enable confirmation prompts
pnpm hydrate:state --drop --confirm
```

### Managing Timer State

The timer state can be updated using the update-state script:

```bash
# Update timer with default values (3 minutes)
cd backend
pnpm update:state

# Update timer with specific minutes
cd backend
pnpm update:state 10

# Reset RDI flag
cd backend
pnpm update:state --reset-rdi

# Use interactive mode
cd backend
pnpm update:state --interactive
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
- `POST /api/auth/api-key` - Authenticate using API key
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

## API Key Authentication

The system supports two authentication methods:

1. **Username/PIN authentication**: Used for interactive login via the web interface
2. **API Key authentication**: Used for programmatic access and automation

### How API Keys Work

- API keys are generated during hydration or by admins
- Keys are stored as bcrypt hashes in the database
- Each key has a type (admin, read-only) determining access levels
- Keys can expire and have usage tracking

### Using API Keys

To authenticate with an API key:

```javascript
// Example API key authentication request
const response = await fetch('/api/auth/api-key', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    apiKey: 'your_api_key_here'
  })
});

const { token } = await response.json();

// Use the returned JWT token for subsequent requests
const protectedResponse = await fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
``` 