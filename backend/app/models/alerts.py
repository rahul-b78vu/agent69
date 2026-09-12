"""
Alert lifecycle models. An Alert is always framed as an "observed pattern
requiring human review" - never as a diagnosis or a final decision.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text
)
from sqlalchemy.orm import relationship

from app.database.session import Base


class WarningCategory(str, enum.Enum):
    ACADEMIC_DIFFICULTY = "ACADEMIC_DIFFICULTY"
    DISENGAGEMENT = "DISENGAGEMENT"
    FINANCIAL_DIFFICULTY = "FINANCIAL_DIFFICULTY"
    HEALTH_PERSONAL = "HEALTH_PERSONAL"
    GENERAL_EARLY_WARNING = "GENERAL_EARLY_WARNING"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Urgency(str, enum.Enum):
    ROUTINE = "ROUTINE"
    PROMPT = "PROMPT"
    IMMEDIATE = "IMMEDIATE"


class ResponderRole(str, enum.Enum):
    MENTOR = "MENTOR"
    HOD = "HOD"
    DEAN = "DEAN"
    COUNSELLOR = "COUNSELLOR"
    PRINCIPAL = "PRINCIPAL"
    FINANCE_SUPPORT = "FINANCE_SUPPORT"


class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_REVIEW = "IN_REVIEW"
    ACTION_TAKEN = "ACTION_TAKEN"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    ESCALATED = "ESCALATED"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)

    category = Column(SAEnum(WarningCategory), nullable=False)
    severity = Column(SAEnum(Severity), nullable=False)
    urgency = Column(SAEnum(Urgency), nullable=False)
    confidence = Column(Float, nullable=False, default=0.0)   # 0.0 - 1.0
    warning_score = Column(Integer, nullable=False, default=0)

    suggested_responder_role = Column(SAEnum(ResponderRole), nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(SAEnum(AlertStatus), nullable=False, default=AlertStatus.NEW)

    # Neutral, human-readable, non-diagnostic summary (see engines/explanation_engine.py)
    narrative_summary = Column(Text, nullable=False)

    response_deadline = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="alerts")
    evidence = relationship("AlertEvidence", back_populates="alert", cascade="all, delete-orphan")
    responses = relationship("AlertResponse", back_populates="alert", cascade="all, delete-orphan")
    escalations = relationship("AlertEscalation", back_populates="alert", cascade="all, delete-orphan")
    outcome = relationship("AlertOutcome", back_populates="alert", uselist=False, cascade="all, delete-orphan")


class AlertEvidence(Base):
    """One row per contributing signal, so every alert is fully explainable."""
    __tablename__ = "alert_evidence"

    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    warning_signal_id = Column(Integer, ForeignKey("warning_signals.id"), nullable=True)

    signal_type = Column(String(30), nullable=False)
    baseline_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    deviation_pct = Column(Float, nullable=True)
    strength = Column(String(20), nullable=False)
    weight_applied = Column(Integer, nullable=False, default=0)
    description = Column(String(500), nullable=False)   # e.g. "Attendance decreased from 92% to 74% over 3 weeks."

    alert = relationship("Alert", back_populates="evidence")


class AlertResponse(Base):
    """Human actions taken on an alert (acknowledge, notes, actions)."""
    __tablename__ = "alert_responses"

    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    responder_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    action = Column(String(50), nullable=False)   # ACKNOWLEDGE | NOTE | ACTION_RECORDED | STATUS_CHANGE
    notes = Column(Text, nullable=True)
    new_status = Column(SAEnum(AlertStatus), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    alert = relationship("Alert", back_populates="responses")


class AlertEscalation(Base):
    __tablename__ = "alert_escalations"

    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)

    escalation_level = Column(Integer, nullable=False)   # 1, 2, 3 ...
    escalated_to_role = Column(SAEnum(ResponderRole), nullable=False)
    reason = Column(String(255), nullable=False)          # e.g. "No response within configured window"
    escalated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    alert = relationship("Alert", back_populates="escalations")


class OutcomeChoice(str, enum.Enum):
    CONCERN_CONFIRMED = "CONCERN_CONFIRMED"
    NO_CONCERN_FOUND = "NO_CONCERN_FOUND"
    STUDENT_REQUESTED_SUPPORT = "STUDENT_REQUESTED_SUPPORT"
    ACADEMIC_SUPPORT_PROVIDED = "ACADEMIC_SUPPORT_PROVIDED"
    FINANCIAL_SUPPORT_PROVIDED = "FINANCIAL_SUPPORT_PROVIDED"
    COUNSELLING_REFERRAL = "COUNSELLING_REFERRAL"
    OTHER = "OTHER"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class AlertOutcome(Base):
    """
    Final, human-recorded outcome. This is NEVER written by the agent -
    only a human responder can set it (enforced in the service layer).
    Used later by the Calibration Engine.
    """
    __tablename__ = "alert_outcomes"

    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), unique=True, nullable=False)
    responder_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    action_taken = Column(String(255), nullable=True)
    outcome = Column(SAEnum(OutcomeChoice), nullable=False)
    concern_was_real = Column(Boolean, nullable=True)
    intervention_useful = Column(Boolean, nullable=True)
    is_false_positive = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    alert = relationship("Alert", back_populates="outcome")
