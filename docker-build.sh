#!/bin/bash

# Docker ETL Build Helper Script

echo "🧹 Cleaning node_modules directories..."
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# COMPOSE_BAKE causes path issues on Windows
# echo "🚀 Setting Docker Compose optimizations..."
# export COMPOSE_BAKE=true

echo "🔨 Building Docker containers with version 1.3.1..."
docker build -t kmxiaaw/rdcircuitry:backend-v1.3.1 -f backend.Dockerfile .
docker build -t kmxiaaw/rdcircuitry:frontend-v1.3.1 -f frontend.Dockerfile .

echo "✅ Build complete!"
echo ""
echo "To push the images to Docker Hub, run:"
echo "docker push kmxiaaw/rdcircuitry:backend-v1.3.1"
echo "docker push kmxiaaw/rdcircuitry:frontend-v1.3.1"
echo ""
echo "To start the containers, run:"
echo "docker-compose up -d"
echo ""
echo "To view logs:"
echo "docker-compose logs -f" 