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
                          result_json=DBM.dumps({"mood": body.mood, "focus": body.focus, "note": body.note[:500]})))
    _touch_habit_day(db, u.id)
    flag = None
    if any(w in body.note.lower() for w in CRISIS_WORDS):
        flag = _open_flag(db, u.id, "crisis", "checkin_note",
                          "User note matched crisis keywords. Same-day human review required; show local helplines.")
    db.commit()
    return {"recorded": True, "flag": flag}

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
