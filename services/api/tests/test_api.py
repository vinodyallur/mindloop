import os, sys
os.environ["DATABASE_URL"] = "sqlite:///./test_mindloop.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
from app.main import app
from app import analytics

H = {"x-api-key": "demo-key-change-me"}
c = TestClient(app)

def trials(n=20, rt=400):
    return {"trials": [{"trial_index": i, "stimulus": "X" if i % 3 else "A",
                        "expected_action": "respond" if i % 3 else "withhold",
                        "actual_action": "respond", "reaction_time_ms": rt + i,
                        "correct": i % 3 != 0} for i in range(n)]}

def test_health():
    assert c.get("/health").json()["diagnostic"] is False

def test_auth_required():
    assert c.get("/api/v1/me").status_code == 401

def test_session_baseline_flow():
    sid = c.post("/api/v1/assessment-sessions", json={"task_key": "cpt"}, headers=H).json()["session_id"]
    assert c.post(f"/api/v1/assessment-sessions/{sid}/trials", json=trials(), headers=H).json()["stored"] == 20
    done = c.post(f"/api/v1/assessment-sessions/{sid}/complete", headers=H).json()
    assert done["validity_status"] == "valid" and "median_rt_ms" in done["metrics"]
    assert c.get("/api/v1/baselines", headers=H).json()

def test_invalid_short_session():
    sid = c.post("/api/v1/assessment-sessions", json={"task_key": "cpt"}, headers=H).json()["session_id"]
    c.post(f"/api/v1/assessment-sessions/{sid}/trials", json=trials(3), headers=H)
    assert c.post(f"/api/v1/assessment-sessions/{sid}/complete", headers=H).json()["validity_status"] == "invalid"

def test_wearable_dedupe_and_validation():
    body = {"device": "DEMO", "source_app": "synthetic", "records": [
        {"record_type": "heart_rate", "value": 72, "unit": "bpm", "start_time": "2026-11-14T10:00:00Z", "source_record_id": "r1"},
        {"record_type": "bogus", "value": 1, "start_time": "2026-11-14T10:00:00Z"}]}
    assert c.post("/api/v1/wearables/sync", json=body, headers=H).json() == {"stored": 1, "skipped": 1, "demo": True}
    assert c.post("/api/v1/wearables/sync", json=body, headers=H).json()["stored"] == 0

def test_change_detection_conservative():
    assert analytics.detect_change("median_rt_ms", 400, 400, 10, [400, 405]) is None
    assert analytics.detect_change("median_rt_ms", 500, 400, 10, [490, 500]) is not None

def test_baseline_index_and_forecast():
    idx = c.get("/api/v1/baseline/index", headers=H).json()
    assert 0 <= idx["index"] <= 100 and idx["sessions"] >= 1
    assert "scale_note" in idx and "series" in idx
    fc = c.get("/api/v1/baseline/forecast", headers=H).json()
    assert "cpt.median_rt_ms" in fc["models"]
    assert fc["models"]["cpt.median_rt_ms"]["n"] >= 1

def test_steadiness_scoring():
    from app import analytics as A
    m, v, _ = A.score_trials("steadiness", [{"expected_action": "withhold", "actual_action": None, "reaction_time_ms": None, "correct": True, "is_practice": False, "sway": 0.05 + i * 0.001} for i in range(30)])
    assert v == "valid" and 0 <= m["steadiness_score"] <= 100
    assert A.metric_index("median_rt_ms", 400, 400, 10) == 50.0
    assert A.metric_index("median_rt_ms", 500, 400, 10) < 50.0
    assert A.metric_index("accuracy", 0.9, 0.8, 0.05) > 50.0

def test_outcome_survey_and_30day():
    assert c.post("/api/v1/outcomes/submit", json={"instrument": "who5", "answers": [3,3,3,3,3]}, headers=H).json()["score"] == 15
    assert c.post("/api/v1/outcomes/submit", json={"instrument": "who5", "answers": [4,4,4,4,4]}, headers=H).json()["score"] == 20
    d = c.get("/api/v1/outcomes/30day", headers=H).json()
    assert d["who5"]["delta"] == 5 and "_behavior" in d

