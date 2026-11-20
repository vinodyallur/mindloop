# MindLoop — VINSANE INNOVATIONS 1A

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvinodyallur%2Fmindloop&project-name=mindloop&root-directory=apps%2Fweb&env=NEXT_PUBLIC_DEMO_MODE&envDescription=Set+to+1+for+instant+demo+mode+%28no+backend+needed%29&envLink=https%3A%2F%2Fgithub.com%2Fvinodyallur%2Fmindloop%2Fblob%2Fmain%2FDEPLOY.md)
[![Run on Replit](https://replit.com/badge/github/vinodyallur/mindloop)](https://replit.com/github/vinodyallur/mindloop)

**One tap = live app.** No terminal, no installs:
- **Vercel button** → set `NEXT_PUBLIC_DEMO_MODE` to `1` when asked → Deploy → full journey runs in the browser.
- **Replit button** → press Run → backend + frontend boot together.

Attention & wellbeing platform: short browser tasks compared **only with your own personal baseline**, plus sleep/activity context. **Not a diagnostic device** — it does not diagnose ADHD, autism, or any condition, and never infers dopamine or stress from heart rate.

Built per `MindLoop_AI_Agent_Build_Plan.docx` (source of truth). Reuses the partial `neuroguard` scaffold, reframed to the plan's safety boundaries (no composite score, no clinical cut-offs, no risk/ML diagnosis).

## Run (demo, no Docker/Postgres needed)

```powershell
# API  (SQLite dev DB; set DATABASE_URL to Postgres in production)
cd services\api
pip install -r requirements.txt
$env:MINDLOOP_API_KEY="demo-key-change-me"
python -m uvicorn app.main:app --port 8000   # http://localhost:8000/health

# Web
cd apps\web
npm install
npm run dev                                   # http://localhost:3000
```

Demo journey: Home → Assessment (CPT / Go-No-Go / Stroop / Corsi / Reaction) → Dashboard (DEMO wearable cards, RT trend, baseline after 3–5 valid sessions) → Report → Settings (per-category consent, export/delete).

## Tests

```powershell
python -m pytest services\api\tests -q   # 6 tests: scoring, validity, baseline, change rules, wearable dedupe
npm --prefix apps\web run build
```

## Structure

- `apps/web` — Next.js + TypeScript (tasks, dashboard, report, settings)
- `services/api` — FastAPI (`app/main.py` routes §11, `app/analytics.py` transparent scoring/baseline/change, `app/db.py` models §10)
- `docs/` — architecture, privacy & safety, wearable compatibility test
- Wearable: DEMO synthetic adapter only. Fire-Boltt Ultimate 1.39 path (companion app → Health Connect → Android bridge) is **unverified** — see `docs/wearable-compatibility-test.md`. Do not claim HRV/EDA/ECG/stress support.
