"""
Mandatory Test Scenarios (spec §29 / Step 27).

Validates all 10 mandatory scenarios:
- Scenario 1: Attendance drops for only one week -> No major warning
- Scenario 2: Attendance decreases for 3 consecutive weeks -> Attendance deviation signal
- Scenario 3: Attendance ↓ + Marks ↓ + Assignments ↓ -> Academic difficulty warning
- Scenario 4: Attendance ↓ + Engagement ↓ -> Disengagement warning
- Scenario 5: Fee issue + attendance decline -> Financial difficulty warning
- Scenario 6: Only one weak signal -> No high-severity warning
- Scenario 7: Multiple strong sustained signals -> High-severity human-review alert
- Scenario 8: Alert ignored beyond response window -> Escalation
- Scenario 9: Human marks alert as false positive -> Outcome stored & calibration stats updated
- Scenario 10: Semester ends -> Calibration report generated
"""
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.orm import Session

from app.models.core import Student, Department, Course
from app.models.signals import (
    SignalType,
    AttendanceRecord,
    AssessmentRecord,
    AssignmentRecord,
    EngagementRecord,
    FinancialRecord,
)
from app.models.alerts import (
    Alert,
    AlertStatus,
    WarningCategory,
    Severity,
    Urgency,
    ResponderRole,
    OutcomeChoice,
)
from app.engines.baseline_engine import recalculate_all_baselines_for_student
from app.engines.deviation_engine import detect_all_deviations_for_student, detect_attendance_deviation
from app.engines.correlation_engine import correlate_signals
from app.engines.classification_engine import classify_signals
from app.engines.severity_engine import evaluate_severity_and_urgency
from app.engines.escalation_engine import check_and_escalate_overdue_alerts, escalate_alert
from app.engines.calibration_engine import run_semester_calibration
from app.services.alert_workflow_service import mark_alert_false_positive
from app.agents.agent69 import Agent69


