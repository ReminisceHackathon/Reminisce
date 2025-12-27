#!/bin/bash
# Quick setup script for AI Service
# Run this from the ai_service directory

set -e  # Exit on error

echo "=== Reminisce AI Service Quick Setup ==="
echo ""

# Check Python version
echo "1. Checking Python version..."
python3 --version || { echo "ERROR: Python 3 not found. Please install Python 3.8+"; exit 1; }
echo "   ✓ Python found"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "2. Creating virtual environment..."
    python3 -m venv venv
    echo "   ✓ Virtual environment created"
else
    echo "2. Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "3. Activating virtual environment..."
source venv/bin/activate
echo "   ✓ Virtual environment activated"
echo ""

# Install dependencies
echo "4. Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "   ✓ Dependencies installed"
echo ""

# Install as editable package (from project root)
echo "5. Installing ai_service as editable package..."
cd ..
pip install -e ./ai_service
cd ai_service
echo "   ✓ Package installed"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "6. Creating .env file template..."
    cat > .env << EOF
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=reminisce-memories
GCP_PROJECT_ID=reminisce-hackathon
GCP_LOCATION=us-central1
EOF
    echo "   ✓ .env file created (please edit with your actual keys)"
else
    echo "6. .env file already exists"
fi
echo ""

# Check Google Cloud auth
echo "7. Checking Google Cloud authentication..."
if gcloud auth application-default print-access-token &>/dev/null; then
    echo "   ✓ Google Cloud authenticated"
else
    echo "   ⚠ Google Cloud not authenticated"
    echo "   Run: gcloud auth application-default login"
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual API keys"
echo "2. Run: gcloud auth application-default login (if not already done)"
echo "3. Create Pinecone index 'reminisce-memories' in console (768 dimensions, cosine metric)"
echo "4. Test: python3 test_connection.py"
echo ""

