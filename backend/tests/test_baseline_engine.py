"""
Unit tests for the Baseline Engine (spec §4, §30).

Covers:
    - Baseline is per-student (never a class/peer average)
    - Minimum historical data requirement / confidence flag
    - Mean / median / rolling-mean calculations are numerically correct
    - up_to_week correctly excludes "future" data (no leakage)
"""
from datetime import datetime, timedelta

import pytest

from app.models.core import Department, Course, Student
from app.models.signals import AttendanceRecord, SignalType
from app.engines.baseline_engine import (
    compute_baseline_for_signal, get_baseline_point_estimate,
    recalculate_and_store_baseline,
)


def _make_student(db, code="S001"):
    dept = Department(name=f"Test Dept {code}", code=f"TD-{code}")
    db.add(dept)
    db.flush()
    course = Course(name="Test Course", code=f"TC-{code}", department_id=dept.id)
    db.add(course)
    db.flush()
    student = Student(student_code=code, year=2, section="A", department_id=dept.id, course_id=course.id)
    db.add(student)
    db.flush()
    return student


def _add_attendance(db, student, values, start=datetime(2026, 1, 1)):
    for i, v in enumerate(values, start=1):
        db.add(AttendanceRecord(
            student_id=student.id, week_number=i,
            period_start=start + timedelta(weeks=i - 1), attendance_pct=v,
        ))
    db.commit()


def test_baseline_uses_only_this_students_history(db_session):
    """Two students with very different attendance must get independently
    correct baselines - never blended into a class average."""
    s1 = _make_student(db_session, "S001")
    s2 = _make_student(db_session, "S002")
    _add_attendance(db_session, s1, [95, 94, 96, 93])   # high performer
    _add_attendance(db_session, s2, [60, 62, 58, 61])   # chronically low attendance, but STABLE for them

    r1 = compute_baseline_for_signal(db_session, s1.id, SignalType.ATTENDANCE)
    r2 = compute_baseline_for_signal(db_session, s2.id, SignalType.ATTENDANCE)

    assert r1.mean_value == pytest.approx(94.5, abs=0.1)
    assert r2.mean_value == pytest.approx(60.25, abs=0.1)
    # crucially, s2's baseline is NOT dragged toward s1's - each is independent
    assert r1.mean_value != r2.mean_value


def test_confidence_requires_minimum_data_points(db_session):
    s = _make_student(db_session)
    _add_attendance(db_session, s, [90, 88])  # only 2 weeks < default min (4)

    result = compute_baseline_for_signal(db_session, s.id, SignalType.ATTENDANCE)
    assert result.data_points_used == 2
    assert result.is_confident is False
    assert result.confidence < 0.5


def test_confidence_true_once_minimum_reached(db_session):
    s = _make_student(db_session)
    _add_attendance(db_session, s, [90, 88, 91, 89])  # exactly the default min (4)

    result = compute_baseline_for_signal(db_session, s.id, SignalType.ATTENDANCE)
    assert result.data_points_used == 4
    assert result.is_confident is True


def test_no_data_returns_safe_empty_result(db_session):
    s = _make_student(db_session)
    result = compute_baseline_for_signal(db_session, s.id, SignalType.ATTENDANCE)
    assert result.data_points_used == 0
    assert result.mean_value is None
    assert result.is_confident is False


def test_rolling_mean_reflects_recent_window_not_full_history(db_session):
    s = _make_student(db_session)
    # Stable at 90 for weeks 1-4, then a genuine sustained shift to 70 for weeks 5-8
    _add_attendance(db_session, s, [90, 90, 90, 90, 70, 70, 70, 70])

    result = compute_baseline_for_signal(db_session, s.id, SignalType.ATTENDANCE)  # default window=4
    assert result.mean_value == pytest.approx(80.0)          # full-history mean blends both regimes
    assert result.rolling_mean_value == pytest.approx(70.0)  # rolling mean reflects the recent regime
    assert get_baseline_point_estimate(result) == pytest.approx(70.0)  # default method is rolling_mean


def test_up_to_week_excludes_future_data_no_leakage(db_session):
    s = _make_student(db_session)
    _add_attendance(db_session, s, [92, 91, 93, 90, 60, 55])  # decline starts week 5

    # A baseline computed "as of week 4" must not see the week 5-6 decline
    result_week4 = compute_baseline_for_signal(db_session, s.id, SignalType.ATTENDANCE, up_to_week=4)
    assert result_week4.data_points_used == 4
    assert result_week4.mean_value == pytest.approx(91.5, abs=0.1)

    result_all = compute_baseline_for_signal(db_session, s.id, SignalType.ATTENDANCE, up_to_week=None)
    assert result_all.data_points_used == 6
    assert result_all.mean_value < result_week4.mean_value


def test_recalculate_and_store_persists_baseline_row(db_session):
    s = _make_student(db_session)
    _add_attendance(db_session, s, [90, 88, 91, 89])

    row = recalculate_and_store_baseline(db_session, s.id, SignalType.ATTENDANCE)
    db_session.commit()

    assert row.id is not None
    assert row.student_id == s.id
    assert row.signal_type == SignalType.ATTENDANCE
    assert row.data_points_used == 4
    assert row.is_confident is True

    # Upsert behaviour: calling again should update the SAME row, not duplicate it
    _add_attendance(db_session, s, [70], start=datetime(2026, 2, 1))
    row2 = recalculate_and_store_baseline(db_session, s.id, SignalType.ATTENDANCE)
    db_session.commit()
    assert row2.id == row.id
    assert row2.data_points_used == 5
