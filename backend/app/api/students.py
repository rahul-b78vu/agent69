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
from app.schemas import (
    StudentOut,
    StudentCreateRequest,
    StudentDetailOut,
    BaselineItemOut,
    SignalComparisonItem,
    AlertOut,
)
from app.engines.deviation_engine import detect_all_deviations_for_student
from app.engines.baseline_engine import compute_baseline_for_signal, get_baseline_point_estimate, SignalType

router = APIRouter(prefix="/students", tags=["students"])


def sync_to_mongo(collection_name: str, doc: dict):
    """Directly insert a document into local MongoDB Compass (agent69_db)."""
    try:
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=800)
        db = client["agent69_db"]
        clean_doc = {}
        for k, v in doc.items():
            if hasattr(v, "isoformat"):
                clean_doc[k] = v.isoformat()
            elif hasattr(v, "value"):
                clean_doc[k] = v.value
            else:
                clean_doc[k] = v
        db[collection_name].insert_one(clean_doc)
        print(f"[Mongo Compass Sync] Successfully stored document in '{collection_name}' collection.")
    except Exception as e:
        print(f"[Mongo Compass Sync Notice] Could not write to MongoDB Compass: {e}")


@router.post("", response_model=StudentOut)
def create_student(
    req: StudentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new student, store in SQLite, and immediately sync into MongoDB Compass."""
    code_clean = req.student_code.strip().upper()
    if not code_clean:
        raise HTTPException(status_code=400, detail="Student code cannot be empty")

    existing = db.query(Student).filter_by(student_code=code_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with code '{code_clean}' already exists")

    # Resolve department
    dept = None
    if req.department_id:
        dept = db.query(Department).filter_by(id=req.department_id).first()
    elif req.department_code:
        dept = db.query(Department).filter_by(code=req.department_code.strip().upper()).first()
    if not dept:
        dept = db.query(Department).first()

    # Resolve course
    course = None
    if req.course_id:
        course = db.query(Course).filter_by(id=req.course_id).first()
    elif req.course_code:
        course = db.query(Course).filter_by(code=req.course_code.strip().upper()).first()
    if not course:
        course = db.query(Course).filter_by(department_id=dept.id).first()
    if not course:
        course = db.query(Course).first()

    # 1. Create Student record in SQLite
    new_student = Student(
        student_code=code_clean,
        year=req.year,
        section=req.section or "A",
        department_id=dept.id,
        course_id=course.id,
        is_active=True,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # 2. Add telemetry signals for 4 baseline weeks + current week
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    att_val = float(req.attendance_pct if req.attendance_pct is not None else 85.0)
    for w in range(1, 6):
        db.add(AttendanceRecord(
            student_id=new_student.id,
            week_number=w,
            period_start=now,
            attendance_pct=att_val,
        ))

    marks_val = float(req.marks_pct if req.marks_pct is not None else 75.0)
    for w in range(1, 3):
        db.add(AssessmentRecord(
            student_id=new_student.id,
            week_number=w,
            period_start=now,
            assessment_name=f"Mid-Term {w}",
            marks_pct=marks_val,
        ))

    sub_due = int(req.assignments_total or 5)
    sub_done = int(req.assignments_submitted or 5)
    sub_pct = (sub_done / sub_due * 100.0) if sub_due > 0 else 100.0
    db.add(AssignmentRecord(
        student_id=new_student.id,
        week_number=5,
        period_start=now,
        assignments_due=sub_due,
        assignments_submitted=sub_done,
        submission_rate_pct=sub_pct,
    ))

    db.add(EngagementRecord(
        student_id=new_student.id,
        week_number=5,
        period_start=now,
        lms_logins=int(req.portal_logins or 12),
        portal_logins=int(req.portal_logins or 12),
        engagement_score=min(100.0, float(req.portal_logins or 12) * 6.0),
    ))

    is_overdue = bool(req.fee_overdue)
    db.add(FinancialRecord(
        student_id=new_student.id,
        week_number=5,
        period_start=now,
        amount_due=25000.0 if is_overdue else 0.0,
        amount_overdue=25000.0 if is_overdue else 0.0,
        payment_delayed=is_overdue,
    ))

    db.add(BacklogRecord(
        student_id=new_student.id,
        week_number=5,
        period_start=now,
        backlog_count=int(req.backlog_count or 0),
    ))

    # Baselines
    baselines = [
        (SignalType.ATTENDANCE, "rolling_mean", att_val, 3.5, att_val),
        (SignalType.MARKS, "rolling_mean", marks_val, 4.2, marks_val),
        (SignalType.ASSIGNMENT, "mean", sub_pct, 5.0, sub_pct),
        (SignalType.ENGAGEMENT, "mean", float(req.portal_logins or 12), 2.0, float(req.portal_logins or 12)),
    ]
    for sig_t, meth, mv, sd, med in baselines:
        db.add(StudentBaseline(
            student_id=new_student.id,
            signal_type=sig_t,
            method=meth,
            mean_value=mv,
            std_dev=sd,
            median_value=med,
            data_points_used=4,
            confidence=0.95,
            is_confident=True,
            last_calculated_at=now,
        ))

    db.commit()

    # 3. DIRECT SYNC INTO MONGODB COMPASS (agent69_db)
    student_mongo_doc = {
        "id": new_student.id,
        "student_code": new_student.student_code,
        "year": new_student.year,
        "section": new_student.section,
        "department_id": new_student.department_id,
        "department_name": dept.name,
        "department_code": dept.code,
        "course_id": new_student.course_id,
        "course_name": course.name,
        "course_code": course.code,
        "is_active": new_student.is_active,
        "created_at": now.isoformat(),
        "telemetry": {
            "attendance_pct": att_val,
            "marks_pct": marks_val,
            "assignments_submitted": int(req.assignments_submitted or 5),
            "portal_logins": int(req.portal_logins or 12),
            "fee_overdue": req.fee_overdue,
            "backlog_count": int(req.backlog_count or 0),
            "staff_observation": req.staff_observation,
        }
    }
    sync_to_mongo("students", student_mongo_doc)
    sync_to_mongo("attendance_records", {
        "student_id": new_student.id,
        "student_code": new_student.student_code,
        "week_number": 5,
        "percentage": att_val,
        "recorded_at": now.isoformat(),
    })

    return StudentOut(
        id=new_student.id,
        student_code=new_student.student_code,
        year=new_student.year,
        section=new_student.section,
        department_id=new_student.department_id,
        course_id=new_student.course_id,
        is_active=new_student.is_active,
        department_name=dept.name,
        department_code=dept.code,
        course_name=course.name,
        course_code=course.code,
        active_alert_count=0,
        max_severity=None,
    )


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


@router.get("/mongo-status")
def get_mongo_status(current_user: User = Depends(get_current_user)):
    """Check connection to local MongoDB Compass and count documents."""
    try:
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=1500)
        info = client.server_info()
        db = client["agent69_db"]
        collections = db.list_collection_names()
        student_count = db["students"].count_documents({})
        latest = db["students"].find_one(sort=[("_id", -1)])
        latest_code = latest.get("student_code") if latest else None
        return {
            "connected": True,
            "uri": "mongodb://localhost:27017",
            "database": "agent69_db",
            "server_version": info.get("version", "unknown"),
            "collections_count": len(collections),
            "students_count": student_count,
            "latest_student_code": latest_code,
            "message": "MongoDB Compass is running locally and connected to agent69_db.",
        }
    except Exception as e:
        return {
            "connected": False,
            "uri": "mongodb://localhost:27017",
            "database": "agent69_db",
            "error": str(e),
            "message": "Unable to connect to local MongoDB on port 27017.",
        }


@router.post("/sync-all-to-mongo")
def sync_all_to_mongo_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync all SQLite tables to MongoDB Compass agent69_db collections."""
    import subprocess
    import sys
    from pathlib import Path

    script_path = Path(__file__).resolve().parents[2] / "export_to_mongo.py"
    if not script_path.exists():
        raise HTTPException(status_code=404, detail="export_to_mongo.py script not found")

    res = subprocess.run([sys.executable, str(script_path)], capture_output=True, text=True)
    if res.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Sync failed: {res.stderr}")

    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=1500)
    mongo_db = client["agent69_db"]
    return {
        "success": True,
        "collections_synced": len(mongo_db.list_collection_names()),
        "students_in_mongo": mongo_db["students"].count_documents({}),
        "message": "All database records successfully synced to MongoDB Compass!",
    }


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
