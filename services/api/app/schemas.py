from typing import Any, List, Optional
from pydantic import BaseModel

class UserIn(BaseModel):
    email: str
    display_name: str = "Demo User"
    age_band: str = "18-25"
    language: str = "en"

class ConsentIn(BaseModel):
    data_category: str
    granted: bool = True

class SessionIn(BaseModel):
    task_key: str
    device: dict = {}

class TrialIn(BaseModel):
    trial_index: int
    stimulus: str = ""
    expected_action: str  # respond | withhold
    actual_action: Optional[str] = None
    reaction_time_ms: Optional[float] = None
    correct: bool = False
    is_practice: bool = False
    span: Optional[int] = None
    sway: Optional[float] = None  # steadiness task: gyro magnitude sample

class TrialsIn(BaseModel):
    trials: List[TrialIn]

class WearableRecordIn(BaseModel):
    record_type: str
    value: float
    unit: str = ""
    start_time: str
    end_time: Optional[str] = None
    source_record_id: Optional[str] = None

class WearableSyncIn(BaseModel):
    device: str = "DEMO"
    source_app: str = "synthetic"
    records: List[WearableRecordIn]

class CompletionIn(BaseModel):
    activity_key: str
    result: dict = {}

class CheckinIn(BaseModel):
    mood: int  # 1-5 self-report
    focus: int  # 1-5 self-report
    note: str = ""
