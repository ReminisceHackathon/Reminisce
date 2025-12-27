# Port 3000 Already in Use - Quick Fix

## Option 1: Kill the Process Using Port 3000

Find what's using the port:
```bash
lsof -ti:3000
```

Kill it:
```bash
kill -9 $(lsof -ti:3000)
```

Or more safely, just kill the process ID you see:
```bash
# First, see the process
lsof -i:3000

# Then kill it (replace PID with the number from above)
kill -9 PID
```

## Option 2: Use a Different Port (Recommended if you don't know what's using 3000)

Start the backend on port 3001:
```bash
python3 -m uvicorn app.main:app --reload --port 3001
```

Then update your frontend `.env` file:
```env
VITE_API_URL=http://localhost:3001/api
```

And restart your frontend dev server.

## Option 3: Find and Kill the Process Interactively

```bash
# See what's using port 3000
lsof -i:3000

# This shows something like:
# COMMAND   PID        USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node     12345   username   23u  IPv4 0x...      0t0  TCP *:3000 (LISTEN)

# Kill it using the PID (number in second column)
kill -9 12345
```

