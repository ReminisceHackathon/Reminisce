# Quick Start Guide - Backend Server

## The Issue
You're getting `ERR_CONNECTION_REFUSED` because the backend server isn't running.

## Solution: Start the Backend Server

### Option 1: Use the Updated Script (Recommended)
```bash
cd backend
./start.sh
```

### Option 2: Manual Commands

1. **Install dependencies** (first time only):
   ```bash
   cd backend
   pip3 install -r requirements.txt
   ```

2. **Install ai_service package** (first time only):
   ```bash
   # From the Reminisce root directory
   pip3 install -e ./ai_service
   ```

3. **Start the server**:
   ```bash
   cd backend
   python3 -m uvicorn app.main:app --reload --port 3000
   ```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:3000 (Press CTRL+C to quit)
INFO:     Started reloader process
🚀 Reminisce Backend starting up...
```

## Verify It's Working

Open your browser: http://localhost:3000/api/health

You should see a JSON response. The frontend errors will disappear once the server is running.

## Running Both Frontend and Backend

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Troubleshooting

### "pip: command not found"
Use `pip3` instead of `pip`:
```bash
pip3 install -r requirements.txt
```

### "uvicorn: command not found"
Use Python module syntax:
```bash
python3 -m uvicorn app.main:app --reload --port 3000
```

### Port Already in Use
If port 3000 is busy, use a different port:
```bash
python3 -m uvicorn app.main:app --reload --port 3001
```
Then update `frontend/.env`:
```
VITE_API_URL=http://localhost:3001/api
```

