#!/bin/bash

# Docker ETL Build Helper Script

echo "🧹 Cleaning node_modules directories..."
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# COMPOSE_BAKE causes path issues on Windows
# echo "🚀 Setting Docker Compose optimizations..."
# export COMPOSE_BAKE=true

echo "🔨 Building Docker containers..."
docker-compose build

echo "✅ Build complete!"
echo ""
echo "To start the containers, run:"
echo "docker-compose up -d"
echo ""
echo "To view logs:"
echo "docker-compose logs -f" 