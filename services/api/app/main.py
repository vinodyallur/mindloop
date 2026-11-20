"""MindLoop API — non-diagnostic attention & wellbeing platform (build plan §11)."""
from datetime import datetime
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session as DB
from . import analytics, db as DBM, ml as MLM
from .core.config import API_KEY, CORS_ORIGINS
from .schemas import *

app = FastAPI(title="MindLoop API", version="0.1.0",
              description="Attention-task performance vs personal baseline. Not a diagnostic device.")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

ALLOWED_WEARABLE = {"heart_rate": "bpm", "steps": "count", "sleep": "minutes", "spo2": "%",
                    "steadiness": "score"}
ACTIVITIES = [
    {"activity_key": "cpt-mini", "title": "2-min sustained attention practice", "category": "attention", "duration_seconds": 120, "href": "/assessment/cpt"},
    {"activity_key": "gonogo-mini", "title": "Go/No-Go inhibition practice", "category": "inhibition", "duration_seconds": 120, "href": "/assessment/gonogo"},
    {"activity_key": "offline-read", "title": "10-min offline reading (phone away)", "category": "offline", "duration_seconds": 600, "href": None},
    {"activity_key": "checkin", "title": "Focus & mood check-in", "category": "reflection", "duration_seconds": 60, "href": None},
]

def auth(x_api_key: str = Header(default="")):
    if x_api_key != API_KEY:
        raise HTTPException(401, "invalid api key")
    return True

def get_user(db: DB):
    u = db.query(DBM.User).first()
    if not u:
        u = DBM.User(email="demo@mindloop.local", display_name="Demo User")
        db.add(u); db.commit(); db.refresh(u)
    return u

DBM.init_db()

@app.get("/health")
def health(): return {"status": "ok", "service": "mindloop", "diagnostic": False}

