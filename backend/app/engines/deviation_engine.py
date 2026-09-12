"""
Deviation Detection Engine (Step 8 / spec §6).

Compares a student's current weekly signal observations against their OWN
personal baseline (from student_baselines or computed up to prior week).

Produces WarningSignal instances categorized by strength:
- "none"
- "weak"
- "moderate"
- "strong"

All thresholds and weights are read dynamically from `threshold_configs`,
falling back to `Settings`.
"""
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models.governance import ThresholdConfig
from app.models.signals import (
    SignalType,
    WarningSignal,
    AttendanceRecord,
    AssessmentRecord,
    AssignmentRecord,
    EngagementRecord,
    FinancialRecord,
    BacklogRecord,
    BehaviourRecord,
    LibraryRecord,
)
from app.engines.baseline_engine import (
    compute_baseline_for_signal,
    get_baseline_point_estimate,
)


def _get_config(db: Session, key: str, default: float) -> float:
    row = db.query(ThresholdConfig).filter_by(key=key).first()
    return float(row.value) if row is not None else float(default)


def _determine_strength(
    deviation_pct: float,
    thresh_low: float,
    thresh_med: float,
    thresh_high: float,
) -> str:
    """
    deviation_pct is positive for decline magnitude (e.g. 15.0 means dropped by 15%).
    """
    if deviation_pct >= thresh_high:
        return "strong"
    if deviation_pct >= thresh_med:
        return "moderate"
    if deviation_pct >= thresh_low:
        return "weak"
    return "none"


