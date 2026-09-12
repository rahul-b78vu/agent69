"""
Student API endpoints (spec §20).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.core import User, Student, Department, Course
from app.models.signals import (
    StudentBaseline,
    AttendanceRecord,
    AssessmentRecord,
    AssignmentRecord,
    EngagementRecord,
    FinancialRecord,
    BacklogRecord,
    LibraryRecord,
)
from app.models.alerts import Alert, AlertStatus, Severity
from app.schemas import StudentOut, StudentDetailOut, BaselineItemOut, SignalComparisonItem, AlertOut
from app.engines.deviation_engine import detect_all_deviations_for_student
from app.engines.baseline_engine import compute_baseline_for_signal, get_baseline_point_estimate, SignalType

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=List[StudentOut])
def list_students(
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Student).filter(Student.is_active == True)

    if department_id:
        q = q.filter(Student.department_id == department_id)
    if search:
        q = q.filter(Student.student_code.ilike(f"%{search}%"))

    students = q.limit(limit).all()
    results = []

    for s in students:
        # Check active alerts
        active_alerts = (
            db.query(Alert)
            .filter(
                Alert.student_id == s.id,
                Alert.status.in_([AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.IN_REVIEW, AlertStatus.ESCALATED]),
            )
            .all()
        )
        max_sev = None
        if any(a.severity == Severity.HIGH for a in active_alerts):
            max_sev = "HIGH"
        elif any(a.severity == Severity.MEDIUM for a in active_alerts):
            max_sev = "MEDIUM"
        elif active_alerts:
            max_sev = "LOW"

        results.append(StudentOut(
            id=s.id,
            student_code=s.student_code,
            year=s.year,
            section=s.section,
            department_id=s.department_id,
            course_id=s.course_id,
            is_active=s.is_active,
            department_name=s.department.name if s.department else None,
            department_code=s.department.code if s.department else None,
            course_name=s.course.name if s.course else None,
            course_code=s.course.code if s.course else None,
            active_alert_count=len(active_alerts),
            max_severity=max_sev,
        ))

    return results


@router.get("/{student_id}", response_model=StudentDetailOut)
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = db.query(Student).filter_by(id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1. Baselines
    baselines = db.query(StudentBaseline).filter_by(student_id=student.id).all()

    # 2. Latest week signals comparison
    detected = detect_all_deviations_for_student(db, student.id, week_number=12, baseline_week_cutoff=4, persist=False)
    signal_map = {d.signal_type.value: d for d in detected}

    # Extract all signal types for comparison display
    comparisons: List[SignalComparisonItem] = []
    for stype in SignalType:
        sig = signal_map.get(stype.value)
        base_res = compute_baseline_for_signal(db, student.id, stype, up_to_week=4)
        base_val = get_baseline_point_estimate(base_res)

        if sig:
            comparisons.append(SignalComparisonItem(
                signal_type=stype.value,
                baseline_value=sig.baseline_value,
                current_value=sig.current_value,
                deviation=sig.deviation,
                deviation_pct=sig.deviation_pct,
                strength=sig.strength,
                is_sustained=sig.is_sustained,
                sustained_periods=sig.sustained_periods,
                weight_applied=sig.weight_applied,
            ))
        else:
            # Normal signal
            comparisons.append(SignalComparisonItem(
                signal_type=stype.value,
                baseline_value=base_val,
                current_value=base_val,
                deviation=0.0,
                deviation_pct=0.0,
                strength="none",
                is_sustained=False,
                sustained_periods=0,
                weight_applied=0,
            ))

    # 3. Recent Alerts
    alerts = (
        db.query(Alert)
        .filter_by(student_id=student.id)
        .order_by(Alert.created_at.desc())
        .limit(10)
        .all()
    )

    active_count = sum(1 for a in alerts if a.status in (AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.IN_REVIEW))
    max_sev = "HIGH" if any(a.severity == Severity.HIGH for a in alerts) else (
        "MEDIUM" if any(a.severity == Severity.MEDIUM for a in alerts) else ("LOW" if alerts else None)
    )

    return StudentDetailOut(
        id=student.id,
        student_code=student.student_code,
        year=student.year,
        section=student.section,
        department_id=student.department_id,
        course_id=student.course_id,
        is_active=student.is_active,
        department_name=student.department.name if student.department else None,
        department_code=student.department.code if student.department else None,
        course_name=student.course.name if student.course else None,
        course_code=student.course.code if student.course else None,
        active_alert_count=active_count,
        max_severity=max_sev,
        baselines=[BaselineItemOut.model_validate(b) for b in baselines],
        current_signals=comparisons,
        recent_alerts=[AlertOut.model_validate(a) for a in alerts],
    )


@router.get("/{student_id}/baseline", response_model=List[BaselineItemOut])
def get_student_baselines(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    baselines = db.query(StudentBaseline).filter_by(student_id=student_id).all()
    return baselines


@router.get("/{student_id}/signals")
def get_student_signal_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns weekly timeline of all raw signals for trend charting.
    """
    att = db.query(AttendanceRecord).filter_by(student_id=student_id).order_by(AttendanceRecord.week_number).all()
    marks = db.query(AssessmentRecord).filter_by(student_id=student_id).order_by(AssessmentRecord.week_number).all()
    assign = db.query(AssignmentRecord).filter_by(student_id=student_id).order_by(AssignmentRecord.week_number).all()
    eng = db.query(EngagementRecord).filter_by(student_id=student_id).order_by(EngagementRecord.week_number).all()
    fin = db.query(FinancialRecord).filter_by(student_id=student_id).order_by(FinancialRecord.week_number).all()
    backlogs = db.query(BacklogRecord).filter_by(student_id=student_id).order_by(BacklogRecord.week_number).all()
    lib = db.query(LibraryRecord).filter_by(student_id=student_id).order_by(LibraryRecord.week_number).all()

    timeline = []
    max_weeks = max([len(att), len(marks), len(assign), len(eng), 12])

    for w in range(1, max_weeks + 1):
        item = {"week": w}
        if w - 1 < len(att): item["attendance_pct"] = att[w - 1].attendance_pct
        if w - 1 < len(marks): item["marks_pct"] = marks[w - 1].marks_pct
        if w - 1 < len(assign): item["submission_rate_pct"] = assign[w - 1].submission_rate_pct
        if w - 1 < len(eng): item["engagement_score"] = eng[w - 1].engagement_score
        if w - 1 < len(fin): item["amount_overdue"] = fin[w - 1].amount_overdue
        if w - 1 < len(backlogs): item["backlog_count"] = backlogs[w - 1].backlog_count
        if w - 1 < len(lib): item["library_visits"] = lib[w - 1].library_visits
        timeline.append(item)

    return timeline
