# RD Circuitry Frontend

This is the frontend application for RD Circuitry, built with Next.js, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 10+

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

## Project Structure

- `src/app`: Next.js app router
- `src/components`: Reusable UI components
- `src/services`: API and WebSocket services
- `src/hooks`: Custom React hooks
- `src/lib`: Utility functions
- `src/types`: TypeScript type definitions

## Key Features

- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Socket.io for real-time communication
- React Hook Form for form validation
- Zod for schema validation
- Axios for API requests
