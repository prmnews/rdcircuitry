# Deployment Guide

## Environment Setup

### CORS Configuration

The application now uses a centralized approach for CORS configuration to allow seamless deployment across different environments. When deploying to production, set the following environment variables:

1. **SERVER_IP** - The IP address of your deployment server (e.g., `137.184.14.201`)
2. **PRODUCTION_DOMAIN** - Your production domain name (e.g., `rdcircuitry.com`)
3. **PRODUCTION_URL** - Full production URL (e.g., `https://rdcircuitry.com`)
4. **ALLOWED_DOMAINS** - Any additional domains to allow, comma-separated (optional)

These variables are used to automatically configure CORS for both the REST API and WebSocket connections.

Example in your `.env` file:
```
SERVER_IP=137.184.14.201
PRODUCTION_DOMAIN=rdcircuitry.com
PRODUCTION_URL=https://rdcircuitry.com
ALLOWED_DOMAINS=admin.rdcircuitry.com,api.rdcircuitry.com
```

### Docker Deployment

When deploying with Docker, make sure to set these environment variables in your Docker Compose file:

```yaml
version: '3'
services:
  backend:
    image: yourusername/rdcircuitry:backend-v1.0.0
    environment:
      - NODE_ENV=production
      - PORT=4000
      - WEBSOCKET_PORT=3001
      - FRONTEND_URL=https://rdcircuitry.com
      - SERVER_IP=137.184.14.201
      - PRODUCTION_DOMAIN=rdcircuitry.com
      - PRODUCTION_URL=https://rdcircuitry.com
      # Add other required environment variables
```

## SSL Configuration

For proper HTTPS support, make sure:

1. Your Nginx configuration properly routes traffic to both the main API and WebSocket server
2. All URLs in frontend environment variables use HTTPS
3. SSL certificates are properly installed for all domains

## Mixed Content Prevention

To prevent mixed content errors:

1. Ensure all API calls use HTTPS
2. Configure WebSocket connections to use WSS (secure WebSockets)
3. Update environment variables in both backend and frontend to use HTTPS URLs

## Troubleshooting

### CORS Errors

If you encounter CORS errors after deployment:

1. Check your environment variables to ensure `SERVER_IP`, `PRODUCTION_DOMAIN`, and `FRONTEND_URL` are correctly set
2. Verify the backend logs to see the allowed origins list
3. Make sure frontend requests are coming from an allowed origin
4. For additional domains, add them to the `ALLOWED_DOMAINS` environment variable

### WebSocket Connection Issues

If WebSocket connections fail:

1. Ensure `WEBSOCKET_PORT` is correctly set and matches between frontend and backend
2. Check that the WebSocket URL in the frontend uses the correct protocol (ws:// or wss://)
3. Verify firewall rules allow traffic on the WebSocket port 