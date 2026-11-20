import json, uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import DATABASE_URL

Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False)

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=uid)
    email = Column(String, unique=True, index=True)
    display_name = Column(String, default="Demo User")
    age_band = Column(String, default="18-25")
    age = Column(Integer, nullable=True)
    gender = Column(String, default="")
    country = Column(String, default="")
    language = Column(String, default="en")
    onboarding_done = Column(Integer, default=0)
    devices_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=now)

class Consent(Base):
    __tablename__ = "consents"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    data_category = Column(String)  # assessment | wearable | digital_use
    consent_version = Column(String, default="v1")
    granted_at = Column(DateTime, default=now)
    revoked_at = Column(DateTime, nullable=True)

class Session(Base):
    __tablename__ = "assessment_sessions"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    task_key = Column(String, index=True)  # cpt | gonogo | memory | reaction
    task_version = Column(String, default="1.0")
    started_at = Column(DateTime, default=now)
    completed_at = Column(DateTime, nullable=True)
    validity_status = Column(String, default="in_progress")  # valid | invalid | in_progress
    invalid_reason = Column(String, nullable=True)
    device_json = Column(Text, default="{}")

class Trial(Base):
    __tablename__ = "assessment_trials"
    id = Column(String, primary_key=True, default=uid)
    session_id = Column(String, ForeignKey("assessment_sessions.id"), index=True)
    trial_index = Column(Integer)
    stimulus = Column(String)
    expected_action = Column(String)
    actual_action = Column(String, nullable=True)
    reaction_time_ms = Column(Float, nullable=True)
    sway = Column(Float, nullable=True)  # steadiness task: gyro magnitude sample
    correct = Column(Integer, default=0)
    is_practice = Column(Integer, default=0)

class Metric(Base):
    __tablename__ = "assessment_metrics"
    id = Column(String, primary_key=True, default=uid)
    session_id = Column(String, ForeignKey("assessment_sessions.id"), index=True)
    metric_key = Column(String)
    metric_value = Column(Float)
    unit = Column(String, default="")

class Baseline(Base):
    __tablename__ = "personal_baselines"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    task_key = Column(String)
    metric_key = Column(String)
    centre_value = Column(Float)
    variability_value = Column(Float)
    valid_session_count = Column(Integer)
    confidence_label = Column(String)  # building | moderate | established
    updated_at = Column(DateTime, default=now)

class Wearable(Base):
    __tablename__ = "wearable_records"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    source_device = Column(String, default="DEMO")
    source_app = Column(String, default="synthetic")
    data_type = Column(String, index=True)  # heart_rate | sleep | steps | spo2
    value_numeric = Column(Float, nullable=True)
    unit = Column(String, default="")
    start_at = Column(DateTime, index=True)
    end_at = Column(DateTime, nullable=True)
    source_record_id = Column(String, unique=True, nullable=True)
    provenance_json = Column(Text, default="{}")

class ChangeEvent(Base):
    __tablename__ = "change_events"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    metric_key = Column(String)
    direction = Column(String)
    magnitude = Column(Float)
    confidence_label = Column(String)
    user_message = Column(Text)
    detected_at = Column(DateTime, default=now)

class Completion(Base):
    __tablename__ = "activity_completions"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    activity_key = Column(String)
    completed_at = Column(DateTime, default=now)
    result_json = Column(Text, default="{}")

class ScreenTime(Base):
    __tablename__ = "screen_time"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    day = Column(String, index=True)  # YYYY-MM-DD
    screen_minutes = Column(Float, default=0)
    doomscroll_minutes = Column(Float, default=0)
    created_at = Column(DateTime, default=now)

class PlanItem(Base):
    __tablename__ = "plan_items"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    day = Column(String, index=True)  # YYYY-MM-DD
    item_key = Column(String)  # game key or habit key e.g. read-15
    kind = Column(String, default="game")  # game | habit
    title = Column(String, default="")
    detail = Column(String, default="")
    position = Column(Integer, default=0)
    done = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)

class Audit(Base):
    __tablename__ = "audit_events"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, nullable=True)
    event_type = Column(String)
    created_at = Column(DateTime, default=now)
    metadata_json = Column(Text, default="{}")

# ---- Q1/Q4 validated outcome instruments (self-report, non-diagnostic) ----
class OutcomeSurvey(Base):
    __tablename__ = "outcome_surveys"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    instrument = Column(String, index=True)  # who5 | pss4 | isi3 | phq2 | gad2 | srbai
    score = Column(Float)
    max_score = Column(Float)
    answers_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=now, index=True)

class HabitDay(Base):
    __tablename__ = "habit_days"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    day = Column(String, index=True)  # YYYY-MM-DD
    target_met = Column(Integer, default=0)  # >=1 valid session or program completion
    sessions = Column(Integer, default=0)

# ---- Q7/Q8 safety loop: red-flag escalation + referral tracking ----
class Flag(Base):
    __tablename__ = "safety_flags"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    tier = Column(String)  # self_harm | crisis | clinical_review
    source = Column(String)  # checkin_note | survey | manual
    detail = Column(Text, default="")
    status = Column(String, default="open")  # open | reviewed | closed
    created_at = Column(DateTime, default=now)
    reviewed_at = Column(DateTime, nullable=True)

class Referral(Base):
    __tablename__ = "referrals"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    reason = Column(String)
    state = Column(String, default="referred")  # referred|accepted|booked|attended|outcome|closed + exceptions
    owner = Column(String, default="care-team")
    due_at = Column(DateTime, nullable=True)
    history_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=now)

def init_db(): Base.metadata.create_all(bind=engine)
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
def dumps(o): return json.dumps(o or {})
