# Deploy MindLoop to Vercel

The frontend (`apps/web`) is a standard Next.js app — Vercel's native use case.
The backend (`services/api`) is FastAPI — it cannot run on Vercel serverless as-is,
so host it on Render/Railway/Fly and point the frontend at it.

## 1 · Backend (Render, free tier)

1. Push this repo to GitHub (already done: `vinodyallur/mindloop`).
2. Go to **render.com → New → Web Service** → select the repo.
   - **Root directory:** `services/api`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** `MINDLOOP_API_KEY` = a long random string,
     `DATABASE_URL` = Render Postgres URL (create a free Postgres first),
     `CORS_ORIGINS` = `https://YOUR-APP.vercel.app`
3. Deploy. Note your URL, e.g. `https://mindloop-api.onrender.com`.
   Check `https://mindloop-api.onrender.com/health` returns `{"status":"ok"}`.

Railway/Fly.io work the same way (Dockerfile-free: same two commands).

## 2 · Frontend (Vercel)

1. Go to **vercel.com → Add New → Project** → import `vinodyallur/mindloop`.
   - **Root directory:** `apps/web`
   - **Framework preset:** Next.js (auto-detected)
   - **Environment variables:**
     - `NEXT_PUBLIC_API_URL` = your backend URL from step 1
     - `NEXT_PUBLIC_API_KEY` = same value as backend `MINDLOOP_API_KEY`
2. Deploy. Your app is live at `https://YOUR-APP.vercel.app`.

## 3 · After deploy

- Open `/onboarding` on the live URL and complete the flow end-to-end.
- Free-tier backends sleep when idle: first request can take ~30s (fine for a demo).
- Never commit real API keys — use Vercel/Render env vars only.
- SQLite (`mindloop.db`) is dev-only; production uses the Postgres `DATABASE_URL`.