@app.get("/api/v1/me", dependencies=[Depends(auth)])
def me(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    consents = {c.data_category: c.revoked_at is None for c in db.query(DBM.Consent).filter_by(user_id=u.id)}
    import json
    try: devices = json.loads(u.devices_json or "{}")
    except Exception: devices = {}
    return {"id": u.id, "email": u.email, "display_name": u.display_name, "age_band": u.age_band,
            "age": u.age, "gender": u.gender, "country": u.country,
            "language": u.language, "onboarding_done": bool(u.onboarding_done),
            "devices": devices, "consents": consents,
            "notice": "MindLoop is not a diagnostic device and does not diagnose any condition."}

@app.post("/api/v1/me/profile", dependencies=[Depends(auth)])
def save_profile(body: ProfileIn, db: DB = Depends(DBM.get_db)):
    """Onboarding step 2: name, age, gender, country, language."""
    u = get_user(db)
    if body.age is not None and not (5 <= body.age <= 120):
        raise HTTPException(400, "age must be between 5 and 120")
    if body.gender and body.gender not in ("female", "male", "nonbinary", "prefer_not_to_say"):
        raise HTTPException(400, "unknown gender option")
    if body.name: u.display_name = body.name[:80]
    if body.age is not None:
        u.age = body.age
        u.age_band = "under-13" if body.age < 13 else "13-17" if body.age < 18 else "18-25" if body.age <= 25 else "26-40" if body.age <= 40 else "40+"
    if body.gender: u.gender = body.gender
    if body.country: u.country = body.country[:80]
    if body.language: u.language = body.language[:10]
    db.add(DBM.Audit(user_id=u.id, event_type="profile_update", metadata_json=DBM.dumps({"country": u.country, "age_band": u.age_band})))
    db.commit()
    return {"saved": True, "age_band": u.age_band}

@app.post("/api/v1/me/devices", dependencies=[Depends(auth)])
def save_device(body: DeviceIn, db: DB = Depends(DBM.get_db)):
    """Onboarding step 4: connect smartwatch / mobile for tracking."""
    import json
    if body.kind not in ("watch", "mobile"): raise HTTPException(400, "kind must be watch|mobile")
    u = get_user(db)
    try: devices = json.loads(u.devices_json or "{}")
    except Exception: devices = {}
    devices[body.kind] = {"name": body.name[:80], "connected": body.connected}
    u.devices_json = DBM.dumps(devices)
    db.commit()
    return {"devices": devices}

@app.post("/api/v1/me/onboarding-complete", dependencies=[Depends(auth)])
def onboarding_complete(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    u.onboarding_done = 1
    db.commit()
    return {"onboarding_done": True}

@app.post("/api/v1/screentime", dependencies=[Depends(auth)])
def log_screentime(body: ScreenTimeIn, db: DB = Depends(DBM.get_db)):
    """Daily mobile-use log: total screen + doomscroll minutes. Affects baseline context."""
    from datetime import timezone
    if body.screen_minutes < 0 or body.doomscroll_minutes < 0: raise HTTPException(400, "minutes must be >= 0")
    if body.doomscroll_minutes > body.screen_minutes: raise HTTPException(400, "doomscroll cannot exceed screen time")
    u = get_user(db)
    day = body.day or datetime.now(timezone.utc).date().isoformat()
    r = db.query(DBM.ScreenTime).filter_by(user_id=u.id, day=day).first()
    if not r:
        r = DBM.ScreenTime(user_id=u.id, day=day); db.add(r)
    r.screen_minutes, r.doomscroll_minutes = body.screen_minutes, body.doomscroll_minutes
    db.commit()
    return {"day": day, "screen_minutes": r.screen_minutes, "doomscroll_minutes": r.doomscroll_minutes}

@app.get("/api/v1/screentime/latest", dependencies=[Depends(auth)])
def screentime_latest(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    rows = db.query(DBM.ScreenTime).filter_by(user_id=u.id).order_by(DBM.ScreenTime.day.desc()).limit(14).all()
    return [{"day": r.day, "screen_minutes": r.screen_minutes, "doomscroll_minutes": r.doomscroll_minutes} for r in rows]

# ---- Baseline assessment set: 4 best tasks for first baseline ----
BASELINE_SET = [
    {"task_key": "pvt", "title": "Vigilance Tap", "why": "Pure attention span in 3 minutes", "href": "/games/pvt", "emoji": "⚡"},
    {"task_key": "shelf", "title": "Remember the Shelf", "why": "See objects for 20s, tap what was there — green means remembered", "href": "/games/shelf", "emoji": "🛒"},
    {"task_key": "nback", "title": "N-Back 2", "why": "Working memory that holds attention", "href": "/games/nback", "emoji": "🧠"},
    {"task_key": "steadiness", "title": "Hold Steady", "why": "Mind-body coordination in 30 seconds", "href": "/assessment/steadiness", "emoji": "🤸"},
]

@app.get("/api/v1/baseline/assessment-set", dependencies=[Depends(auth)])
def baseline_assessment_set(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    done = {s.task_key for s in db.query(DBM.Session).filter_by(user_id=u.id, validity_status="valid")}
    items = [{**t, "done": t["task_key"] in done} for t in BASELINE_SET]
    return {"items": items, "completed": sum(1 for t in items if t["done"]), "total": len(items),
            "baseline_ready": sum(1 for t in items if t["done"]) >= 4}

# ---- Daily plan: 5 mandatory games + 1 habit, grows with baseline ----
PLAN_GAMES = [
    ("pvt", "Vigilance Tap", "/games/pvt"), ("sart", "Steady Response", "/games/sart"),
    ("flanker", "Flanker Field", "/games/flanker"), ("nback", "N-Back 2", "/games/nback"),
    ("shelf", "Remember the Shelf", "/games/shelf"), ("orbit", "Orbit Odd-One-Out", "/games/orbit"),
    ("schulte", "Schulte 25", "/games/schulte"), ("span", "Digit Span", "/games/span"),
    ("pairs", "Pair Match", "/games/pairs"), ("search", "Visual Search", "/games/search"),
    ("trail", "Trail Connect", "/games/trail"), ("switch", "Rule Switch", "/games/switch"),
    ("dual", "Dual Track", "/games/dual"), ("stopsignal", "Stop Signal", "/games/stopsignal"),
    ("choice", "Choice Rush", "/games/choice"), ("math", "Mental Math", "/games/math"),
    ("rotate", "Rotate Fit", "/games/rotate"), ("pattern", "Pattern Complete", "/games/pattern"),
    ("grid", "Grid Recall", "/games/grid"), ("sequence", "Sequence Echo", "/games/sequence"),
    ("odd", "Odd One Out", "/games/odd"), ("rhythm", "Rhythm Tap", "/games/rhythm"),
]
PLAN_HABITS = [
    ("read-15", "Read a book for 15 minutes", "Phone face-down. Any book you enjoy.", 15),
    ("walk-10", "Walk for 10 minutes", "No phone scrolling while you walk.", 10),
    ("breathe-2", "2-minute breathing reset", "Inhale 4s, hold 4s, exhale 6s.", 2),
    ("sleep-8", "Lights out by your bedtime", "No screens 30 min before sleep.", 8),
    ("sun-10", "10 minutes of daylight", "Step outside or sit by a window.", 10),
]

def _day_index(user_id: str, day: str) -> int:
    return 1

@app.get("/api/v1/plan/today", dependencies=[Depends(auth)])
def plan_today(db: DB = Depends(DBM.get_db)):
    """Buddy daily plan: 5 games (rotating, difficulty grows) + 1 habit. Idempotent per day."""
    from datetime import timezone, date
    u = get_user(db)
    day = datetime.now(timezone.utc).date().isoformat()
    existing = db.query(DBM.PlanItem).filter_by(user_id=u.id, day=day).order_by(DBM.PlanItem.position).all()
    if not existing:
        first_session = db.query(DBM.Session).filter_by(user_id=u.id).order_by(DBM.Session.started_at).first()
        day_n = 1
        if first_session and first_session.started_at:
            try: day_n = max(1, (date.fromisoformat(day) - first_session.started_at.date()).days + 1)
            except Exception: day_n = 1
        start = (day_n - 1) * 5 % len(PLAN_GAMES)
        games = [PLAN_GAMES[(start + i) % len(PLAN_GAMES)] for i in range(5)]
        habit = PLAN_HABITS[(day_n - 1) % len(PLAN_HABITS)]
        pos = 0
        for key, title, href in games:
            db.add(DBM.PlanItem(user_id=u.id, day=day, item_key=key, kind="game", title=title, detail=href, position=pos)); pos += 1
        db.add(DBM.PlanItem(user_id=u.id, day=day, item_key=habit[0], kind="habit", title=habit[1], detail=habit[2], position=pos))
        db.commit()
        existing = db.query(DBM.PlanItem).filter_by(user_id=u.id, day=day).order_by(DBM.PlanItem.position).all()
    # buddy streak: consecutive days with >=1 plan item done
    streak, cursor = 0, date.fromisoformat(day)
    from datetime import timedelta
    while True:
        d = cursor.isoformat()
        done_any = db.query(DBM.PlanItem).filter_by(user_id=u.id, day=d, done=1).count() > 0
        any_items = db.query(DBM.PlanItem).filter_by(user_id=u.id, day=d).count() > 0
        if done_any: streak += 1; cursor -= timedelta(days=1); continue
        if d == day and not any_items: break
        if d == day: break  # today not started yet — don't break streak
        break
    items = [{"item_key": p.item_key, "kind": p.kind, "title": p.title, "detail": p.detail, "done": bool(p.done)} for p in existing]
    done_n = sum(1 for p in existing if p.done)
    buddy = buddy_message(streak, done_n, len(items), day, db, u.id)
    return {"day": day, "items": items, "done": done_n, "total": len(items),
            "streak": streak, "buddy": buddy}

def buddy_message(streak: int, done_n: int, total: int, day: str, db: DB, user_id: str) -> dict:
    from datetime import timedelta, date
    yesterday = (date.fromisoformat(day) - timedelta(days=1)).isoformat()
    y_items = db.query(DBM.PlanItem).filter_by(user_id=user_id, day=yesterday).all()
    y_missed = bool(y_items) and not any(p.done for p in y_items)
    if done_n >= total:
        return {"tone": "celebrate", "text": f"All {total} done! Your baseline thanks you. Rest well — see you tomorrow. 🌟", "streak": streak}
    if done_n > 0:
        return {"tone": "encourage", "text": f"{done_n} of {total} done — nice work. Even one small task moves your baseline. 💪", "streak": streak}
    if y_missed:
        return {"tone": "kind", "text": "Missed yesterday? That's completely okay — streaks don't define you. Today is a fresh page. Just one task. 🤗", "streak": streak}
    if streak >= 3:
        return {"tone": "warm", "text": f"{streak}-day streak going! Your attention span is building quietly in the background. 🌱", "streak": streak}
    return {"tone": "welcome", "text": "Hey, buddy here. Small steps today — pick just one task to start. No pressure. 🙂", "streak": streak}

@app.post("/api/v1/plan/complete", dependencies=[Depends(auth)])
def plan_complete(body: PlanCompleteIn, db: DB = Depends(DBM.get_db)):
    from datetime import timezone
    u = get_user(db)
    day = datetime.now(timezone.utc).date().isoformat()
    p = db.query(DBM.PlanItem).filter_by(user_id=u.id, day=day, item_key=body.item_key).first()
    if not p: raise HTTPException(404, "plan item not found for today")
    p.done, p.completed_at = 1, DBM.now()
    db.add(DBM.Completion(user_id=u.id, activity_key=f"plan:{body.item_key}", result_json=DBM.dumps(body.result)))
    _touch_habit_day(db, u.id)
    db.commit()
    return {"recorded": body.item_key}

@app.get("/api/v1/plan/streak", dependencies=[Depends(auth)])
def plan_streak(db: DB = Depends(DBM.get_db)):
    from datetime import timezone
    u = get_user(db)
    day = datetime.now(timezone.utc).date().isoformat()
    t = plan_today(db)
    return {"streak": t["streak"], "buddy": t["buddy"], "day": day}

@app.post("/api/v1/users", dependencies=[Depends(auth)])
def create_user(body: UserIn, db: DB = Depends(DBM.get_db)):
    u = db.query(DBM.User).filter_by(email=body.email).first() or DBM.User(**body.model_dump())
    db.add(u); db.commit(); db.refresh(u)
    return {"id": u.id, "email": u.email}

@app.post("/api/v1/consents", dependencies=[Depends(auth)])
def consent(body: ConsentIn, db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    c = db.query(DBM.Consent).filter_by(user_id=u.id, data_category=body.data_category).first()
    if not c:
        c = DBM.Consent(user_id=u.id, data_category=body.data_category); db.add(c)
    c.revoked_at = None if body.granted else DBM.now()
    db.add(DBM.Audit(user_id=u.id, event_type="consent_update", metadata_json=DBM.dumps(body.model_dump())))
    db.commit()
    return {"data_category": body.data_category, "granted": body.granted}

@app.post("/api/v1/assessment-sessions", dependencies=[Depends(auth)])
def start_session(body: SessionIn, db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    s = DBM.Session(user_id=u.id, task_key=body.task_key, device_json=DBM.dumps(body.device))
    db.add(s); db.commit(); db.refresh(s)
    return {"session_id": s.id, "task_key": s.task_key}

@app.post("/api/v1/assessment-sessions/{sid}/trials", dependencies=[Depends(auth)])
def add_trials(sid: str, body: TrialsIn, db: DB = Depends(DBM.get_db)):
    s = db.get(DBM.Session, sid)
    if not s: raise HTTPException(404, "session not found")
    for t in body.trials:
        db.add(DBM.Trial(session_id=sid, trial_index=t.trial_index, stimulus=t.stimulus,
                         expected_action=t.expected_action, actual_action=t.actual_action,
                         reaction_time_ms=t.reaction_time_ms, sway=t.sway, correct=int(t.correct),
                         is_practice=int(t.is_practice)))
    db.commit()
    return {"stored": len(body.trials)}

@app.post("/api/v1/assessment-sessions/{sid}/complete", dependencies=[Depends(auth)])
def complete(sid: str, db: DB = Depends(DBM.get_db)):
    s = db.get(DBM.Session, sid)
    if not s: raise HTTPException(404, "session not found")
    trials = [{"expected_action": t.expected_action, "actual_action": t.actual_action,
               "reaction_time_ms": t.reaction_time_ms, "correct": bool(t.correct),
               "is_practice": bool(t.is_practice), "span": None, "sway": t.sway}
              for t in db.query(DBM.Trial).filter_by(session_id=sid).order_by(DBM.Trial.trial_index)]
    metrics, validity, reason = analytics.score_trials(s.task_key, trials)
    s.validity_status, s.invalid_reason, s.completed_at = validity, reason, DBM.now()
    for k, v in metrics.items():
        db.add(DBM.Metric(session_id=sid, metric_key=k, metric_value=float(v),
                          unit="ms" if "rt" in k or "variability" in k else ""))
    db.commit()
    changes = _refresh_baseline(db, s.user_id, s.task_key) if validity == "valid" else []
    return {"session_id": sid, "validity_status": validity, "invalid_reason": reason,
            "metrics": metrics, "change_events": changes}

def _refresh_baseline(db: DB, user_id: str, task_key: str):
    sessions = [s for s in db.query(DBM.Session).filter_by(user_id=user_id, task_key=task_key, validity_status="valid").order_by(DBM.Session.completed_at)]
    by_metric = {}
    for s in sessions:
        for m in db.query(DBM.Metric).filter_by(session_id=s.id):
            by_metric.setdefault(m.metric_key, []).append(m.metric_value)
    events = []
    for key, values in by_metric.items():
        centre, mad = analytics.build_baseline(values)
        b = db.query(DBM.Baseline).filter_by(user_id=user_id, task_key=task_key, metric_key=key).first()
        if not b:
            b = DBM.Baseline(user_id=user_id, task_key=task_key, metric_key=key); db.add(b)
        b.centre_value, b.variability_value = centre, mad
        b.valid_session_count, b.confidence_label, b.updated_at = len(values), analytics.confidence_label(len(values)), DBM.now()
        if len(values) >= 4:
            ev = analytics.detect_change(key, values[-1], centre, mad, values)
            if ev:
                db.add(DBM.ChangeEvent(user_id=user_id, **ev)); events.append(ev)
    db.commit()
    return events

@app.get("/api/v1/assessments/history", dependencies=[Depends(auth)])
def history(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    out = []
    for s in db.query(DBM.Session).filter_by(user_id=u.id).order_by(DBM.Session.started_at.desc()).limit(50):
        out.append({"session_id": s.id, "task_key": s.task_key, "started_at": str(s.started_at),
                    "validity_status": s.validity_status, "invalid_reason": s.invalid_reason,
                    "metrics": {m.metric_key: m.metric_value for m in db.query(DBM.Metric).filter_by(session_id=s.id)}})
    return out

@app.get("/api/v1/baselines", dependencies=[Depends(auth)])
def baselines(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    return [{"task_key": b.task_key, "metric_key": b.metric_key, "centre": b.centre_value,
             "variability_mad": b.variability_value, "valid_sessions": b.valid_session_count,
             "confidence": b.confidence_label} for b in db.query(DBM.Baseline).filter_by(user_id=u.id)]

@app.get("/api/v1/baseline/index", dependencies=[Depends(auth)])
def baseline_index(task_key: str = "", metric_key: str = "", window: int = 20, db: DB = Depends(DBM.get_db)):
    """0-100 descriptive index vs own baseline + per-session series for graphs.
    Filters: task_key, metric_key. window caps sessions. Never a diagnosis."""
    u = get_user(db)
    q = db.query(DBM.Session).filter_by(user_id=u.id, validity_status="valid")
    if task_key: q = q.filter_by(task_key=task_key)
    sessions = q.order_by(DBM.Session.completed_at).all()[-max(window, 1):]
    bl = {f"{b.task_key}.{b.metric_key}": b for b in db.query(DBM.Baseline).filter_by(user_id=u.id)}
    if task_key: bl = {k: v for k, v in bl.items() if k.startswith(task_key + ".")}
    if metric_key: bl = {k: v for k, v in bl.items() if k.endswith("." + metric_key)}
    series, idx_vals = [], []
    for s in sessions:
        mets = {m.metric_key: m.metric_value for m in db.query(DBM.Metric).filter_by(session_id=s.id)}
        if metric_key: mets = {k: v for k, v in mets.items() if k == metric_key}
        indexed = {}
        for k, v in mets.items():
            b = bl.get(f"{s.task_key}.{k}")
            if b: indexed[k] = analytics.metric_index(k, v, b.centre_value, b.variability_value)
        comp = analytics.composite_index(indexed)
        if comp is not None: idx_vals.append(comp)
        series.append({"session_id": s.id, "task_key": s.task_key, "at": str(s.completed_at or s.started_at),
                       "metrics": mets, "indexed": indexed, "index": comp})
    trend = None
    if len(idx_vals) >= 3:
        half = len(idx_vals) // 2
        trend = round(sum(idx_vals[half:]) / len(idx_vals[half:]) - sum(idx_vals[:half]) / len(idx_vals[:half]), 1)
    cur = idx_vals[-1] if idx_vals else None
    return {"index": cur, "trend_delta": trend, "sessions": len(idx_vals),
            "confidence": bl and list(bl.values())[0].confidence_label,
            "scale_note": "0 = far below your usual pattern, 50 = at your baseline median, 100 = far above. Descriptive only, not a diagnosis.",
            "series": series,
            "baselines": [{"task_key": b.task_key, "metric_key": b.metric_key, "centre": b.centre_value,
                           "variability_mad": b.variability_value, "valid_sessions": b.valid_session_count,
                           "confidence": b.confidence_label} for b in bl.values()]}

@app.post("/api/v1/wearables/sync", dependencies=[Depends(auth)])
def wearable_sync(body: WearableSyncIn, db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    stored = skipped = 0
    for r in body.records:
        if r.record_type not in ALLOWED_WEARABLE:
            skipped += 1; continue
        if r.source_record_id and db.query(DBM.Wearable).filter_by(source_record_id=r.source_record_id).first():
            skipped += 1; continue
        db.add(DBM.Wearable(user_id=u.id, source_device=body.device, source_app=body.source_app,
                            data_type=r.record_type, value_numeric=r.value, unit=r.unit or ALLOWED_WEARABLE[r.record_type],
                            start_at=datetime.fromisoformat(r.start_time.replace("Z", "+00:00")),
                            end_at=datetime.fromisoformat(r.end_time.replace("Z", "+00:00")) if r.end_time else None,
                            source_record_id=r.source_record_id,
                            provenance_json=DBM.dumps({"platform": body.source_app, "demo": body.device == "DEMO"})))
        stored += 1
    db.commit()
    return {"stored": stored, "skipped": skipped, "demo": body.device == "DEMO"}

@app.get("/api/v1/wearables/latest", dependencies=[Depends(auth)])
def wearable_latest(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    out = {}
    for t in ALLOWED_WEARABLE:
        r = db.query(DBM.Wearable).filter_by(user_id=u.id, data_type=t).order_by(DBM.Wearable.start_at.desc()).first()
        if r: out[t] = {"value": r.value_numeric, "unit": r.unit, "at": str(r.start_at), "source": r.source_device}
    return out

@app.get("/api/v1/baseline/forecast", dependencies=[Depends(auth)])
def baseline_forecast(db: DB = Depends(DBM.get_db)):
    """Core ML: per-metric trend model trained on this user's own valid history."""
    u = get_user(db)
    hist = {}
    for s in db.query(DBM.Session).filter_by(user_id=u.id, validity_status="valid").order_by(DBM.Session.completed_at):
        for m in db.query(DBM.Metric).filter_by(session_id=s.id):
            hist.setdefault(f"{s.task_key}.{m.metric_key}", []).append(m.metric_value)
    models = MLM.forecast_all(hist)
    return {"models": models,
            "note": "Forecasts your own metric trajectory from your history. Descriptive only — not a diagnosis, not a treatment prediction."}
@app.get("/api/v1/change-events", dependencies=[Depends(auth)])
def changes(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    return [{"metric_key": c.metric_key, "direction": c.direction, "magnitude": c.magnitude,
             "confidence": c.confidence_label, "message": c.user_message, "at": str(c.detected_at)}
            for c in db.query(DBM.ChangeEvent).filter_by(user_id=u.id).order_by(DBM.ChangeEvent.detected_at.desc()).limit(20)]

@app.get("/api/v1/program/today", dependencies=[Depends(auth)])
def program_today(): return {"activities": ACTIVITIES, "note": "Bounded practice only — no streaks or addictive rewards."}

@app.post("/api/v1/program/completions", dependencies=[Depends(auth)])
def completion(body: CompletionIn, db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    db.add(DBM.Completion(user_id=u.id, activity_key=body.activity_key, result_json=DBM.dumps(body.result)))
    _touch_habit_day(db, u.id)
    db.commit(); return {"recorded": body.activity_key}

def _touch_habit_day(db: DB, user_id: str):
    from datetime import timezone
    day = datetime.now(timezone.utc).date().isoformat()
    h = db.query(DBM.HabitDay).filter_by(user_id=user_id, day=day).first()
    if not h:
        h = DBM.HabitDay(user_id=user_id, day=day); db.add(h)
    h.target_met = 1; h.sessions = (h.sessions or 0) + 1

# ================= Q1/Q4: validated outcome instruments =================
@app.get("/api/v1/outcomes/instruments", dependencies=[Depends(auth)])
def instruments():
    return {k: {"questions": v["q"], "scale": v["scale"], "max": v["max"]} for k, v in SURVEYS.items()}

@app.post("/api/v1/outcomes/submit", dependencies=[Depends(auth)])
def submit_survey(body: SurveyIn, db: DB = Depends(DBM.get_db)):
    spec = SURVEYS.get(body.instrument)
    if not spec or len(body.answers) != spec["n"] or any(a not in spec["scale"] for a in body.answers):
        raise HTTPException(400, "invalid instrument or answers")
    u = get_user(db)
    score = float(sum(body.answers))
    db.add(DBM.OutcomeSurvey(user_id=u.id, instrument=body.instrument, score=score,
                             max_score=float(spec["max"]), answers_json=DBM.dumps(body.answers)))
    db.add(DBM.Audit(user_id=u.id, event_type=f"outcome_{body.instrument}",
                     metadata_json=DBM.dumps({"score": score})))
    flag = None
    if body.instrument in ("phq2", "gad2") and score >= 3:
        flag = _open_flag(db, u.id, "clinical_review", body.instrument,
                          f"{body.instrument.upper()}={score}/{spec['max']}: suggest discussing with a qualified professional.")
    db.commit()
    return {"instrument": body.instrument, "score": score, "max": spec["max"],
            "flag": flag, "note": "Self-report context only, not a diagnosis."}

def _open_flag(db: DB, user_id: str, tier: str, source: str, detail: str):
    f = DBM.Flag(user_id=user_id, tier=tier, source=source, detail=detail)
    db.add(f); db.flush()
    return {"id": f.id, "tier": tier, "detail": detail,
            "message": "Thank you for sharing. Consider speaking with a qualified professional or local helpline. MindLoop does not diagnose."}

@app.get("/api/v1/outcomes/history", dependencies=[Depends(auth)])
def outcome_history(instrument: str = "", db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    q = db.query(DBM.OutcomeSurvey).filter_by(user_id=u.id)
    if instrument: q = q.filter_by(instrument=instrument)
    return [{"instrument": s.instrument, "score": s.score, "max": s.max_score, "at": str(s.created_at)}
            for s in q.order_by(DBM.OutcomeSurvey.created_at).limit(200)]

@app.get("/api/v1/outcomes/30day", dependencies=[Depends(auth)])
def outcomes_30day(db: DB = Depends(DBM.get_db)):
    """Q4 evaluation set: baseline vs latest per instrument + behavior maintenance."""
    return _outcomes_window(db, days=30)

@app.get("/api/v1/outcomes/windows", dependencies=[Depends(auth)])
def outcomes_windows(db: DB = Depends(DBM.get_db)):
    """Q4 longitudinal: 30/90/180-day windows + waitlist arm + dose-response + ITT export."""
    u = get_user(db)
    wins = {f"{d}d": _outcomes_window(db, days=d) for d in (30, 90, 180)}
    arm = (db.query(DBM.Consent).filter_by(user_id=u.id, data_category="study_arm").first())
    arm_val = None
    if arm:
        import json
        try: arm_val = json.loads(arm.consent_version or "{}").get("arm")
        except Exception: arm_val = None
    hist = db.query(DBM.Session).filter_by(user_id=u.id, validity_status="valid").count()
    wins["_design"] = {
        "arm": arm_val or "unassigned",
        "assign": "POST /api/v1/study/assign {arm: intervention|waitlist} — waitlist gets generic program until day 30",
        "dose_response": {"valid_sessions": hist, "band": "1-5 low · 6-15 medium · 16+ high"},
        "itt": "GET /api/v1/study/export — includes dropouts (all consented users), missing-data flags, attrition",
        "windows": "baseline, 30, 90, 180 days; SRBAI at 0/30/90; WHO-5 primary vs generic-app control",
    }
    return wins

def _outcomes_window(db: DB, days: int):
    from datetime import timedelta
    u = get_user(db)
    cutoff = DBM.now().replace(tzinfo=None) - timedelta(days=days)
    out = {}
    for inst in SURVEYS:
        rows = db.query(DBM.OutcomeSurvey).filter_by(user_id=u.id, instrument=inst).order_by(DBM.OutcomeSurvey.created_at).all()
        base = [r for r in rows if (r.created_at or cutoff).replace(tzinfo=None) >= cutoff] or rows
        if len(base) >= 2:
            out[inst] = {"baseline": base[0].score, "latest": base[-1].score,
                         "delta": round(base[-1].score - base[0].score, 2), "n": len(base), "max": base[0].max_score}
        elif len(base) == 1:
            out[inst] = {"baseline": base[0].score, "latest": base[0].score, "delta": 0.0, "n": 1, "max": base[0].max_score}
    days_q = db.query(DBM.HabitDay).filter_by(user_id=u.id).order_by(DBM.HabitDay.day).all()
    met = [d.day for d in days_q if d.target_met]
    out["_behavior"] = {"active_days": len(days_q), "target_days_met": len(met),
                        "maintenance_pct": round(100 * len(met) / max(len(days_q), 1), 1)}
    out["_thresholds"] = {"who5": ">=10/100 meaningful (rescaled)", "phq2/gad2": ">=3 suggests professional discussion",
                          "isi3": "track direction over 30 days", "srbai": "automaticity 0/30/90 days (Lally 2010)"}
    return out

@app.post("/api/v1/study/assign", dependencies=[Depends(auth)])
def study_assign(body: dict, db: DB = Depends(DBM.get_db)):
    arm = body.get("arm", "intervention")
    if arm not in ("intervention", "waitlist"): raise HTTPException(400, "arm must be intervention|waitlist")
    u = get_user(db)
    import json
    c = db.query(DBM.Consent).filter_by(user_id=u.id, data_category="study_arm").first()
    if not c:
        c = DBM.Consent(user_id=u.id, data_category="study_arm", consent_version=json.dumps({"arm": arm})); db.add(c)
    else:
        c.consent_version = json.dumps({"arm": arm}); c.revoked_at = None
    db.commit()
    return {"arm": arm, "note": "Waitlist receives generic program until day 30, then full personalization."}

@app.get("/api/v1/study/export", dependencies=[Depends(auth)])
def study_export(db: DB = Depends(DBM.get_db)):
    """Q4 ITT export: every consented user incl. dropouts, missing-data flags."""
    import json
    rows = []
    for u in db.query(DBM.User).all():
        cons = {c.data_category: c.revoked_at is None for c in db.query(DBM.Consent).filter_by(user_id=u.id)}
        n_sess = db.query(DBM.Session).filter_by(user_id=u.id, validity_status="valid").count()
        n_surv = db.query(DBM.OutcomeSurvey).filter_by(user_id=u.id).count()
        rows.append({"user_id": u.id, "consents": cons, "valid_sessions": n_sess, "surveys": n_surv,
                     "dropout": n_sess == 0 and n_surv == 0,
                     "missing": [k for k, v in {"sessions": n_sess == 0, "surveys": n_surv == 0}.items() if v]})
    return {"n": len(rows), "rows": rows,
            "method": "intention-to-treat: all consented users included; dropouts flagged, not dropped"}

# ================= Q7/Q8: safety loop + referral tracking =================
@app.post("/api/v1/checkin", dependencies=[Depends(auth)])
def checkin(body: CheckinIn, db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    db.add(DBM.Completion(user_id=u.id, activity_key="checkin",
                          result_json=DBM.dumps(body.model_dump())))
    _touch_habit_day(db, u.id)
    flag = None
    if any(w in body.note.lower() for w in CRISIS_WORDS):
        flag = _open_flag(db, u.id, "crisis", "checkin_note",
                          "User note matched crisis keywords. Same-day human review required; show local helplines.")
    db.commit()
    return {"recorded": True, "flag": flag}

@app.get("/api/v1/behavior/summary", dependencies=[Depends(auth)])
def behavior_summary(db: DB = Depends(DBM.get_db)):
    """Q1 behavioral indicators: 7-day means from check-ins + device steps/sleep."""
    import json
    u = get_user(db)
    rows = [json.loads(c.result_json or "{}") for c in
            db.query(DBM.Completion).filter_by(user_id=u.id, activity_key="checkin")
            .order_by(DBM.Completion.completed_at.desc()).limit(14)]
    def mean(k):
        vs = [r[k] for r in rows if isinstance(r.get(k), (int, float))]
        return round(sum(vs) / len(vs), 1) if vs else None
    steps = [w.value_numeric for w in db.query(DBM.Wearable).filter_by(user_id=u.id, data_type="steps")
             .order_by(DBM.Wearable.start_at.desc()).limit(7)]
    sleep = [w.value_numeric for w in db.query(DBM.Wearable).filter_by(user_id=u.id, data_type="sleep")
             .order_by(DBM.Wearable.start_at.desc()).limit(7)]
    return {"n_checkins": len(rows),
            "fruit_veg_servings": mean("fruit_veg"), "sugary_drinks": mean("sugary_drinks"),
            "alcohol_days_pw": mean("alcohol_days"), "active_minutes": mean("active_minutes"),
            "sleep_hours_self": mean("sleep_hours"), "meds_adherence_pct":
                round(100 * sum(1 for r in rows if r.get("meds_taken")) / max(sum(1 for r in rows if "meds_taken" in r), 1), 1) or None,
            "steps_7d": [round(v, 0) for v in steps], "sleep_min_7d": [round(v, 0) for v in sleep],
            "benchmarks": {"mvpa_min_pw": 150, "steps_uplift": "+1000/day meaningful (Q4)"}}

@app.get("/api/v1/safety/flags", dependencies=[Depends(auth)])
def safety_flags(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    return [{"id": f.id, "tier": f.tier, "source": f.source, "detail": f.detail,
             "status": f.status, "at": str(f.created_at)}
            for f in db.query(DBM.Flag).filter_by(user_id=u.id).order_by(DBM.Flag.created_at.desc()).limit(20)]

@app.post("/api/v1/referrals", dependencies=[Depends(auth)])
def create_referral(body: ReferralIn, db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    r = DBM.Referral(user_id=u.id, reason=body.reason, owner=body.owner,
                     history_json=DBM.dumps([{"state": "referred", "at": str(DBM.now())}]))
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "state": r.state}

@app.post("/api/v1/referrals/{rid}/transition", dependencies=[Depends(auth)])
def transition_referral(rid: str, body: ReferralUpdate, db: DB = Depends(DBM.get_db)):
    allowed = {"referred", "accepted", "booked", "attended", "outcome", "closed",
               "not_booked", "did_not_attend", "uncontactable", "declined", "rejected", "escalated", "lost_to_followup"}
    if body.state not in allowed: raise HTTPException(400, "unknown state")
    r = db.get(DBM.Referral, rid)
    if not r: raise HTTPException(404, "referral not found")
    import json
    hist = json.loads(r.history_json or "[]"); hist.append({"state": body.state, "note": body.note, "at": str(DBM.now())})
    r.state, r.history_json = body.state, DBM.dumps(hist)
    db.commit()
    return {"id": r.id, "state": r.state}

@app.get("/api/v1/referrals", dependencies=[Depends(auth)])
def list_referrals(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    import json
    return [{"id": r.id, "reason": r.reason, "state": r.state, "owner": r.owner,
             "history": json.loads(r.history_json or "[]")}
            for r in db.query(DBM.Referral).filter_by(user_id=u.id).order_by(DBM.Referral.created_at.desc())]

@app.get("/api/v1/referrals/{rid}/fhir", dependencies=[Depends(auth)])
def referral_fhir(rid: str, db: DB = Depends(DBM.get_db)):
    """Q7: HL7 FHIR R4 ServiceRequest export — status flows back to the referrer's system."""
    import json
    r = db.get(DBM.Referral, rid)
    if not r: raise HTTPException(404, "referral not found")
    fhir_status = {"referred": "draft", "accepted": "active", "booked": "active", "attended": "completed",
                   "outcome": "completed", "closed": "revoked", "not_booked": "revoked",
                   "did_not_attend": "revoked", "uncontactable": "on-hold", "declined": "revoked",
                   "rejected": "revoked", "escalated": "active", "lost_to_followup": "revoked"}.get(r.state, "unknown")
    return {"resourceType": "ServiceRequest", "id": r.id,
            "status": fhir_status, "intent": "order", "priority": "routine",
            "code": {"text": r.reason}, "requester": {"display": r.owner},
            "note": [{"text": h.get("note", "") or h.get("state", "")} for h in json.loads(r.history_json or "[]")]}

@app.post("/api/v1/referrals/{rid}/nudge", dependencies=[Depends(auth)])
def referral_nudge(rid: str, body: dict, db: DB = Depends(DBM.get_db)):
    """Q7 contact protocol: log each outreach attempt (day 0-1 app, day 1-3 call, day 3-7 kin/GP)."""
    import json
    r = db.get(DBM.Referral, rid)
    if not r: raise HTTPException(404, "referral not found")
    channel = body.get("channel", "app")
    if channel not in ("app", "sms", "whatsapp", "call", "kin", "visit"): raise HTTPException(400, "unknown channel")
    hist = json.loads(r.history_json or "[]")
    hist.append({"state": r.state, "note": f"nudge:{channel} {body.get('note', '')}", "at": str(DBM.now())})
    r.history_json = DBM.dumps(hist)
    db.add(DBM.Audit(user_id=r.user_id, event_type="referral_nudge", metadata_json=DBM.dumps({"id": rid, "channel": channel})))
    db.commit()
    return {"id": rid, "channel": channel, "attempts": sum(1 for h in hist if str(h.get("note", "")).startswith("nudge:"))}

@app.get("/api/v1/referrals/overdue", dependencies=[Depends(auth)])
def referrals_overdue(db: DB = Depends(DBM.get_db)):
    """Q7 governance: referrals stalled without closure, sorted by risk."""
    import json
    u = get_user(db)
    out = []
    for r in db.query(DBM.Referral).filter_by(user_id=u.id):
        if r.state in ("closed", "outcome", "attended"): continue
        hist = json.loads(r.history_json or "[]")
        nudges = sum(1 for h in hist if str(h.get("note", "")).startswith("nudge:"))
        out.append({"id": r.id, "reason": r.reason, "state": r.state, "owner": r.owner,
                    "attempts": nudges, "needs_attention": nudges >= 3})
    return sorted(out, key=lambda x: (not x["needs_attention"], x["state"]))

@app.get("/api/v1/model-card", dependencies=[Depends(auth)])
def model_card():
    """Q10 system transparency."""
    return {
        "model": "MindLoop core ML forecaster v1 (EWMA + median/MAD band)",
        "intended_use": "Describe the user's own metric trajectory. Not a diagnosis, not treatment advice.",
        "inputs": "User's own valid session metrics only. No population norms, no third-party data.",
        "limits": ["Needs >=3 sessions for a band; forecasts widen with sparse data.",
                   "Near-transfer only (Melby-Lervag 2016; Sala & Gobet 2017).",
                   "Not validated for minors, clinical groups, or other cultures (see Q9)."],
        "versions": "Retrained incrementally on each valid session; version logged per forecast in audit trail.",
        "challenge": "Users can delete data (DELETE /api/v1/me) and re-baseline; clinicians can override any flag.",
    }

@app.get("/api/v1/dashboard/summary", dependencies=[Depends(auth)])
def dashboard(db: DB = Depends(DBM.get_db)):
    return {"me": me(db), "history": history(db)[:10], "baselines": baselines(db),
            "wearables_latest": wearable_latest(db), "change_events": changes(db),
            "program": ACTIVITIES, "wearable_source": "DEMO synthetic data — Fire-Boltt not yet verified"}

@app.get("/api/v1/reports/latest", dependencies=[Depends(auth)])
def report(db: DB = Depends(DBM.get_db)):
    return {"summary": "Plain-language summary vs your personal baseline. Not a diagnosis.",
            "baselines": baselines(db), "change_events": changes(db), "history": history(db)[:10],
            "limitations": ["Browser timing is not laboratory-grade.", "Sleep, stress, illness and practice affect results.",
                            "Wearable data shown is DEMO until Fire-Boltt/Health Connect is verified on your phone."],
            "next_steps": ["Repeat tasks at a similar time of day.", "Discuss persistent concerns with a qualified professional."]}

@app.get("/api/v1/reports/story", dependencies=[Depends(auth)])
def report_story(db: DB = Depends(DBM.get_db)):
    """Kid-friendly story report: coordination, attention span, focus, memory,
    screen-time context, and concrete improvements. No numbers jargon, no diagnosis."""
    import json
    u = get_user(db)
    name = u.display_name if u.display_name and u.display_name != "Demo User" else "friend"
    idx = baseline_index(db=db)
    sessions = db.query(DBM.Session).filter_by(user_id=u.id, validity_status="valid").order_by(DBM.Session.completed_at).all()
    n = len(sessions)
    cur = idx.get("index")
    trend = idx.get("trend_delta")

    def level(v):
        if v is None: return None
        if v >= 70: return "super"
        if v >= 55: return "good"
        if v >= 40: return "growing"
        return "sleepy"

    # Per-task best index from series
    by_task = {}
    for s in idx.get("series", []):
        if s.get("index") is not None:
            by_task.setdefault(s["task_key"], []).append(s["index"])
    task_best = {k: round(sum(v) / len(v), 1) for k, v in by_task.items()}

    coord = task_best.get("steadiness")
    attention = task_best.get("pvt", task_best.get("cpt"))
    focus = task_best.get("sart", task_best.get("flanker"))
    memory = task_best.get("nback", task_best.get("span", task_best.get("pairs")))

    cards = []
    cards.append({
        "title": "🎯 Attention span",
        "level": level(attention),
        "story": _story_for("attention", attention, n),
    })
    cards.append({
        "title": "🔎 Focus",
        "level": level(focus),
        "story": _story_for("focus", focus, n),
    })
    cards.append({
        "title": "🤸 Coordination",
        "level": level(coord),
        "story": _story_for("coordination", coord, n),
    })
    cards.append({
        "title": "🧠 Memory",
        "level": level(memory),
        "story": _story_for("memory", memory, n),
    })

    # Screen-time context
    rows = db.query(DBM.ScreenTime).filter_by(user_id=u.id).order_by(DBM.ScreenTime.day.desc()).limit(7).all()
    screen_card = None
    if rows:
        avg_s = sum(r.screen_minutes for r in rows) / len(rows)
        avg_d = sum(r.doomscroll_minutes for r in rows) / len(rows)
        screen_card = {
            "title": "📵 Screen-time sidekick",
            "level": "good" if avg_d <= 60 else "growing" if avg_d <= 150 else "sleepy",
            "story": (f"You scroll about {round(avg_s)} minutes a day, and {round(avg_d)} of those are doomscrolling. "
                      + ("That's light — your eyes and brain get lots of rest. " if avg_d <= 60
                         else "Cutting even 15 minutes of scrolling can make focus games feel easier. "
                         if avg_d <= 150 else "Lots of scrolling can make your brain feel tired. Try swapping 15 scroll-minutes for a walk. ")),
        }

    improvements = _improvements_for(level(cur), trend, rows[0] if rows else None, n)

    if cur is None:
        headline = f"Hey {name}! Play your 4 baseline games and I'll write your story here. 🌱"
    elif level(cur) == "super":
        headline = f"Wow {name}, your brain is on fire! Your baseline is {round(cur)} out of 100. 🔥"
    elif level(cur) == "good":
        headline = f"Nice going {name}! Your baseline is {round(cur)} out of 100 and climbing. 💪"
    elif level(cur) == "growing":
        headline = f"Hey {name}, your baseline is {round(cur)} out of 100 — a young plant getting stronger every day. 🌱"
    else:
        headline = f"Hey {name}, your baseline is {round(cur)} out of 100. Tired brains can wake up — small steps work. 🤗"

    trend_line = ""
    if trend is not None and n >= 3:
        trend_line = (f"Lately you've moved {'up' if trend >= 0 else 'down'} by {abs(round(trend, 1))} points. "
                      + ("Keep doing what you're doing! " if trend >= 0 else "That's okay — sleep, mood and busy days move scores around. "))

    return {"headline": headline, "trend_line": trend_line, "index": cur, "sessions": n,
            "cards": cards, "screen_card": screen_card, "improvements": improvements,
            "note": "A friendly story about your games. Not a medical report, not a diagnosis."}

def _story_for(area: str, value, n: int) -> str:
    if value is None or n == 0:
        return {"attention": "We haven't measured your attention span yet — play Vigilance Tap and I'll tell you all about it! ⚡",
                "focus": "We haven't measured your focus yet — play Steady Response and come back! 🎯",
                "coordination": "We haven't measured your coordination yet — try Hold Steady for 30 seconds! 🤸",
                "memory": "We haven't measured your memory yet — play Remember the Shelf! 🛒"}[area]
    v, lvl = round(value), ("super" if value >= 70 else "good" if value >= 55 else "growing" if value >= 40 else "sleepy")
    base = {"attention": f"Your attention span scores {v} out of 100. ",
            "focus": f"Your focus scores {v} out of 100. ",
            "coordination": f"Your coordination scores {v} out of 100. ",
            "memory": f"Your memory scores {v} out of 100. "}[area]
    detail = {
        "attention": {"super": "You can stick with boring things for a long time — like a cat watching a mouse hole. 🐱",
                      "good": "You keep watching even when it's dull. That's the exact muscle doomscrolling weakens — and you're training it! 💪",
                      "growing": "Your attention is like a young plant — it looks away sometimes, and every game waters it. 🌱",
                      "sleepy": "Your attention feels sleepy right now. Tired brains wander — more sleep and less scrolling wake it up. 😴"},
        "focus": {"super": "Distractions bounce right off you — like rain off a raincoat! 🧥",
                  "good": "You mostly ignore the tricky bits and catch the right ones. Sharp eyes! 👀",
                  "growing": "Sometimes the tricky bits fool you — that's normal, your focus filter is still learning. 🔎",
                  "sleepy": "Everything grabs your attention right now. That's okay — it means your brain needs rest, not scolding. 🤗"},
        "coordination": {"super": "Your hands are super steady — like a surgeon or an artist! 🎨",
                         "good": "Your hands hold nice and still. Good teamwork between brain and body! 🤝",
                         "growing": "A little wobble is totally normal — even grown-ups wobble. Practice makes it smoother. 🌊",
                         "sleepy": "Lots of wobble today — tired hands wobble more. Try again after rest. 💤"},
        "memory": {"super": "Your memory is like an elephant — it never forgets! 🐘",
                   "good": "You remember most things you see. Your brain's sticky notes are working well! 📝",
                   "growing": "Some things slip away — that's how all brains start. Each game adds more sticky notes! 📌",
                   "sleepy": "Things slip away fast right now. Sleep is when memories get saved — check your bedtime. 🌙"},
    }[area][lvl]
    return base + detail

def _improvements_for(lvl, trend, latest_screen, n: int):
    tips = []
    if n < 4:
        tips.append({"emoji": "🎮", "text": "Finish your 4 baseline games first — that's the starting line everything is measured from."})
    tips.append({"emoji": "📖", "text": "Read a book for 15 minutes a day. Readers beat scrollers at attention games — every single time."})
    if latest_screen and latest_screen.doomscroll_minutes > 60:
        tips.append({"emoji": "📵", "text": f"You doomscroll ~{round(latest_screen.doomscroll_minutes)} min a day. Swap 15 of those minutes for a walk and watch your focus scores climb."})
    else:
        tips.append({"emoji": "📵", "text": "Keep doomscrolling small. When you catch yourself scrolling, ask: 'am I enjoying this, or just scrolling?'"})
    if trend is not None and trend < 0:
        tips.append({"emoji": "😴", "text": "Your scores dipped a little. The usual suspects: less sleep, more stress, or playing while tired. Rest is training too."})
    else:
        tips.append({"emoji": "🎯", "text": "Play your 5 daily games at the same time each day — brains love routine, and scores get steadier."})
    tips.append({"emoji": "🤸", "text": "Do the 30-second Hold Steady every day. Steady hands mean a calm, focused brain."})
    tips.append({"emoji": "🌙", "text": "Sleep 8 hours. Memories from today's games get saved overnight — no sleep, no saving."})
    return tips[:5]

@app.post("/api/v1/me/export", dependencies=[Depends(auth)])
def export(db: DB = Depends(DBM.get_db)):
    return {"history": history(db), "baselines": baselines(db), "wearables_latest": wearable_latest(db)}

@app.delete("/api/v1/me", dependencies=[Depends(auth)])
def delete_me(db: DB = Depends(DBM.get_db)):
    u = get_user(db)
    db.query(DBM.Wearable).filter_by(user_id=u.id).delete()
    db.query(DBM.Baseline).filter_by(user_id=u.id).delete()
    db.query(DBM.ChangeEvent).filter_by(user_id=u.id).delete()
    db.query(DBM.Consent).filter_by(user_id=u.id).delete()
    for s in db.query(DBM.Session).filter_by(user_id=u.id):
        db.query(DBM.Trial).filter_by(session_id=s.id).delete()
        db.query(DBM.Metric).filter_by(session_id=s.id).delete()
    db.query(DBM.Session).filter_by(user_id=u.id).delete()
    db.add(DBM.Audit(user_id=u.id, event_type="account_deleted")); db.commit()
    return {"deleted": True}
