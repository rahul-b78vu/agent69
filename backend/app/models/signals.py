"""
Raw signal records (one row per student per observation period, typically
a week) plus the derived per-student baseline and detected-signal tables.

Design note: each *_records table is intentionally simple and additive so
new data adapters (see app/services/adapters/) can append rows without
touching agent logic. Agent logic (app/engines/) only ever *reads* these
tables plus student_baselines; it never mutates raw source data.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Enum as SAEnum, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database.session import Base


class SignalType(str, enum.Enum):
    ATTENDANCE = "ATTENDANCE"
    MARKS = "MARKS"
    ASSIGNMENT = "ASSIGNMENT"
    ENGAGEMENT = "ENGAGEMENT"
    FINANCIAL = "FINANCIAL"
    BACKLOG = "BACKLOG"
    BEHAVIOUR = "BEHAVIOUR"
    LIBRARY = "LIBRARY"


class StudentBaseline(Base):
    """
    A student's personal historical baseline for one signal type,
    recalculated periodically by the Baseline Engine (see engines/baseline_engine.py).
    This is NEVER a comparison to class/peer averages.
    """
    __tablename__ = "student_baselines"
    __table_args__ = (UniqueConstraint("student_id", "signal_type", name="uq_student_signal_baseline"),)

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    signal_type = Column(SAEnum(SignalType), nullable=False)

    method = Column(String(30), nullable=False)          # mean | median | rolling_mean
    mean_value = Column(Float, nullable=True)
    median_value = Column(Float, nullable=True)
    rolling_mean_value = Column(Float, nullable=True)
    std_dev = Column(Float, nullable=True)
    rolling_std_dev = Column(Float, nullable=True)

    data_points_used = Column(Integer, nullable=False, default=0)
    confidence = Column(Float, nullable=False, default=0.0)   # 0.0 - 1.0
    is_confident = Column(Boolean, nullable=False, default=False)  # data_points_used >= min required

    last_calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="baselines")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    attendance_pct = Column(Float, nullable=False)   # 0-100
    source = Column(String(50), default="mock_attendance_system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AssessmentRecord(Base):
    __tablename__ = "assessment_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    assessment_name = Column(String(100), nullable=True)
    marks_pct = Column(Float, nullable=False)   # 0-100 normalized
    source = Column(String(50), default="mock_examination_system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AssignmentRecord(Base):
    __tablename__ = "assignment_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    assignments_due = Column(Integer, nullable=False, default=0)
    assignments_submitted = Column(Integer, nullable=False, default=0)
    submission_rate_pct = Column(Float, nullable=False)   # 0-100
    source = Column(String(50), default="mock_assignment_system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EngagementRecord(Base):
    __tablename__ = "engagement_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    lms_logins = Column(Integer, nullable=False, default=0)
    portal_logins = Column(Integer, nullable=False, default=0)
    engagement_score = Column(Float, nullable=False)   # normalized 0-100 composite
    source = Column(String(50), default="mock_lms", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    amount_due = Column(Float, nullable=False, default=0.0)
    amount_overdue = Column(Float, nullable=False, default=0.0)
    days_overdue = Column(Integer, nullable=False, default=0)
    payment_delayed = Column(Boolean, nullable=False, default=False)
    source = Column(String(50), default="mock_finance_system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class BacklogRecord(Base):
    __tablename__ = "backlog_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    backlog_count = Column(Integer, nullable=False, default=0)
    new_backlogs_this_period = Column(Integer, nullable=False, default=0)
    source = Column(String(50), default="mock_examination_system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class BehaviourRecord(Base):
    """
    Only authorized institutional observations go here (e.g. a mentor's
    logged note about a formal interaction). This table must never be
    populated with inferred/sensitive characteristics.
    """
    __tablename__ = "behaviour_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    observation_flag = Column(Boolean, nullable=False, default=False)  # authorized flag raised this period
    observation_note = Column(String(500), nullable=True)  # neutral, factual note only
    recorded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    source = Column(String(50), default="authorized_staff_observation", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LibraryRecord(Base):
    __tablename__ = "library_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    library_visits = Column(Integer, nullable=False, default=0)
    resources_borrowed = Column(Integer, nullable=False, default=0)
    campus_system_logins = Column(Integer, nullable=False, default=0)
    source = Column(String(50), default="mock_library_system", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WarningSignal(Base):
    """
    A single detected deviation for one student/signal, produced by the
    Deviation Detection Engine. Multiple WarningSignal rows feed into the
    Multi-Signal Correlation Engine to (maybe) produce an Alert.
    """
    __tablename__ = "warning_signals"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    signal_type = Column(SAEnum(SignalType), nullable=False)

    week_number = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)

    baseline_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    deviation = Column(Float, nullable=True)               # current - baseline
    deviation_pct = Column(Float, nullable=True)            # % change relative to baseline
    is_sustained = Column(Boolean, nullable=False, default=False)
    sustained_periods = Column(Integer, nullable=False, default=0)

    strength = Column(String(20), nullable=False)  # none | weak | moderate | strong
    weight_applied = Column(Integer, nullable=False, default=0)

    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student")
