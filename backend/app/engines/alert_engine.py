"""
Alert Generation & Explainability Engine (Step 13 / spec §9 & §10).

Creates complete, auditable Alert and AlertEvidence records.
Enforces the mandatory explainability requirement:
Every alert must detail baseline vs current values, deviation %, weights,
combined score, category, suggested responder role, and explicit human review notices.
Guarantees non-diagnostic, non-punitive narrative wording.
"""
from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session

from app.models.alerts import (
    Alert,
    AlertEvidence,
    AlertStatus,
    WarningCategory,
    Severity,
    Urgency,
    ResponderRole,
)
from app.models.signals import SignalType, WarningSignal
from app.engines.correlation_engine import CorrelationResult


def generate_explainability_narrative(
    category: WarningCategory,
    severity: Severity,
    result: CorrelationResult,
    suggested_role: ResponderRole,
) -> str:
    """
    Constructs the structured, human-readable explanation matching the project spec.
    """
    lines = ["WHY THIS ALERT WAS GENERATED\n"]

    for s in result.contributing_signals:
        name = s.signal_type.value.replace("_", " ").title()
        b_val = f"{s.baseline_value:.1f}%" if s.signal_type in (
            SignalType.ATTENDANCE, SignalType.MARKS, SignalType.ASSIGNMENT
        ) else f"{s.baseline_value:.1f}"
        c_val = f"{s.current_value:.1f}%" if s.signal_type in (
            SignalType.ATTENDANCE, SignalType.MARKS, SignalType.ASSIGNMENT
        ) else f"{s.current_value:.1f}"

        if s.signal_type == SignalType.FINANCIAL:
            b_val = "0 overdue"
            c_val = f"{s.current_value:,.0f} overdue"

        lines.append(f"{name}:")
        lines.append(f"  Baseline = {b_val}")
        lines.append(f"  Current = {c_val}")
        lines.append(f"  Deviation = {s.deviation:+.1f} (Strength: {s.strength.upper()}, Weight: {s.weight_applied})")
        if s.is_sustained:
            lines.append(f"  [Sustained pattern: {s.sustained_periods} consecutive periods]")
        lines.append("")

    lines.append(f"Combined score = {result.warning_score}")
    lines.append(f"Confidence = {int(result.confidence * 100)}%")
    lines.append(f"Classification = {category.value.replace('_', ' ').title()}")
    lines.append(f"Severity = {severity.value}")
    lines.append(f"Recommended response = {suggested_role.value.replace('_', ' ').title()} review")
    lines.append("")

    if category == WarningCategory.HEALTH_PERSONAL:
        lines.append("Note: Changes in attendance and engagement have been observed. A confidential human check-in may be appropriate.")
    else:
        lines.append("Final notice: This is an observed pattern and requires human review.")

    return "\n".join(lines)


def build_evidence_description(signal: WarningSignal) -> str:
    """Builds a concise, neutral description for a single evidence item."""
    name = signal.signal_type.value.replace("_", " ").lower()
    if signal.signal_type == SignalType.ATTENDANCE:
        return f"Attendance changed from personal baseline of {signal.baseline_value:.1f}% to {signal.current_value:.1f}% ({signal.deviation:+.1f}% deviation)."
    if signal.signal_type == SignalType.MARKS:
        return f"Assessment marks changed from baseline of {signal.baseline_value:.1f}% to {signal.current_value:.1f}%."
    if signal.signal_type == SignalType.ASSIGNMENT:
        return f"Assignment submission rate changed from {signal.baseline_value:.1f}% to {signal.current_value:.1f}%."
    if signal.signal_type == SignalType.FINANCIAL:
        return f"Institutional fee balance overdue by {signal.current_value:,.0f}."
    if signal.signal_type == SignalType.BACKLOG:
        return f"Backlog count increased to {int(signal.current_value)}."
    if signal.signal_type == SignalType.ENGAGEMENT:
        return f"Academic LMS/portal engagement index changed from {signal.baseline_value:.1f} to {signal.current_value:.1f}."
    if signal.signal_type == SignalType.LIBRARY:
        return f"Campus library usage dropped from baseline {signal.baseline_value:.1f} to {signal.current_value:.1f} visits."
    return f"Authorized staff factual observation logged for week {signal.week_number}."


def create_alert(
    db: Session,
    student_id: int,
    category: WarningCategory,
    severity: Severity,
    urgency: Urgency,
    deadline: datetime,
    suggested_role: ResponderRole,
    assigned_user_id: int,
    result: CorrelationResult,
) -> Alert:
    """
    Creates and persists Alert and all AlertEvidence rows in the database.
    """
    narrative = generate_explainability_narrative(category, severity, result, suggested_role)
    now = datetime.now(timezone.utc)

    alert = Alert(
        student_id=student_id,
        category=category,
        severity=severity,
        urgency=urgency,
        confidence=result.confidence,
        warning_score=result.warning_score,
        suggested_responder_role=suggested_role,
        assigned_user_id=assigned_user_id,
        status=AlertStatus.NEW,
        narrative_summary=narrative,
        response_deadline=deadline,
        created_at=now,
        updated_at=now,
    )
    db.add(alert)
    db.flush()

    for s in result.contributing_signals:
        evidence = AlertEvidence(
            alert_id=alert.id,
            warning_signal_id=s.id,
            signal_type=s.signal_type.value,
            baseline_value=s.baseline_value,
            current_value=s.current_value,
            deviation_pct=s.deviation_pct,
            strength=s.strength,
            weight_applied=s.weight_applied,
            description=build_evidence_description(s),
        )
        db.add(evidence)

    db.commit()
    db.refresh(alert)
    return alert
