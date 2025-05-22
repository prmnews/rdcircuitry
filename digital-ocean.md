# Digital Ocean Deployment Guide

This guide provides step-by-step instructions for deploying the RD Circuitry application to a DigitalOcean droplet.

## Prerequisites

- DigitalOcean droplet (2GB RAM, 50GB Disk, Ubuntu 24.10 x64)
- Docker Hub repository with pushed images (kmxiaaw/rdcircuitry:frontend-v1.0.0 and kmxiaaw/rdcircuitry:backend-v1.0.0)
- SSH access to the droplet

## 1. Connect to Your Droplet 
  (this is already done through the SSH terminal)
  https://cloud.digitalocean.com/droplets/497559237/terminal/ui/

```bash
ssh root@137.184.14.201
```

## 2. Install Docker and Docker Compose

Docker installation:
```bash
# Install Docker
apt install docker.io -y

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify Docker installation
docker --version
```

Docker Compose installation:
```bash
# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker-compose --version
```

## 3. Set Up Application Directory

```bash
# Create application directory
mkdir -p /opt/rdcircuitry

# Create directories for environment files and persistent data
mkdir -p /opt/rdcircuitry/frontend
mkdir -p /opt/rdcircuitry/backend
mkdir -p /opt/rdcircuitry/logs
mkdir -p /opt/rdcircuitry/data

# Change to app directory
cd /opt/rdcircuitry
```

## 4. Create Environment Files

Create backend environment file:
```bash
nano /opt/rdcircuitry/backend/.env
```
  -Useful commands in ubuntu terminal:
    # See your current directory
    pwd

    # Show only hidden files
    ls -la | grep "^\."

    # Verify .env file exists and show its size
    ls -la .env

    # Check file content 
    cat .env

    # See directory structure with find command
    find . -type f -name "*.env*"


Add the following content (update with your actual values):
```
PORT=4000
MONGODB_URI=mongodb+srv://kmxiaaw7gxy3jedt:PNZhs5UbiV6S06LI@rdi-cluster.gmmeuph.mongodb.net/
MONGODB_DB=rdcircuitry
ENCRYPTION_KEY=your-encryption-key
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://137.184.14.201:3000
WEBSOCKET_PORT=3001
# Add all other required environment variables from task-definition.json
```

Create frontend environment file:
```bash
nano /opt/rdcircuitry/frontend/.env.local
```

Add the following content (update with your actual values):
```
NEXT_PUBLIC_API_URL=http://137.184.14.201:4000/api
NEXT_PUBLIC_SOCKET_URL=http://137.184.14.201:3001
NEXTAUTH_URL=http://137.184.14.201:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## 5. Create Docker Compose File

```bash
nano /opt/rdcircuitry/docker-compose.yml
```

Add the following content:
```yaml
name: rdcircuitry

services:
  # Frontend service
  frontend:
    image: kmxiaaw/rdcircuitry:frontend-v1.0.0
    ports:
      - "3000:3000"
    env_file:
      - ./frontend/.env.local
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - app-network

  # Backend ETL service
  backend:
    image: kmxiaaw/rdcircuitry:backend-v1.0.0
    ports:
      - "4000:4000"
      - "3001:3001"
    env_file:
      - ./backend/.env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

## 6. Transfer SSL Certificate (if needed)

If your backend requires SSL certificates:
```bash
# On your local machine:
scp ./backend/global-bundle.pem root@137.184.14.201:/opt/rdcircuitry/backend/

# On the droplet, make sure to reference it in docker-compose.yml:
# Add this volume to the backend service:
# - ./backend/global-bundle.pem:/app/backend/global-bundle.pem:ro
```

## 7. Pull and Start Containers

```bash
# Login to Docker Hub (if using private repository)
docker login

# Pull images
docker-compose pull

# Start containers in detached mode
docker-compose up -d
```

## 8. Configure Firewall

```bash
# Install UFW if not already installed
apt install ufw -y

# Allow SSH
ufw allow 22/tcp

# Allow application ports
ufw allow 3000/tcp  # Frontend
ufw allow 4000/tcp  # Backend API
ufw allow 3001/tcp  # WebSockets

# Enable firewall
ufw enable
```

## 9. Set Up Domain Name (Optional)

1. Add an A record in your domain's DNS settings pointing to your droplet's IP address
2. Update environment files to use your domain name
3. Consider adding HTTPS with Let's Encrypt:

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Install Nginx
apt install nginx -y

# Get certificate
certbot --nginx -d yourdomain.com
```

## 10. Verify Deployment

1. Check if containers are running:
```bash
docker-compose ps
```

2. View logs:
```bash
docker-compose logs
```

3. Test endpoints:
```bash
# Test backend
curl http://137.184.14.201:4000/api/health

# Test frontend (in browser)
http://137.184.14.201:3000
```

## 11. Maintenance Operations

### View container logs
```bash
docker-compose logs -f
```

### Update application
```bash
# Pull latest images
docker-compose pull

# Restart containers
docker-compose down
docker-compose up -d
```

### Backup environment files
```bash
mkdir -p /opt/backups
cp -r /opt/rdcircuitry/backend/.env /opt/rdcircuitry/frontend/.env.local /opt/backups/
```

## 12. Troubleshooting

### Container issues
```bash
# Check container status
docker-compose ps

# View specific container logs
docker-compose logs frontend
docker-compose logs backend

# Restart specific container
docker-compose restart frontend
```

### Connection issues
```bash
# Check if ports are listening
netstat -tulpn | grep LISTEN

# Check firewall status
ufw status
```

### Database connection
If your application can't connect to MongoDB:
1. Verify MongoDB connection string in backend/.env
2. Ensure MongoDB Atlas IP whitelist includes your droplet's IP
3. Test MongoDB connection:
```bash
apt install -y mongodb-clients
mongosh "mongodb+srv://kmxiaaw7gxy3jedt:PNZhs5UbiV6S06LI@rdi-cluster.gmmeuph.mongodb.net/rdcircuitry"
``` 