def _create_test_student(db: Session, student_code: str = "T101") -> Student:
    dept = db.query(Department).first()
    course = db.query(Course).first()
    s = Student(
        student_code=student_code,
        year=2,
        section="A",
        department_id=dept.id,
        course_id=course.id,
        is_active=True,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _seed_weeks_1_to_4_stable(db: Session, student_id: int, att: float = 90.0, marks: float = 80.0, sub: float = 90.0, eng: float = 80.0):
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for w in range(1, 5):
        pstart = start + timedelta(weeks=w-1)
        db.add(AttendanceRecord(student_id=student_id, week_number=w, period_start=pstart, attendance_pct=att))
        db.add(AssessmentRecord(student_id=student_id, week_number=w, period_start=pstart, marks_pct=marks, assessment_name=f"Quiz {w}"))
        db.add(AssignmentRecord(student_id=student_id, week_number=w, period_start=pstart, assignments_due=2, assignments_submitted=2, submission_rate_pct=sub))
        db.add(EngagementRecord(student_id=student_id, week_number=w, period_start=pstart, lms_logins=10, portal_logins=5, engagement_score=eng))
        db.add(FinancialRecord(student_id=student_id, week_number=w, period_start=pstart, amount_due=20000, amount_overdue=0, days_overdue=0, payment_delayed=False))
    db.commit()


def test_scenario_1_single_week_attendance_drop_no_major_warning(db_session):
    """
    Scenario 1: Attendance drops for only one week.
    Expected: No major warning.
    """
    s = _create_test_student(db_session, "S_SCENARIO_1")
    _seed_weeks_1_to_4_stable(db_session, s.id, att=90.0)

    # Week 5: single week dip
    pstart = datetime(2026, 2, 1, tzinfo=timezone.utc)
    db_session.add(AttendanceRecord(student_id=s.id, week_number=5, period_start=pstart, attendance_pct=72.0))
    # Other signals remain normal
    db_session.add(AssessmentRecord(student_id=s.id, week_number=5, period_start=pstart, marks_pct=80.0))
    db_session.add(AssignmentRecord(student_id=s.id, week_number=5, period_start=pstart, assignments_due=2, assignments_submitted=2, submission_rate_pct=90.0))
    db_session.add(EngagementRecord(student_id=s.id, week_number=5, period_start=pstart, lms_logins=10, portal_logins=5, engagement_score=80.0))
    db_session.commit()

    agent = Agent69(db_session)
    alert = agent.evaluate_student(s.id, week_number=5, baseline_cutoff_week=4)

    # If an alert is generated at all, it MUST NOT be HIGH severity
    if alert is not None:
        assert alert.severity != Severity.HIGH, "Single week drop must not trigger HIGH severity warning"
        assert alert.severity in (Severity.LOW, Severity.MEDIUM)


def test_scenario_2_attendance_decreases_3_consecutive_weeks(db_session):
    """
    Scenario 2: Attendance decreases for 3 consecutive weeks.
    Expected: Attendance deviation signal (sustained=True).
    """
    s = _create_test_student(db_session, "S_SCENARIO_2")
    _seed_weeks_1_to_4_stable(db_session, s.id, att=92.0)

    start = datetime(2026, 2, 1, tzinfo=timezone.utc)
    # Weeks 5, 6, 7: declining attendance (78, 70, 62)
    db_session.add(AttendanceRecord(student_id=s.id, week_number=5, period_start=start, attendance_pct=78.0))
    db_session.add(AttendanceRecord(student_id=s.id, week_number=6, period_start=start + timedelta(weeks=1), attendance_pct=70.0))
    db_session.add(AttendanceRecord(student_id=s.id, week_number=7, period_start=start + timedelta(weeks=2), attendance_pct=62.0))
    db_session.commit()

    sig = detect_attendance_deviation(db_session, s.id, week_number=7, baseline_val=92.0)
    assert sig is not None, "Should detect attendance deviation"
    assert sig.is_sustained is True, "3 consecutive weeks must be marked sustained"
    assert sig.sustained_periods >= 3
    assert sig.strength in ("moderate", "strong")


def test_scenario_3_attendance_marks_assignments_drop(db_session):
    """
    Scenario 3: Attendance ↓, Marks ↓, Assignments ↓.
    Expected: Academic difficulty warning.
    """
    s = _create_test_student(db_session, "S_SCENARIO_3")
    _seed_weeks_1_to_4_stable(db_session, s.id, att=90.0, marks=80.0, sub=95.0)

    pstart = datetime(2026, 2, 1, tzinfo=timezone.utc)
    db_session.add(AttendanceRecord(student_id=s.id, week_number=5, period_start=pstart, attendance_pct=68.0))
    db_session.add(AssessmentRecord(student_id=s.id, week_number=5, period_start=pstart, marks_pct=58.0))
    db_session.add(AssignmentRecord(student_id=s.id, week_number=5, period_start=pstart, assignments_due=3, assignments_submitted=1, submission_rate_pct=33.3))
    db_session.commit()

    agent = Agent69(db_session)
    alert = agent.evaluate_student(s.id, week_number=5, baseline_cutoff_week=4)

    assert alert is not None
    assert alert.category == WarningCategory.ACADEMIC_DIFFICULTY


def test_scenario_4_attendance_and_engagement_drop(db_session):
    """
    Scenario 4: Attendance ↓, Engagement ↓.
    Expected: Disengagement warning.
    """
    s = _create_test_student(db_session, "S_SCENARIO_4")
    _seed_weeks_1_to_4_stable(db_session, s.id, att=92.0, marks=85.0, eng=85.0)

    pstart = datetime(2026, 2, 1, tzinfo=timezone.utc)
    db_session.add(AttendanceRecord(student_id=s.id, week_number=5, period_start=pstart, attendance_pct=65.0))
    db_session.add(AssessmentRecord(student_id=s.id, week_number=5, period_start=pstart, marks_pct=83.0))  # marks intact!
    db_session.add(EngagementRecord(student_id=s.id, week_number=5, period_start=pstart, lms_logins=1, portal_logins=0, engagement_score=20.0))  # sharp drop
    db_session.commit()

    agent = Agent69(db_session)
    alert = agent.evaluate_student(s.id, week_number=5, baseline_cutoff_week=4)

    assert alert is not None
    assert alert.category == WarningCategory.DISENGAGEMENT


def test_scenario_5_fee_issue_and_attendance_decline(db_session):
    """
    Scenario 5: Fee issue + attendance decline.
    Expected: Financial difficulty warning.
    """
    s = _create_test_student(db_session, "S_SCENARIO_5")
    _seed_weeks_1_to_4_stable(db_session, s.id, att=90.0)

    pstart = datetime(2026, 2, 1, tzinfo=timezone.utc)
    db_session.add(AttendanceRecord(student_id=s.id, week_number=5, period_start=pstart, attendance_pct=72.0))
    db_session.add(FinancialRecord(student_id=s.id, week_number=5, period_start=pstart, amount_due=25000, amount_overdue=25000, days_overdue=21, payment_delayed=True))
    db_session.commit()

    agent = Agent69(db_session)
    alert = agent.evaluate_student(s.id, week_number=5, baseline_cutoff_week=4)

    assert alert is not None
    assert alert.category == WarningCategory.FINANCIAL_DIFFICULTY


def test_scenario_6_only_one_weak_signal_no_high_severity(db_session):
    """
    Scenario 6: Only one weak signal.
    Expected: No high-severity warning.
    """
    s = _create_test_student(db_session, "S_SCENARIO_6")
    _seed_weeks_1_to_4_stable(db_session, s.id, att=90.0)

    # Attendance drops by only 6% (90 -> 84), which is barely above weak threshold (5%)
    pstart = datetime(2026, 2, 1, tzinfo=timezone.utc)
    db_session.add(AttendanceRecord(student_id=s.id, week_number=5, period_start=pstart, attendance_pct=84.0))
    db_session.commit()

    agent = Agent69(db_session)
    alert = agent.evaluate_student(s.id, week_number=5, baseline_cutoff_week=4)

    if alert is not None:
        assert alert.severity != Severity.HIGH


def test_scenario_7_multiple_strong_sustained_signals(db_session):
    """
    Scenario 7: Multiple strong sustained signals.
    Expected: High-severity human-review alert.
    """
    s = _create_test_student(db_session, "S_SCENARIO_7")
    _seed_weeks_1_to_4_stable(db_session, s.id, att=92.0, marks=85.0, sub=95.0, eng=85.0)

    start = datetime(2026, 2, 1, tzinfo=timezone.utc)
    # Weeks 5, 6, 7: severe sustained drops across all indicators
    for i, w in enumerate([5, 6, 7]):
        pstart = start + timedelta(weeks=i)
        db_session.add(AttendanceRecord(student_id=s.id, week_number=w, period_start=pstart, attendance_pct=50.0))
        db_session.add(AssessmentRecord(student_id=s.id, week_number=w, period_start=pstart, marks_pct=45.0))
        db_session.add(AssignmentRecord(student_id=s.id, week_number=w, period_start=pstart, assignments_due=3, assignments_submitted=0, submission_rate_pct=0.0))
        db_session.add(EngagementRecord(student_id=s.id, week_number=w, period_start=pstart, lms_logins=0, portal_logins=0, engagement_score=10.0))
    db_session.commit()

    agent = Agent69(db_session)
    alert = agent.evaluate_student(s.id, week_number=7, baseline_cutoff_week=4)

    assert alert is not None
    assert alert.severity == Severity.HIGH
    assert "human review" in alert.narrative_summary.lower()


def test_scenario_8_alert_ignored_beyond_deadline_escalates(db_session):
    """
    Scenario 8: Alert ignored beyond response window.
    Expected: Escalation.
    """
    s = _create_test_student(db_session, "S_SCENARIO_8")
    _seed_weeks_1_to_4_stable(db_session, s.id)

    agent = Agent69(db_session)
    # Force creation of an alert with a past deadline
    past_time = datetime(2026, 1, 15, tzinfo=timezone.utc)
    alert = Alert(
        student_id=s.id,
        category=WarningCategory.ACADEMIC_DIFFICULTY,
        severity=Severity.HIGH,
        urgency=Urgency.IMMEDIATE,
        warning_score=6,
        confidence=0.9,
        suggested_responder_role=ResponderRole.MENTOR,
        status=AlertStatus.NEW,
        narrative_summary="Test alert",
        response_deadline=past_time - timedelta(hours=10),
        created_at=past_time - timedelta(days=2),
    )
    db_session.add(alert)
    db_session.commit()

    # Check and escalate
    now = datetime(2026, 1, 16, tzinfo=timezone.utc)
    escalations = check_and_escalate_overdue_alerts(db_session, current_time=now)

    assert len(escalations) >= 1
    db_session.refresh(alert)
    assert alert.status == AlertStatus.ESCALATED


def test_scenario_9_human_marks_false_positive(db_session):
    """
    Scenario 9: Human marks alert as false positive.
    Expected: Outcome stored and calibration statistics updated.
    """
    s = _create_test_student(db_session, "S_SCENARIO_9")
    _seed_weeks_1_to_4_stable(db_session, s.id)

    alert = Alert(
        student_id=s.id,
        category=WarningCategory.DISENGAGEMENT,
        severity=Severity.LOW,
        urgency=Urgency.ROUTINE,
        warning_score=2,
        suggested_responder_role=ResponderRole.MENTOR,
        status=AlertStatus.NEW,
        narrative_summary="Disengagement observed",
    )
    db_session.add(alert)
    db_session.commit()

    outcome = mark_alert_false_positive(db_session, alert.id, user_id=1, reason="Student was representing university at conference")
    assert outcome.is_false_positive is True
    assert outcome.outcome == OutcomeChoice.FALSE_POSITIVE

    db_session.refresh(alert)
    assert alert.status == AlertStatus.FALSE_POSITIVE

    # Run calibration
    cal_run = run_semester_calibration(db_session, user_id=1)
    assert cal_run.false_positives >= 1
    assert cal_run.false_positive_rate is not None
    assert cal_run.false_positive_rate > 0.0


def test_scenario_10_semester_ends_calibration_generated(db_session):
    """
    Scenario 10: Semester ends.
    Expected: Calibration report generated.
    """
    cal_run = run_semester_calibration(db_session, user_id=1)
    assert cal_run is not None
    assert cal_run.status in ("COMPLETED", "RECOMMENDATIONS_PENDING")
    assert cal_run.breakdown_by_category is not None
    assert cal_run.breakdown_by_severity is not None
    assert isinstance(cal_run.recommendations, list)
