#!/bin/bash

# Admin Dashboard Startup Script
# Starts both the Next.js server and Socket.io server

echo "🚀 Starting Admin Dashboard Services..."
echo "=================================="

# Kill any existing processes on ports 3000 and 3001
echo "📦 Cleaning up existing processes..."
npx kill-port 3000 3001 2>/dev/null || true

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    npx kill-port 3000 3001 2>/dev/null || true
    exit 0
}

# Set up trap for clean exit
trap cleanup INT TERM

# Start Socket.io server in background
echo "🔌 Starting Socket.io server on port 3001..."
node server.js &
SOCKET_PID=$!

# Wait for Socket.io to start
sleep 2

# Start Next.js development server
echo "⚡ Starting Next.js development server on port 3000..."
echo ""
echo "=================================="
echo "📊 Admin Dashboard is starting..."
echo "=================================="
echo ""
echo "🌐 Services:"
echo "   • Next.js App: http://localhost:3000"
echo "   • Socket.io: http://localhost:3001"
echo "   • Admin Panel: http://localhost:3000/admin"
echo ""
echo "📝 Default credentials:"
echo "   • Email: admin@biggbuzz.com"
echo "   • Password: admin123"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=================================="
echo ""

# Start Next.js (this will run in foreground)
npm run dev

# If npm run dev exits, clean up
cleanup