def test_phq2_flag_and_referral_loop():
    r = c.post("/api/v1/outcomes/submit", json={"instrument": "phq2", "answers": [2,2]}, headers=H).json()
    assert r["flag"] and r["flag"]["tier"] == "clinical_review"
    rid = c.post("/api/v1/referrals", json={"reason": "low mood review"}, headers=H).json()["id"]
    for s in ["accepted", "booked", "attended", "outcome", "closed"]:
        assert c.post(f"/api/v1/referrals/{rid}/transition", json={"state": s}, headers=H).json()["state"] == s
    assert c.post("/api/v1/checkin", json={"mood": 1, "focus": 1, "note": "I feel like hurt myself"}, headers=H).json()["flag"]["tier"] == "crisis"

def test_windows_study_fhir_nudge():
    assert c.post("/api/v1/study/assign", json={"arm": "waitlist"}, headers=H).json()["arm"] == "waitlist"
    w = c.get("/api/v1/outcomes/windows", headers=H).json()
    assert "30d" in w and "180d" in w and w["_design"]["arm"] == "waitlist"
    assert c.get("/api/v1/study/export", headers=H).json()["n"] >= 1
    rid = c.post("/api/v1/referrals", json={"reason": "fhir check"}, headers=H).json()["id"]
    assert c.get(f"/api/v1/referrals/{rid}/fhir", headers=H).json()["resourceType"] == "ServiceRequest"
    assert c.post(f"/api/v1/referrals/{rid}/nudge", json={"channel": "sms"}, headers=H).json()["attempts"] == 1
    assert any(o["id"] == rid for o in c.get("/api/v1/referrals/overdue", headers=H).json())

def test_onboarding_profile_devices():
    assert c.post("/api/v1/me/profile", json={"name": "Asha", "age": 21, "gender": "female", "country": "India", "language": "en"}, headers=H).json()["age_band"] == "18-25"
    assert c.post("/api/v1/me/profile", json={"age": 200}, headers=H).status_code == 400
    d = c.post("/api/v1/me/devices", json={"kind": "watch", "name": "Fire-Boltt"}, headers=H).json()["devices"]
    assert d["watch"]["name"] == "Fire-Boltt"
    assert c.post("/api/v1/me/devices", json={"kind": "toaster"}, headers=H).status_code == 400
    assert c.post("/api/v1/me/onboarding-complete", headers=H).json()["onboarding_done"] is True
    assert c.get("/api/v1/me", headers=H).json()["onboarding_done"] is True

def test_screentime_validation():
    assert c.post("/api/v1/screentime", json={"screen_minutes": 300, "doomscroll_minutes": 400}, headers=H).status_code == 400
    r = c.post("/api/v1/screentime", json={"screen_minutes": 300, "doomscroll_minutes": 90}, headers=H).json()
    assert r["doomscroll_minutes"] == 90
    assert c.get("/api/v1/screentime/latest", headers=H).json()[0]["screen_minutes"] == 300

def test_baseline_set_and_daily_plan():
    s = c.get("/api/v1/baseline/assessment-set", headers=H).json()
    assert s["total"] == 4 and s["completed"] >= 0
    p = c.get("/api/v1/plan/today", headers=H).json()
    assert p["total"] == 6 and len(p["items"]) == 6 and "buddy" in p
    assert p["items"][-1]["kind"] == "habit"
    assert c.post("/api/v1/plan/complete", json={"item_key": p["items"][0]["item_key"]}, headers=H).json()["recorded"]
    assert c.post("/api/v1/plan/complete", json={"item_key": "nope"}, headers=H).status_code == 404
    p2 = c.get("/api/v1/plan/today", headers=H).json()
    assert p2["done"] == 1 and p2["buddy"]["tone"] == "encourage"
