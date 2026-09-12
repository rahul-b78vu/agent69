"""
Configurable thresholds, semester calibration runs, and audit logging.
"""
from datetime import datetime

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text, JSON

from app.database.session import Base


class ThresholdConfig(Base):
    """
    Admin-editable configuration. Every tunable value that used to be a
    hard-coded constant (weights, deviation %, severity bands, response
    windows) lives here so it can be changed from the /settings page
    without a code deployment.
    """
    __tablename__ = "threshold_configs"

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False, index=True)   # e.g. "WEIGHT_ATTENDANCE_DECLINE"
    value = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)   # baseline | deviation | weight | severity | response_window
    description = Column(String(255), nullable=True)

    is_recommended_change = Column(Boolean, default=False, nullable=False)
    recommended_value = Column(Float, nullable=True)
    recommendation_reason = Column(String(500), nullable=True)
    recommendation_approved = Column(Boolean, nullable=True)   # null = pending, True/False once decided
    recommended_by_calibration_run_id = Column(Integer, ForeignKey("calibration_runs.id"), nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class CalibrationRun(Base):
    """
    A semester-end (or on-demand) calibration analysis. Produces
    *recommendations* only - it never silently changes production
    thresholds (see §17 of the spec).
    """
    __tablename__ = "calibration_runs"

    id = Column(Integer, primary_key=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)

    total_alerts = Column(Integer, nullable=False, default=0)
    confirmed_concerns = Column(Integer, nullable=False, default=0)
    false_positives = Column(Integer, nullable=False, default=0)
    false_positive_rate = Column(Float, nullable=True)
    true_positive_rate = Column(Float, nullable=True)
    avg_response_time_hours = Column(Float, nullable=True)

    breakdown_by_category = Column(JSON, nullable=True)
    breakdown_by_severity = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)   # list of {key, current, recommended, reason}

    status = Column(String(20), nullable=False, default="COMPLETED")  # COMPLETED | RECOMMENDATIONS_PENDING | APPLIED
    run_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    run_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)     # e.g. "VIEW_ALERT", "ACKNOWLEDGE_ALERT", "CHANGE_THRESHOLD"
    object_type = Column(String(50), nullable=False)  # e.g. "Alert", "ThresholdConfig"
    object_id = Column(String(50), nullable=True)

    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)

    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
