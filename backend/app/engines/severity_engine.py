"""
Severity & Urgency Engine (Step 11 / spec §7 & §11).

Calculates:
1. Severity: LOW, MEDIUM, HIGH
   Mapped from warning_score using database-configured bands (SEVERITY_LOW_MAX, SEVERITY_MEDIUM_MAX).
2. Urgency: ROUTINE, PROMPT, IMMEDIATE
   Determined by severity, signal strengths, and rate of change.
3. Response Deadline:
   Calculated based on configured SLA response windows (e.g. 24h for HIGH, 72h for MEDIUM, 168h for LOW).
"""
from datetime import datetime, timedelta, timezone
from typing import Tuple

from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models.alerts import Severity, Urgency
from app.models.governance import ThresholdConfig
from app.engines.correlation_engine import CorrelationResult


def _get_config(db: Session, key: str, default: float) -> float:
    row = db.query(ThresholdConfig).filter_by(key=key).first()
    return float(row.value) if row is not None else float(default)


def compute_severity(db: Session, score: int, is_multi_signal: bool, has_strong: bool) -> Severity:
    """
    Computes alert severity. Enforces guardrail:
    A high-severity alert generally requires multiple signals or a strong sustained signal.
    """
    settings = get_settings()
    low_max = int(_get_config(db, "SEVERITY_LOW_MAX", settings.SEVERITY_LOW_MAX))
    med_max = int(_get_config(db, "SEVERITY_MEDIUM_MAX", settings.SEVERITY_MEDIUM_MAX))

    if score <= low_max:
        return Severity.LOW
    elif score <= med_max:
        return Severity.MEDIUM
    else:
        # High severity requires either multi-signal or at least one strong signal
        if is_multi_signal or has_strong:
            return Severity.HIGH
        return Severity.MEDIUM


def compute_urgency(severity: Severity, result: CorrelationResult) -> Urgency:
    """
    Calculates urgency:
    - IMMEDIATE: High severity with sustained multi-signals or critical indicators
    - PROMPT: Medium severity, or High severity routine monitoring
    - ROUTINE: Low severity
    """
    if severity == Severity.HIGH:
        if result.has_sustained_signal and (result.is_multi_signal or len(result.contributing_signals) >= 2):
            return Urgency.IMMEDIATE
        return Urgency.PROMPT

    if severity == Severity.MEDIUM:
        return Urgency.PROMPT

    return Urgency.ROUTINE


def compute_response_deadline(db: Session, severity: Severity, from_time: datetime) -> datetime:
    """
    Computes deadline datetime based on SLA configuration in threshold_configs.
    """
    settings = get_settings()
    if severity == Severity.HIGH:
        hours = _get_config(db, "RESPONSE_WINDOW_HIGH_HOURS", settings.RESPONSE_WINDOW_HIGH_HOURS)
    elif severity == Severity.MEDIUM:
        hours = _get_config(db, "RESPONSE_WINDOW_MEDIUM_HOURS", settings.RESPONSE_WINDOW_MEDIUM_HOURS)
    else:
        hours = _get_config(db, "RESPONSE_WINDOW_LOW_HOURS", settings.RESPONSE_WINDOW_LOW_HOURS)

    return from_time + timedelta(hours=int(hours))


def evaluate_severity_and_urgency(
    db: Session,
    result: CorrelationResult,
    from_time: datetime,
) -> Tuple[Severity, Urgency, datetime]:
    """
    Orchestrates severity, urgency, and deadline computation.
    """
    has_strong = any(s.strength == "strong" for s in result.contributing_signals)
    severity = compute_severity(db, result.warning_score, result.is_multi_signal, has_strong)
    urgency = compute_urgency(severity, result)
    deadline = compute_response_deadline(db, severity, from_time)

    return severity, urgency, deadline
