"""
Pydantic schemas for Agent 69 REST APIs.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.core import RoleName
from app.models.signals import SignalType
from app.models.alerts import WarningCategory, Severity, Urgency, ResponderRole, AlertStatus, OutcomeChoice


# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class LoginRequest(BaseModel):
    username: str
    password: str


class RoleOut(BaseModel):
    id: int
    name: RoleName
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_active: bool
    roles: List[RoleOut] = []
    department_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# --- Student & Signal Schemas ---
class StudentBase(BaseModel):
    id: int
    student_code: str
    year: int
    section: Optional[str] = None
    department_id: int
    course_id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class StudentOut(StudentBase):
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    active_alert_count: int = 0
    max_severity: Optional[str] = None


class BaselineItemOut(BaseModel):
    signal_type: SignalType
    method: str
    mean_value: Optional[float] = None
    median_value: Optional[float] = None
    rolling_mean_value: Optional[float] = None
    std_dev: Optional[float] = None
    data_points_used: int
    confidence: float
    is_confident: bool
    last_calculated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SignalComparisonItem(BaseModel):
    signal_type: str
    baseline_value: Optional[float] = None
    current_value: Optional[float] = None
    deviation: Optional[float] = None
    deviation_pct: Optional[float] = None
    strength: str
    is_sustained: bool
    sustained_periods: int
    weight_applied: int


class StudentDetailOut(StudentOut):
    baselines: List[BaselineItemOut] = []
    current_signals: List[SignalComparisonItem] = []
    recent_alerts: List["AlertOut"] = []


# --- Alert Schemas ---
class AlertEvidenceOut(BaseModel):
    id: int
    signal_type: str
    baseline_value: Optional[float] = None
    current_value: Optional[float] = None
    deviation_pct: Optional[float] = None
    strength: str
    weight_applied: int
    description: str
    model_config = ConfigDict(from_attributes=True)


class AlertResponseOut(BaseModel):
    id: int
    responder_user_id: int
    responder_name: Optional[str] = None
    action: str
    notes: Optional[str] = None
    new_status: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AlertOutcomeOut(BaseModel):
    id: int
    responder_user_id: int
    responder_name: Optional[str] = None
    action_taken: Optional[str] = None
    outcome: OutcomeChoice
    concern_was_real: Optional[bool] = None
    intervention_useful: Optional[bool] = None
    is_false_positive: bool
    notes: Optional[str] = None
    recorded_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AlertOut(BaseModel):
    id: int
    student_id: int
    student_code: Optional[str] = None
    department_name: Optional[str] = None
    course_name: Optional[str] = None
    category: WarningCategory
    severity: Severity
    urgency: Urgency
    confidence: float
    warning_score: int
    suggested_responder_role: ResponderRole
    assigned_user_id: Optional[int] = None
    assigned_user_name: Optional[str] = None
    status: AlertStatus
    narrative_summary: str
    response_deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    evidence: List[AlertEvidenceOut] = []
    outcome: Optional[AlertOutcomeOut] = None
    model_config = ConfigDict(from_attributes=True)


# --- Workflow Requests ---
class AcknowledgeRequest(BaseModel):
    notes: Optional[str] = None


class NoteRequest(BaseModel):
    notes: str


class ActionRequest(BaseModel):
    action_description: str


class OutcomeRequest(BaseModel):
    outcome: OutcomeChoice
    action_taken: Optional[str] = None
    concern_was_real: Optional[bool] = None
    intervention_useful: Optional[bool] = None
    notes: Optional[str] = None


class FalsePositiveRequest(BaseModel):
    reason: str


class EscalateRequest(BaseModel):
    reason: str
    target_role: Optional[ResponderRole] = None


# --- Calibration & Governance ---
class CalibrationRunOut(BaseModel):
    id: int
    semester_id: Optional[int] = None
    total_alerts: int
    confirmed_concerns: int
    false_positives: int
    false_positive_rate: Optional[float] = None
    true_positive_rate: Optional[float] = None
    avg_response_time_hours: Optional[float] = None
    breakdown_by_category: Optional[Dict[str, Any]] = None
    breakdown_by_severity: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    status: str
    run_at: datetime
    run_by_user_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class CalibrationDecisionRequest(BaseModel):
    approved: bool = True


class ThresholdConfigOut(BaseModel):
    id: int
    key: str
    value: float
    category: str
    description: Optional[str] = None
    is_recommended_change: bool
    recommended_value: Optional[float] = None
    recommendation_reason: Optional[str] = None
    recommendation_approved: Optional[bool] = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ThresholdUpdateRequest(BaseModel):
    value: float


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    object_type: str
    object_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Dashboard & Run ---
class DashboardStatsOut(BaseModel):
    total_students: int
    active_alerts: int
    low_severity: int
    medium_severity: int
    high_severity: int
    resolved_alerts: int
    false_positives: int
    awaiting_response: int


class RunAgentRequest(BaseModel):
    week_number: int = 12
    baseline_cutoff_week: int = 4
