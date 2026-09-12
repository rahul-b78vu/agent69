"""
Baseline Engine (Step 5 / spec §4).

Computes a PERSONAL baseline for one student from their OWN historical
signal data - never from a class/peer average. This is the foundation
every later deviation-detection decision is built on.

Supported baseline methods (configurable via threshold_configs / Settings):
    - "mean"           : simple historical mean
    - "median"         : historical median (robust to outliers/spikes)
    - "rolling_mean"    : mean over the most recent N periods (default),
                          which lets the baseline adapt slowly over a long
                          semester while still resisting single-week noise

Also computes:
    - std_dev / rolling_std_dev  (for deviation-strength scoring later)
    - data_points_used and a confidence score
    - is_confident flag (data_points_used >= BASELINE_MIN_DATA_POINTS)

A baseline is written to `student_baselines` (upsert) per student per
signal type. Downstream engines (deviation detection, correlation,
classification) always read from `student_baselines`, never recompute
their own ad hoc average - keeping the "one personal baseline" principle
consistent everywhere.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Sequence

import numpy as np
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models.signals import (
    StudentBaseline, SignalType,
    AttendanceRecord, AssessmentRecord, AssignmentRecord, EngagementRecord,
    FinancialRecord, BacklogRecord, LibraryRecord, BehaviourRecord,
)
from app.models.governance import ThresholdConfig


# Maps each SignalType to (table, value_column_name).
# FINANCIAL and BACKLOG are handled specially (see _extract_series) since
# their "value" isn't a single obvious column.
_SIGNAL_SOURCE = {
    SignalType.ATTENDANCE: (AttendanceRecord, "attendance_pct"),
    SignalType.MARKS: (AssessmentRecord, "marks_pct"),
    SignalType.ASSIGNMENT: (AssignmentRecord, "submission_rate_pct"),
    SignalType.ENGAGEMENT: (EngagementRecord, "engagement_score"),
    SignalType.LIBRARY: (LibraryRecord, "library_visits"),
}


@dataclass
class BaselineResult:
    signal_type: SignalType
    method: str
    mean_value: Optional[float]
    median_value: Optional[float]
    rolling_mean_value: Optional[float]
    std_dev: Optional[float]
    rolling_std_dev: Optional[float]
    data_points_used: int
    confidence: float
    is_confident: bool


def _get_threshold(db: Session, key: str, default: float) -> float:
    row = db.query(ThresholdConfig).filter_by(key=key).first()
    return row.value if row is not None else default


def _extract_series(db: Session, student_id: int, signal_type: SignalType, up_to_week: Optional[int]) -> Sequence[float]:
    """
    Returns the ordered (by week) historical value series for one
    student/signal, optionally restricted to weeks <= up_to_week (so the
    baseline only ever uses data that would have been available "so far",
    never future/leakage data).
    """
    if signal_type in (SignalType.FINANCIAL,):
        q = db.query(FinancialRecord).filter(FinancialRecord.student_id == student_id)
        if up_to_week is not None:
            q = q.filter(FinancialRecord.week_number <= up_to_week)
        rows = q.order_by(FinancialRecord.week_number).all()
        # baseline signal = amount_overdue (a student's "normal" is usually 0)
        return [r.amount_overdue for r in rows]

    if signal_type in (SignalType.BACKLOG,):
        q = db.query(BacklogRecord).filter(BacklogRecord.student_id == student_id)
        if up_to_week is not None:
            q = q.filter(BacklogRecord.week_number <= up_to_week)
        rows = q.order_by(BacklogRecord.week_number).all()
        return [r.backlog_count for r in rows]

    if signal_type in (SignalType.BEHAVIOUR,):
        # A student's "normal" is the absence of authorized flags (0). This
        # baseline exists mainly so a sudden run of flags stands out from
        # the student's own (usually flat, at-zero) history - it is never
        # used to infer sensitive characteristics, only frequency of
        # already-authorized, factual staff observations.
        q = db.query(BehaviourRecord).filter(BehaviourRecord.student_id == student_id)
        if up_to_week is not None:
            q = q.filter(BehaviourRecord.week_number <= up_to_week)
        rows = q.order_by(BehaviourRecord.week_number).all()
        return [1.0 if r.observation_flag else 0.0 for r in rows]

    model, col = _SIGNAL_SOURCE[signal_type]
    q = db.query(model).filter(model.student_id == student_id)
    if up_to_week is not None:
        q = q.filter(model.week_number <= up_to_week)
    rows = q.order_by(model.week_number).all()
    return [getattr(r, col) for r in rows]


def compute_baseline_for_signal(
    db: Session,
    student_id: int,
    signal_type: SignalType,
    up_to_week: Optional[int] = None,
) -> BaselineResult:
    """
    Pure computation - does not touch the database beyond reading.
    `up_to_week`: if given, only uses history up to (and including) that
    week. This is what lets deviation detection compare "current week"
    against a baseline built strictly from *prior* weeks, avoiding leakage.
    If None, uses all available history for this student/signal.
    """
    settings = get_settings()
    method = settings.BASELINE_METHOD
    min_points = int(_get_threshold(db, "BASELINE_MIN_DATA_POINTS", settings.BASELINE_MIN_DATA_POINTS))
    window = int(_get_threshold(db, "BASELINE_ROLLING_WINDOW", settings.BASELINE_ROLLING_WINDOW))

    series = _extract_series(db, student_id, signal_type, up_to_week)
    n = len(series)

    if n == 0:
        return BaselineResult(
            signal_type=signal_type, method=method,
            mean_value=None, median_value=None, rolling_mean_value=None,
            std_dev=None, rolling_std_dev=None,
            data_points_used=0, confidence=0.0, is_confident=False,
        )

    arr = np.array(series, dtype=float)
    mean_value = float(np.mean(arr))
    median_value = float(np.median(arr))
    std_dev = float(np.std(arr, ddof=1)) if n > 1 else 0.0

    recent = arr[-window:] if n >= 1 else arr
    rolling_mean_value = float(np.mean(recent))
    rolling_std_dev = float(np.std(recent, ddof=1)) if len(recent) > 1 else 0.0

    # Confidence grows with data volume, saturating at 1.0 once we have
    # at least min_points *2 (i.e. a well-established history), and is 0
    # below the configured minimum.
    if n < min_points:
        confidence = round(0.5 * (n / max(min_points, 1)), 2)  # partial, capped under 0.5
        is_confident = False
    else:
        confidence = round(min(1.0, 0.5 + 0.5 * ((n - min_points) / max(min_points, 1))), 2)
        is_confident = True

    return BaselineResult(
        signal_type=signal_type,
        method=method,
        mean_value=round(mean_value, 3),
        median_value=round(median_value, 3),
        rolling_mean_value=round(rolling_mean_value, 3),
        std_dev=round(std_dev, 3),
        rolling_std_dev=round(rolling_std_dev, 3),
        data_points_used=n,
        confidence=confidence,
        is_confident=is_confident,
    )


def get_baseline_point_estimate(result: BaselineResult) -> Optional[float]:
    """
    Returns the single scalar baseline value to compare "current" against,
    per the configured method.
    """
    if result.method == "mean":
        return result.mean_value
    if result.method == "median":
        return result.median_value
    return result.rolling_mean_value  # default: rolling_mean


def recalculate_and_store_baseline(
    db: Session,
    student_id: int,
    signal_type: SignalType,
    up_to_week: Optional[int] = None,
) -> StudentBaseline:
    """
    Computes the baseline and upserts it into student_baselines.
    """
    result = compute_baseline_for_signal(db, student_id, signal_type, up_to_week)

    row = (
        db.query(StudentBaseline)
        .filter_by(student_id=student_id, signal_type=signal_type)
        .first()
    )
    if row is None:
        row = StudentBaseline(student_id=student_id, signal_type=signal_type)
        db.add(row)

    row.method = result.method
    row.mean_value = result.mean_value
    row.median_value = result.median_value
    row.rolling_mean_value = result.rolling_mean_value
    row.std_dev = result.std_dev
    row.rolling_std_dev = result.rolling_std_dev
    row.data_points_used = result.data_points_used
    row.confidence = result.confidence
    row.is_confident = result.is_confident
    row.last_calculated_at = datetime.utcnow()

    db.flush()
    return row


def recalculate_all_baselines_for_student(db: Session, student_id: int, up_to_week: Optional[int] = None):
    """Recomputes baselines for every signal type for one student."""
    results = {}
    for signal_type in SignalType:
        results[signal_type] = recalculate_and_store_baseline(db, student_id, signal_type, up_to_week)
    db.commit()
    return results


def recalculate_all_baselines(db: Session, up_to_week: Optional[int] = None):
    """
    Recomputes baselines for every student, every signal type. Intended to
    be run periodically (e.g. weekly) by the orchestrator, ahead of
    deviation detection.
    """
    from app.models.core import Student
    student_ids = [s.id for s in db.query(Student.id).filter(Student.is_active == True).all()]  # noqa: E712
    for sid in student_ids:
        for signal_type in SignalType:
            recalculate_and_store_baseline(db, sid, signal_type, up_to_week)
    db.commit()
    return {"students_processed": len(student_ids)}
