# Fix: Project ID Mismatch

## The Issue

You set the gcloud project to `reminisce-hackathon-b44cb`, but the backend config had a default of `reminisce-hackathon` (missing the `-b44cb` suffix).

## Fix Applied

I've updated `backend/app/config.py` to use `reminisce-hackathon-b44cb` as the default project ID to match your gcloud project.

## Setting Quota Project (if needed)

The warning about quota project mismatch can be fixed by running:

```bash
gcloud auth application-default set-quota-project reminisce-hackathon-b44cb
```

**Note:** If you get permission errors with gcloud, you can also set it via environment variable when starting the backend:

```bash
export GOOGLE_CLOUD_PROJECT=reminisce-hackathon-b44cb
export GCP_PROJECT_ID=reminisce-hackathon-b44cb
cd backend
python3 -m uvicorn app.main:app --reload --port 3000
```

Or create a `.env` file in the `backend/` directory:

```env
GCP_PROJECT_ID=reminisce-hackathon-b44cb
GOOGLE_CLOUD_PROJECT=reminisce-hackathon-b44cb
```

## Restart Backend

After fixing the project ID, restart your backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
python3 -m uvicorn app.main:app --reload --port 3000
```

This should resolve the project mismatch issue.

