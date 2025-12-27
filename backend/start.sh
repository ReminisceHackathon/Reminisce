#!/bin/bash
# Quick script to start the backend server
# Run this from the backend directory

set -e  # Exit on error

echo "=== Starting Reminisce Backend Server ==="
echo ""

# Check if we're in the backend directory
if [ ! -f "app/main.py" ]; then
    echo "Error: Please run this script from the backend directory"
    echo "Usage: cd backend && ./start.sh"
    exit 1
fi

# Determine which pip command to use
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
else
    echo "❌ Error: Neither 'pip' nor 'pip3' found. Please install Python pip."
    echo "   Try: python3 -m ensurepip --upgrade"
    exit 1
fi

# Determine which python command to use
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python not found. Please install Python 3.8+"
    exit 1
fi

echo "Using: $PYTHON_CMD and $PIP_CMD"
echo ""

# Check if uvicorn is installed
if ! $PYTHON_CMD -c "import uvicorn" 2>/dev/null; then
    echo "⚠️  uvicorn not found. Installing dependencies..."
    $PIP_CMD install -r requirements.txt
fi

# Check if ai_service is installed
if ! $PYTHON_CMD -c "import ai_service" 2>/dev/null; then
    echo "⚠️  ai_service package not found. Installing..."
    cd ..
    $PIP_CMD install -e ./ai_service
    cd backend
fi

echo "✓ Starting server on http://localhost:3000"
echo "  Press Ctrl+C to stop"
echo ""

# Start the server
$PYTHON_CMD -m uvicorn app.main:app --reload --port 3000

