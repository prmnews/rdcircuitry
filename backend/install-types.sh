#!/bin/bash

# Script to install required TypeScript type definitions for the backend

echo "Installing TypeScript type definitions for the backend..."

npm install --save-dev @types/express @types/mongoose @types/node

echo "Type definitions installed successfully."
echo "You may need to restart your IDE or TypeScript server for changes to take effect." 