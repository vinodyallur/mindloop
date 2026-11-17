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
    return {"id": u.id, "email": u.email, "display_name": u.display_name, "age_band": u.age_band,
            "language": u.language, "consents": consents,
            "notice": "MindLoop is not a diagnostic device and does not diagnose any condition."}

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
    db.commit(); return {"recorded": body.activity_key}

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