def detect_attendance_deviation(
    db: Session, student_id: int, week_number: int, baseline_val: Optional[float]
) -> Optional[WarningSignal]:
    """
    Detects sudden and sustained attendance decline.
    """
    settings = get_settings()
    sustained_target = int(_get_config(db, "ATTENDANCE_SUSTAINED_WEEKS", settings.ATTENDANCE_SUSTAINED_WEEKS))
    low_th = _get_config(db, "ATTENDANCE_DEVIATION_PCT_LOW", settings.ATTENDANCE_DEVIATION_PCT_LOW)
    med_th = _get_config(db, "ATTENDANCE_DEVIATION_PCT_MEDIUM", settings.ATTENDANCE_DEVIATION_PCT_MEDIUM)
    high_th = _get_config(db, "ATTENDANCE_DEVIATION_PCT_HIGH", settings.ATTENDANCE_DEVIATION_PCT_HIGH)
    weight = int(_get_config(db, "WEIGHT_ATTENDANCE_DECLINE", settings.WEIGHT_ATTENDANCE_DECLINE))

    # Fetch recent records up to current week
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student_id, AttendanceRecord.week_number <= week_number)
        .order_by(AttendanceRecord.week_number.desc())
        .limit(sustained_target + 2)
        .all()
    )
    if not records:
        return None

    current_rec = records[0]
    current_val = current_rec.attendance_pct

    if baseline_val is None or baseline_val <= 0:
        return None

    # deviation: current - baseline (e.g., 70 - 85 = -15)
    deviation = current_val - baseline_val
    # deviation_pct: percentage drop relative to baseline (e.g., 15 / 85 * 100 = 17.65%)
    # Or absolute percentage points drop on 0-100 scale:
    # In educational context, a drop from 90% to 75% is a 15 percentage point drop.
    drop_points = baseline_val - current_val
    drop_pct = (drop_points / baseline_val) * 100.0 if baseline_val > 0 else 0.0

    # Count consecutive weeks below baseline by at least low_th points
    consecutive_below = 0
    for r in records:
        if (baseline_val - r.attendance_pct) >= low_th:
            consecutive_below += 1
        else:
            break

    is_sustained = consecutive_below >= sustained_target
    strength = _determine_strength(drop_points, low_th, med_th, high_th)

    # If it's sustained, promote weak to moderate
    if is_sustained and strength == "weak":
        strength = "moderate"

    if strength == "none":
        return None

    now = datetime.now(timezone.utc)
    return WarningSignal(
        student_id=student_id,
        signal_type=SignalType.ATTENDANCE,
        week_number=week_number,
        period_start=current_rec.period_start,
        baseline_value=round(baseline_val, 2),
        current_value=round(current_val, 2),
        deviation=round(deviation, 2),
        deviation_pct=round(drop_pct, 2),
        is_sustained=is_sustained,
        sustained_periods=consecutive_below,
        strength=strength,
        weight_applied=weight if strength in ("moderate", "strong") else max(1, weight // 2),
        detected_at=now,
    )


def detect_marks_deviation(
    db: Session, student_id: int, week_number: int, baseline_val: Optional[float]
) -> Optional[WarningSignal]:
    """Detects internal assessment marks decline compared to personal baseline."""
    settings = get_settings()
    low_th = _get_config(db, "MARKS_DEVIATION_PCT_LOW", settings.MARKS_DEVIATION_PCT_LOW)
    med_th = _get_config(db, "MARKS_DEVIATION_PCT_MEDIUM", settings.MARKS_DEVIATION_PCT_MEDIUM)
    high_th = _get_config(db, "MARKS_DEVIATION_PCT_HIGH", settings.MARKS_DEVIATION_PCT_HIGH)
    weight = int(_get_config(db, "WEIGHT_MARKS_DECLINE", settings.WEIGHT_MARKS_DECLINE))

    rec = (
        db.query(AssessmentRecord)
        .filter_by(student_id=student_id, week_number=week_number)
        .first()
    )
    if not rec or baseline_val is None or baseline_val <= 0:
        return None

    current_val = rec.marks_pct
    deviation = current_val - baseline_val
    drop_points = baseline_val - current_val
    drop_pct = (drop_points / baseline_val) * 100.0

    strength = _determine_strength(drop_points, low_th, med_th, high_th)
    if strength == "none":
        return None

    # Check persistence over 2+ assessment cycles
    recent = (
        db.query(AssessmentRecord)
        .filter(AssessmentRecord.student_id == student_id, AssessmentRecord.week_number <= week_number)
        .order_by(AssessmentRecord.week_number.desc())
        .limit(3)
        .all()
    )
    consecutive = sum(1 for r in recent if (baseline_val - r.marks_pct) >= low_th)

    return WarningSignal(
        student_id=student_id,
        signal_type=SignalType.MARKS,
        week_number=week_number,
        period_start=rec.period_start,
        baseline_value=round(baseline_val, 2),
        current_value=round(current_val, 2),
        deviation=round(deviation, 2),
        deviation_pct=round(drop_pct, 2),
        is_sustained=consecutive >= 2,
        sustained_periods=consecutive,
        strength=strength,
        weight_applied=weight if strength in ("moderate", "strong") else max(1, weight // 2),
        detected_at=datetime.now(timezone.utc),
    )


def detect_assignment_deviation(
    db: Session, student_id: int, week_number: int, baseline_val: Optional[float]
) -> Optional[WarningSignal]:
    """Detects decline in assignment submission rate or missed assignments."""
    settings = get_settings()
    low_th = _get_config(db, "ASSIGNMENT_DEVIATION_PCT_LOW", settings.ASSIGNMENT_DEVIATION_PCT_LOW)
    med_th = _get_config(db, "ASSIGNMENT_DEVIATION_PCT_MEDIUM", settings.ASSIGNMENT_DEVIATION_PCT_MEDIUM)
    high_th = _get_config(db, "ASSIGNMENT_DEVIATION_PCT_HIGH", settings.ASSIGNMENT_DEVIATION_PCT_HIGH)
    weight = int(_get_config(db, "WEIGHT_ASSIGNMENT_DECLINE", settings.WEIGHT_ASSIGNMENT_DECLINE))

    rec = (
        db.query(AssignmentRecord)
        .filter_by(student_id=student_id, week_number=week_number)
        .first()
    )
    if not rec or baseline_val is None or baseline_val <= 0:
        return None

    current_val = rec.submission_rate_pct
    deviation = current_val - baseline_val
    drop_points = baseline_val - current_val
    drop_pct = (drop_points / baseline_val) * 100.0

    strength = _determine_strength(drop_points, low_th, med_th, high_th)
    if strength == "none":
        return None

    recent = (
        db.query(AssignmentRecord)
        .filter(AssignmentRecord.student_id == student_id, AssignmentRecord.week_number <= week_number)
        .order_by(AssignmentRecord.week_number.desc())
        .limit(3)
        .all()
    )
    consecutive = sum(1 for r in recent if (baseline_val - r.submission_rate_pct) >= low_th)

    return WarningSignal(
        student_id=student_id,
        signal_type=SignalType.ASSIGNMENT,
        week_number=week_number,
        period_start=rec.period_start,
        baseline_value=round(baseline_val, 2),
        current_value=round(current_val, 2),
        deviation=round(deviation, 2),
        deviation_pct=round(drop_pct, 2),
        is_sustained=consecutive >= 2,
        sustained_periods=consecutive,
        strength=strength,
        weight_applied=weight if strength in ("moderate", "strong") else max(1, weight // 2),
        detected_at=datetime.now(timezone.utc),
    )


def detect_engagement_deviation(
    db: Session, student_id: int, week_number: int, baseline_val: Optional[float]
) -> Optional[WarningSignal]:
    """Detects LMS/portal academic engagement score decline."""
    settings = get_settings()
    weight = int(_get_config(db, "WEIGHT_ENGAGEMENT_DECLINE", settings.WEIGHT_ENGAGEMENT_DECLINE))

    rec = (
        db.query(EngagementRecord)
        .filter_by(student_id=student_id, week_number=week_number)
        .first()
    )
    if not rec or baseline_val is None or baseline_val <= 0:
        return None

    current_val = rec.engagement_score
    deviation = current_val - baseline_val
    drop_points = baseline_val - current_val
    drop_pct = (drop_points / baseline_val) * 100.0

    # For engagement score: 15 pt drop = weak, 25 pt drop = med, 40 pt drop = strong
    strength = _determine_strength(drop_points, 15.0, 25.0, 40.0)
    if strength == "none":
        return None

    recent = (
        db.query(EngagementRecord)
        .filter(EngagementRecord.student_id == student_id, EngagementRecord.week_number <= week_number)
        .order_by(EngagementRecord.week_number.desc())
        .limit(3)
        .all()
    )
    consecutive = sum(1 for r in recent if (baseline_val - r.engagement_score) >= 15.0)

    return WarningSignal(
        student_id=student_id,
        signal_type=SignalType.ENGAGEMENT,
        week_number=week_number,
        period_start=rec.period_start,
        baseline_value=round(baseline_val, 2),
        current_value=round(current_val, 2),
        deviation=round(deviation, 2),
        deviation_pct=round(drop_pct, 2),
        is_sustained=consecutive >= 2,
        sustained_periods=consecutive,
        strength=strength,
        weight_applied=weight if strength in ("moderate", "strong") else max(1, weight // 2),
        detected_at=datetime.now(timezone.utc),
    )


def detect_financial_deviation(
    db: Session, student_id: int, week_number: int, baseline_val: Optional[float] = None
) -> Optional[WarningSignal]:
    """Detects payment delays and overdue fee balances."""
    settings = get_settings()
    weight = int(_get_config(db, "WEIGHT_FEE_ISSUE", settings.WEIGHT_FEE_ISSUE))

    rec = (
        db.query(FinancialRecord)
        .filter_by(student_id=student_id, week_number=week_number)
        .first()
    )
    if not rec or rec.amount_overdue <= 0:
        return None

    overdue = rec.amount_overdue
    days = rec.days_overdue

    # Strength depends on days overdue or overdue amount
    if days >= 30 or overdue >= 25000:
        strength = "strong"
    elif days >= 14 or overdue >= 10000:
        strength = "moderate"
    elif days >= 7 or overdue > 0:
        strength = "weak"
    else:
        return None

    return WarningSignal(
        student_id=student_id,
        signal_type=SignalType.FINANCIAL,
        week_number=week_number,
        period_start=rec.period_start,
        baseline_value=0.0,
        current_value=float(overdue),
        deviation=float(overdue),
        deviation_pct=100.0,
        is_sustained=days >= 14,
        sustained_periods=max(1, days // 7),
        strength=strength,
        weight_applied=weight if strength in ("moderate", "strong") else max(1, weight // 2),
        detected_at=datetime.now(timezone.utc),
    )


def detect_backlog_deviation(
    db: Session, student_id: int, week_number: int, baseline_val: Optional[float] = None
) -> Optional[WarningSignal]:
    """Detects new backlogs or accumulation of backlogs compared to student history."""
    settings = get_settings()
    weight = int(_get_config(db, "WEIGHT_BACKLOG_INCREASE", settings.WEIGHT_BACKLOG_INCREASE))

    rec = (
        db.query(BacklogRecord)
        .filter_by(student_id=student_id, week_number=week_number)
        .first()
    )
    if not rec:
        return None

    base_count = baseline_val if baseline_val is not None else 0.0
    current_count = float(rec.backlog_count)
    new_backlogs = rec.new_backlogs_this_period

    if new_backlogs > 0 or current_count > base_count:
        diff = current_count - base_count
        if new_backlogs >= 2 or diff >= 2:
            strength = "strong"
        elif new_backlogs == 1 or diff >= 1:
            strength = "moderate"
        else:
            strength = "weak"

        return WarningSignal(
            student_id=student_id,
            signal_type=SignalType.BACKLOG,
            week_number=week_number,
            period_start=rec.period_start,
            baseline_value=float(base_count),
            current_value=float(current_count),
            deviation=float(diff),
            deviation_pct=float((diff / max(1.0, base_count)) * 100.0),
            is_sustained=current_count > 1,
            sustained_periods=int(current_count),
            strength=strength,
            weight_applied=weight if strength in ("moderate", "strong") else max(1, weight // 2),
            detected_at=datetime.now(timezone.utc),
        )
    return None


def detect_library_deviation(
    db: Session, student_id: int, week_number: int, baseline_val: Optional[float]
) -> Optional[WarningSignal]:
    """Detects drop in campus library visits / campus logins."""
    settings = get_settings()
    weight = int(_get_config(db, "WEIGHT_LIBRARY_DECLINE", settings.WEIGHT_LIBRARY_DECLINE))

    rec = (
        db.query(LibraryRecord)
        .filter_by(student_id=student_id, week_number=week_number)
        .first()
    )
    if not rec or baseline_val is None or baseline_val <= 1.0:
        return None

    current_val = float(rec.library_visits)
    drop = baseline_val - current_val
    if drop >= 2.0 and current_val <= 1:
        strength = "moderate" if drop >= 3.0 else "weak"
        return WarningSignal(
            student_id=student_id,
            signal_type=SignalType.LIBRARY,
            week_number=week_number,
            period_start=rec.period_start,
            baseline_value=round(baseline_val, 2),
            current_value=round(current_val, 2),
            deviation=round(current_val - baseline_val, 2),
            deviation_pct=round((drop / baseline_val) * 100.0, 2),
            is_sustained=False,
            sustained_periods=1,
            strength=strength,
            weight_applied=weight if strength == "moderate" else 1,
            detected_at=datetime.now(timezone.utc),
        )
    return None


def detect_behaviour_deviation(
    db: Session, student_id: int, week_number: int
) -> Optional[WarningSignal]:
    """Detects authorized, factual staff observations only."""
    settings = get_settings()
    weight = int(_get_config(db, "WEIGHT_BEHAVIOUR_CHANGE", settings.WEIGHT_BEHAVIOUR_CHANGE))

    rec = (
        db.query(BehaviourRecord)
        .filter_by(student_id=student_id, week_number=week_number)
        .first()
    )
    if not rec or not rec.observation_flag:
        return None

    return WarningSignal(
        student_id=student_id,
        signal_type=SignalType.BEHAVIOUR,
        week_number=week_number,
        period_start=rec.period_start,
        baseline_value=0.0,
        current_value=1.0,
        deviation=1.0,
        deviation_pct=100.0,
        is_sustained=False,
        sustained_periods=1,
        strength="moderate",
        weight_applied=weight,
        detected_at=datetime.now(timezone.utc),
    )


def detect_all_deviations_for_student(
    db: Session,
    student_id: int,
    week_number: int,
    baseline_week_cutoff: Optional[int] = None,
    persist: bool = True,
) -> List[WarningSignal]:
    """
    Runs all 8 signal detectors for a student at week_number.
    Uses baselines computed strictly up to baseline_week_cutoff (e.g. week 4)
    to prevent data leakage.
    """
    signals: List[WarningSignal] = []

    # Get baseline point estimates
    def get_base(stype: SignalType) -> Optional[float]:
        res = compute_baseline_for_signal(db, student_id, stype, up_to_week=baseline_week_cutoff)
        return get_baseline_point_estimate(res)

    att_base = get_base(SignalType.ATTENDANCE)
    marks_base = get_base(SignalType.MARKS)
    assign_base = get_base(SignalType.ASSIGNMENT)
    eng_base = get_base(SignalType.ENGAGEMENT)
    backlog_base = get_base(SignalType.BACKLOG)
    lib_base = get_base(SignalType.LIBRARY)

    sig = detect_attendance_deviation(db, student_id, week_number, att_base)
    if sig: signals.append(sig)

    sig = detect_marks_deviation(db, student_id, week_number, marks_base)
    if sig: signals.append(sig)

    sig = detect_assignment_deviation(db, student_id, week_number, assign_base)
    if sig: signals.append(sig)

    sig = detect_engagement_deviation(db, student_id, week_number, eng_base)
    if sig: signals.append(sig)

    sig = detect_financial_deviation(db, student_id, week_number)
    if sig: signals.append(sig)

    sig = detect_backlog_deviation(db, student_id, week_number, backlog_base)
    if sig: signals.append(sig)

    sig = detect_library_deviation(db, student_id, week_number, lib_base)
    if sig: signals.append(sig)

    sig = detect_behaviour_deviation(db, student_id, week_number)
    if sig: signals.append(sig)

    if persist and signals:
        # Delete existing detected signals for this student and week to avoid duplicates
        db.query(WarningSignal).filter_by(student_id=student_id, week_number=week_number).delete()
        for s in signals:
            db.add(s)
        db.flush()

    return signals
