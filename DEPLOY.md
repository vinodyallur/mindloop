# Host MindLoop — pick one (easiest first)

## Option A · Replit — one click, zero steps (recommended for demo)

1. Go to **replit.com → Create → Import from GitHub** and paste
   `https://github.com/vinodyallur/mindloop`
2. Press **Run**. That's it.
   - The `.replit` + `replit-run.sh` files start the API (port 8000)
     and the web app (port 3000) together automatically.
   - Open the webview URL Replit gives you — onboarding works end-to-end.

## Option B · Vercel — web-only demo mode (no backend needed)

The app ships a **demo mode** that runs the whole journey in the browser:
onboarding, 4 baseline games, daily plan, story report — no server.

1. Go to **vercel.com → Add New → Project** → import `vinodyallur/mindloop`.
   - **Root directory:** `.` (repo root — uses `vercel.json` automatically)
   - **Environment variable:** `NEXT_PUBLIC_DEMO_MODE` = `1`
2. Deploy. Open the URL — everything works, scores stay in the tab session.

To use the **real backend** on Vercel instead, set:
`NEXT_PUBLIC_API_URL` = your API URL, `NEXT_PUBLIC_API_KEY` = same as backend,
and leave `NEXT_PUBLIC_DEMO_MODE` unset — then host the API below.

## Option C · Full stack — Vercel web + Render API

**API (Render, free tier):**
1. **render.com → New → Web Service** → select the repo.
   - Root directory: `services/api`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Env: `MINDLOOP_API_KEY` = long random string,
     `DATABASE_URL` = Render Postgres URL,
     `CORS_ORIGINS` = `https://YOUR-APP.vercel.app`
2. Check `https://YOUR-API.onrender.com/health` → `{"status":"ok"}`.

**Web (Vercel):** same as Option B but with `NEXT_PUBLIC_API_URL` +
`NEXT_PUBLIC_API_KEY` set (no demo mode).

## Option D · Docker anywhere + AWS in one command

```bash
docker compose up --build
# App: http://localhost:3000 · API: http://localhost:8000/health
```

The `Dockerfile` packs backend + frontend into **one image**; `docker-compose.yml`
wires ports and a data volume. Override keys via env:
`MINDLOOP_API_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`.

**AWS paths (same image, pick one):**
- **App Runner (easiest):** ECR → App Runner → point at the image, port 3000.
  Auto-builds from GitHub on push. ~$5/mo idle.
- **ECS Fargate:** push to ECR → task definition (512MB/0.25vCPU is enough) →
  ALB on 3000/8000. Postgres via RDS, set `DATABASE_URL`.
- **EC2 (cheapest):** any `t3.micro` → install Docker → `docker compose up -d`.
  Elastic IP + security group opening 3000/8000.

## After deploy

- Open `/onboarding` on the live URL and complete the flow end-to-end.
- Free-tier backends sleep when idle: first request can take ~30s.
- Never commit real API keys — env vars only.
- SQLite (`mindloop.db`) is dev-only; production uses Postgres `DATABASE_URL`.
