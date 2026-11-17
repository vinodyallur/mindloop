import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api"))
os.environ.setdefault("DATABASE_URL", "sqlite:///./mindloop.db")
from fastapi.testclient import TestClient
from app.main import app

H = {"x-api-key": os.getenv("MINDLOOP_API_KEY", "demo-key-change-me")}
c = TestClient(app)
for s in range(5):
    sid = c.post("/api/v1/assessment-sessions", json={"task_key": "cpt"}, headers=H).json()["session_id"]
    trials = [{"trial_index": i, "stimulus": "X" if i % 3 else "A",
               "expected_action": "respond" if i % 3 else "withhold",
               "actual_action": "respond", "reaction_time_ms": 380 + s * 5 + i,
               "correct": i % 3 != 0} for i in range(30)]
    c.post(f"/api/v1/assessment-sessions/{sid}/trials", json={"trials": trials}, headers=H)
    print(s + 1, c.post(f"/api/v1/assessment-sessions/{sid}/complete", headers=H).json()["validity_status"])
c.post("/api/v1/wearables/sync", json={"device": "DEMO", "source_app": "synthetic", "records": [
    {"record_type": "heart_rate", "value": 72, "unit": "bpm",
     "start_time": "2026-11-14T08:00:00Z", "source_record_id": "seed-hr"}]}, headers=H)
print("baselines:", c.get("/api/v1/baselines", headers=H).json())
