#!/bin/bash
set -e

echo "==> Checking for .env file..."
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in your values."
  exit 1
fi

echo "==> Stopping any running containers..."
docker-compose down --remove-orphans

echo "==> Building and starting all services..."
docker-compose up --build -d

echo "==> Waiting for services to be healthy..."
sleep 5

echo "==> Container status:"
docker-compose ps

echo ""
echo "Deployment complete!"
echo "  Frontend : http://localhost:3001"
echo "  Backend  : http://localhost:5000"
echo "  Health   : http://localhost:5000/health"
