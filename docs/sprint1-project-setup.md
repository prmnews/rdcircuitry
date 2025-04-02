# Sprint 1: Project Setup & Foundation

## Objectives
- Create new project structure with backend/frontend separation
- Set up development environment with TypeScript
- Configure build tools and dependencies
- Establish shared configuration

## Tasks

### 1. Create Project Structure
```bash
# Windows-compatible commands
pnpm init -w  # Create workspace root

# Create backend project
pnpm init -w --dir backend
cd backend
mkdir src
mkdir src\models src\routes src\services src\websocket src\lib src\middleware src\config src\types
# Instead of touch, use echo to create empty files
echo. > src\index.ts

# Create frontend project
cd ..
pnpm init -w --dir frontend
```

### 2. Backend Setup
```bash
# In backend directory
pnpm add express mongoose socket.io cors dotenv bcryptjs jsonwebtoken

# Dev dependencies
pnpm add -D typescript ts-node-dev @types/node @types/express @types/mongoose @types/cors @types/bcryptjs @types/jsonwebtoken nodemon eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

Configure tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Configure package.json:
```json
{
  "name": "rdcircuitry",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

### 3. Frontend Setup
```bash
# In frontend directory
pnpm create next-app .  # Select TypeScript, App Router, Tailwind

# Additional dependencies
pnpm add socket.io-client react-hook-form zod @hookform/resolvers axios
```

### 4. Environment Configuration
Create .env files for both projects:

Backend (.env.local):
```
PORT=3000
MONGODB_URI=mongodb://stownsendSA:94HjPjOvzwEtizBrfPehJgBs4asrJEDiUf19VZlxhXQpsJwpxI95id8UJYW5@prmnews-mongo-cluster.c36syos2irmf.us-west-2.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&retryWrites=false
MONGODB_DB=rdcircuitry
ENCRYPTION_KEY=by9%Y@#*!Wf3Svb*3qb^KZvsk&zZBS1u%hvhU6RDz0tYts4Rj%&^E4*d0iJpb2WUdjXGYGr&Vm^9O6he1Wik%k%mGB3iI^6u
JWT_SECRET=x@KqLFzR6xYs$IqobyMaA^DSglh@%lQSCvZ3fcwQl@7OqzF7azPxx@LlHgVh1d&auLSW6DXwNXS5%GAoRgB^Q7kVcC@L%ht!
FRONTEND_URL=http://localhost:4000

# Twitter/X API
TWITTER_API_KEY=Qy3CmazTlUv59peugMvEFlU4Q
TWITTER_API_SECRET=wZ3CpFpdZcOH8NppDqw0Hiu01V65oHSNLeZRTh67c4tEkUxSwt
TWITTER_ACCESS_TOKEN=882039189377695744-p7wbQB9EEyznU2ubJtcbVFg0pSYBq22
TWITTER_ACCESS_SECRET=q5lLX3bg3ztfcxKSSW0ZnJYCXpPbkdEcsArXnGAZv09Ld
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAPLIqgEAAAAAfLEtLdheX9UDbSog24lgFssjQJ8%3DbB6TxA0sLbdNjpLPq0f24niW0zwa0IM5SEqtNfHM18e1cj5cmX

# Timer Config
TIMER_INITIAL_MINUTES=3
MESSAGE_ENABLE=true
NEXT_PUBLIC_MESSAGE_ENABLE=true
MESSAGE_YELLOW_MINUTES=2
MESSAGE_RED_MINUTES=1

# Lag Config
LAG_TIME_MINUTES=1

# WebSocket Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
WEBSOCKET_PORT=3001
MESSAGE_WEBHOOK_SECRET=akkpDG5mA*OfZ!rBPTcY*Z3cMsi&TxsNoCzozuFA3ljtFF!Gx#aspkeol1%5Ek6B2qNYPM$qcITdBJiJqWebWaJ##k*7DHmS

```

Frontend (.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=#LGC4ad!$2u@u&Qp&z^tABYmOX!r5US8bK&MCpNA8D5alTRfHw6ek2NlsePJ*U5LeIsd5JVDBhUkBk6WQx!@laazm1YRWn1v

```

### 5. Database Connection Setup
Create `backend/src/lib/database.ts`:
```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Define connection cache types
interface ConnectionCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global connection cache
let cached: ConnectionCache = { conn: null, promise: null };

export async function connectToDatabase(): Promise<typeof mongoose> {
  // If connection exists, reuse it
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not defined in environment variables');
  }

  if (!process.env.MONGODB_DB) {
    throw new Error('MONGODB_DB not defined in environment variables');
  }

  // If a connection is already being established, wait for it
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts)
      .then((mongoose) => {
        console.log(`✅ Connected to MongoDB database: ${process.env.MONGODB_DB}`);
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

### 6. Express Server Setup
Create `backend/src/index.ts`:
```typescript
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectToDatabase } from './lib/database';
import dotenv from 'dotenv';

dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Basic routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Declare global IO instance
declare global {
  var socketIo: Server;
}

// Make io instance globally available
global.socketIo = io;

// Basic WebSocket connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
async function startServer(): Promise<void> {
  try {
    // Connect to database first
    await connectToDatabase();
    
    // Then start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

## Testing Strategy
1. Verify MongoDB connection
2. Test basic Express endpoints
3. Confirm Socket.IO connection
4. Ensure Next.js app starts properly
5. Verify TypeScript type checking works correctly

## Notes to the Future You

### Windows Development Tips
- Use backslashes (`\`) for directory paths
- Use `echo. >` instead of `touch` to create empty files
- If using Git Bash, you can use forward slashes and Unix commands
- Consider using cross-env for environment variables in npm scripts
- VSCode's integrated terminal supports both PowerShell and Command Prompt

### TypeScript Benefits
- Static type checking helps catch errors during development
- Better IDE support with autocompletion and code navigation
- Improved code documentation through type definitions
- Safer refactoring with compiler validation
- Consistent typing with your TypeScript frontend

### Architecture Principles
- Backend knows nothing about frontend implementation
- Frontend knows nothing about backend implementation details
- All interactions happen through well-defined API contracts
- WebSockets are for real-time notifications only, not state management
- Leverage TypeScript interfaces to define shared data structures

### Knowledge Extraction
When building this new architecture, extract these key elements from the old codebase:
- Database schemas and convert to TypeScript interfaces
- Core business logic (timer calculations, message handling)
- API endpoint behaviors with proper TypeScript typing
- WebSocket event definitions with TypeScript interfaces

### Avoiding Previous Pitfalls
- Don't mix module systems (Node.js and Next.js)
- Don't try to share code between backend and frontend
- Don't directly access MongoDB from frontend code
- Don't let frontend manage critical state transitions
- Don't use `any` type excessively - define proper interfaces

Remember, the goal is clean separation, not perfect feature parity immediately. Focus on getting the foundation right first. 