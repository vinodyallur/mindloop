#!/bin/bash
# One-click run for Replit: backend + frontend together.
set -e
cd services/api
pip install -q -r requirements.txt &
PIP_PID=$!
cd ../../apps/web
npm install --no-audit --no-fund &
NPM_PID=$!
wait $PIP_PID
export DATABASE_URL="sqlite:///./mindloop.db"
export MINDLOOP_API_KEY="${MINDLOOP_API_KEY:-demo-key-change-me}"
export CORS_ORIGINS="*"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
wait $NPM_PID
export NEXT_PUBLIC_API_URL="http://localhost:8000"
export NEXT_PUBLIC_API_KEY="${MINDLOOP_API_KEY:-demo-key-change-me}"
npm run dev -- --port 3000 --hostname 0.0.0.0
