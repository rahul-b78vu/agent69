"""
Multi-Signal Correlation Engine (Step 9 / spec §7).

Combines independent WarningSignals detected for a student in a given period.
Applies configurable weights stored in `threshold_configs`.
Filters out transient single-week blips that lack corroboration or persistence.
Computes a composite warning_score and overall detection confidence.
"""
from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.signals import SignalType, WarningSignal
from app.models.governance import ThresholdConfig


@dataclass
class CorrelationResult:
    student_id: int
    week_number: int
    contributing_signals: List[WarningSignal]
    warning_score: int
    confidence: float
    is_multi_signal: bool
    has_sustained_signal: bool
    signal_types: List[SignalType]


def correlate_signals(
    db: Session,
    student_id: int,
    week_number: int,
    signals: List[WarningSignal],
) -> CorrelationResult:
    """
    Correlates active warning signals for a student at week_number.
    Calculates total weighted score, filtering out isolated non-sustained blips.
    """
    if not signals:
        return CorrelationResult(
            student_id=student_id,
            week_number=week_number,
            contributing_signals=[],
            warning_score=0,
            confidence=0.0,
            is_multi_signal=False,
            has_sustained_signal=False,
            signal_types=[],
        )

    # Filter out signals that are 'none'
    active_signals = [s for s in signals if s.strength != "none"]

    # Check for transient single-week blip:
    # If there is ONLY ONE signal, and it is NOT sustained, and strength is 'weak':
    # This represents noise or temporary blip (Scenario 1 & 6).
    has_sustained = any(s.is_sustained for s in active_signals)
    is_multi = len(active_signals) >= 2
    strong_signals = [s for s in active_signals if s.strength == "strong"]

    # Calculate weighted score
    total_score = 0
    for s in active_signals:
        total_score += s.weight_applied

    # Apply safety rule:
    # A single weak, non-sustained signal without other corroborating signals
    # must not generate a significant warning score.
    if len(active_signals) == 1 and not has_sustained and active_signals[0].strength == "weak":
        # Keep score minimal (e.g. 1) so it stays strictly in LOW or sub-warning
        total_score = min(total_score, 1)

    # Calculate confidence:
    # - Increases with more corroborating signals
    # - Increases if signals are sustained
    # - Increases if signal strengths are strong
    base_conf = 0.5 if active_signals else 0.0
    if is_multi:
        base_conf += min(0.3, len(active_signals) * 0.1)
    if has_sustained:
        base_conf += 0.15
    if strong_signals:
        base_conf += 0.05 * len(strong_signals)
    confidence = round(min(1.0, max(0.1, base_conf)), 2)

    signal_types = [s.signal_type for s in active_signals]

    return CorrelationResult(
        student_id=student_id,
        week_number=week_number,
        contributing_signals=active_signals,
        warning_score=total_score,
        confidence=confidence,
        is_multi_signal=is_multi,
        has_sustained_signal=has_sustained,
        signal_types=signal_types,
    )
