# AI Service Troubleshooting Guide

If you're getting errors when trying to test the AI service, follow these steps:

## Common Issues & Solutions

### 1. Dependencies Not Installed

**Error**: `ModuleNotFoundError: No module named 'pinecone'` or similar

**Solution**:
```bash
cd ai_service
pip install -r requirements.txt
```

If you're using a virtual environment (recommended):
```bash
# Create virtual environment (if you don't have one)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Package Not Installed as Editable Package

**Error**: `ImportError: No module named 'ai_service'` when running the backend

**Solution**:
```bash
# From the Reminisce root directory
pip install -e ./ai_service
```

### 3. Missing Environment Variables

**Error**: Environment variables not found or API keys missing

**Solution**:
Create a `.env` file in the `ai_service` directory:
```bash
cd ai_service
touch .env
```

Add the following (get values from your teammate or config.py):
```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=reminisce-memories
GCP_PROJECT_ID=reminisce-hackathon
GCP_LOCATION=us-central1
```

**Note**: The `config.py` file has hardcoded values, but `test_connection.py` expects environment variables. You can either:
- Create the `.env` file (recommended)
- Or modify `test_connection.py` to not use `load_dotenv()` if you want to rely on hardcoded values

### 4. Google Cloud Not Authenticated

**Error**: `(Did you run 'gcloud auth application-default login'?)`

**Solution**:
```bash
gcloud auth application-default login
```

This authenticates your local machine with Google Cloud for Vertex AI access.

### 5. Pinecone Index Not Created

**Error**: Index 'reminisce-memories' not found in Pinecone console

**Solution**:
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index with:
   - **Name**: `reminisce-memories`
   - **Dimensions**: `768`
   - **Metric**: `cosine`

### 6. Virtual Environment Issues

**Error**: Python packages installed globally but not accessible, or version conflicts

**Solution**:
Use a virtual environment:
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate     # On Windows

# Install dependencies
cd ai_service
pip install -r requirements.txt

# Install as editable package (from project root)
cd ../..
pip install -e ./ai_service
```

### 7. Python Version Issues

**Error**: Package installation fails or incompatible Python version

**Solution**:
Ensure you're using Python 3.8 or higher:
```bash
python3 --version  # Should be 3.8+
```

If you need to use a specific Python version:
```bash
python3.9 -m venv venv  # Use specific version
source venv/bin/activate
```

## Quick Setup Checklist

Run through this checklist to ensure everything is set up:

- [ ] Python 3.8+ installed (`python3 --version`)
- [ ] Virtual environment created and activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] ai_service installed as editable package (`pip install -e ./ai_service`)
- [ ] `.env` file created with API keys
- [ ] Google Cloud authenticated (`gcloud auth application-default login`)
- [ ] Pinecone index created in console
- [ ] Test connection passes (`python3 test_connection.py`)

## Testing

Once everything is set up, test the connection:

```bash
cd ai_service
python3 test_connection.py
```

You should see:
```
--- REMINISCE AI: INFRASTRUCTURE SMOKE TEST ---

1. Testing Google Cloud (Vertex AI)...
   ✅ SUCCESS: Generated vector with 768 dimensions.
   ✅ Dimensions match (768).

2. Testing Pinecone Vector DB...
   ✅ SUCCESS: Connected to 'reminisce-memories'.
   Current Vector Count: X

3. Testing Integration (Upserting Test Vector)...
   ✅ SUCCESS: Test vector uploaded to Pinecone.

4. Testing Retrieval...
   ✅ SUCCESS: Retrieved memory: '...'

--- TEST COMPLETE: ALL SYSTEMS GO ---
```

## If All Else Fails

1. **Ask your teammate** for:
   - Their `.env` file contents (API keys)
   - Their virtual environment setup
   - Any additional setup steps they took

2. **Check the README.md** in `ai_service/` for detailed setup instructions

3. **Check config.py** - it has hardcoded values that might work if environment variables aren't set

4. **Verify API keys are valid** - expired or incorrect keys will cause failures

