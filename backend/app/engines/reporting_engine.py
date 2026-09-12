"""
Institutional Reporting Engine (Step 18 / spec §15).

Aggregates high-level early-warning patterns for academic leadership (Deans, HoDs, Principals).
Computes:
- Alerts by Department & Course
- Course alert concentration (e.g. "Course X generated 28% of academic warnings")
- Systemic / recurring attendance or assignment difficulties
- Trend distribution over time

Privacy preservation:
Strictly outputs aggregate statistics without exposing individual student identifiers.
"""
from typing import Any, Dict, List
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.core import Department, Course, Student
from app.models.alerts import Alert, AlertStatus, WarningCategory, Severity


def generate_institutional_report(db: Session) -> Dict[str, Any]:
    """
    Produces executive aggregate analytics for institutional decision makers.
    """
    total_students = db.query(Student).filter(Student.is_active == True).count()
    total_alerts = db.query(Alert).count()

    # 1. Alerts by Department
    dept_stats = []
    departments = db.query(Department).all()
    for d in departments:
        # join student -> alert
        dept_alerts = (
            db.query(Alert)
            .join(Student, Alert.student_id == Student.id)
            .filter(Student.department_id == d.id)
            .all()
        )
        total_dept = len(dept_alerts)
        high_dept = sum(1 for a in dept_alerts if a.severity == Severity.HIGH)
        resolved_dept = sum(1 for a in dept_alerts if a.status in (AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE))
        dept_students = db.query(Student).filter_by(department_id=d.id, is_active=True).count()

        dept_stats.append({
            "department_id": d.id,
            "name": d.name,
            "code": d.code,
            "student_count": dept_students,
            "total_alerts": total_dept,
            "high_severity_alerts": high_dept,
            "resolved_alerts": resolved_dept,
            "alert_rate_pct": round((total_dept / max(1, dept_students)) * 100.0, 1),
        })

    # 2. Alerts by Course & High Concentration Detection
    course_stats = []
    courses = db.query(Course).all()
    academic_alerts_total = db.query(Alert).filter_by(category=WarningCategory.ACADEMIC_DIFFICULTY).count()

    for c in courses:
        c_alerts = (
            db.query(Alert)
            .join(Student, Alert.student_id == Student.id)
            .filter(Student.course_id == c.id)
            .all()
        )
        academic_c = sum(1 for a in c_alerts if a.category == WarningCategory.ACADEMIC_DIFFICULTY)
        academic_pct = round((academic_c / max(1, academic_alerts_total)) * 100.0, 1)

        course_stats.append({
            "course_id": c.id,
            "name": c.name,
            "code": c.code,
            "department_id": c.department_id,
            "total_alerts": len(c_alerts),
            "academic_alerts": academic_c,
            "academic_concentration_pct": academic_pct,
        })

    # Sort courses by total alerts
    course_stats.sort(key=lambda x: x["total_alerts"], reverse=True)

    # 3. Alerts by Category
    category_counts = {}
    for cat in WarningCategory:
        cnt = db.query(Alert).filter_by(category=cat).count()
        category_counts[cat.value] = cnt

    # 4. Alerts by Severity
    severity_counts = {}
    for sev in Severity:
        cnt = db.query(Alert).filter_by(severity=sev).count()
        severity_counts[sev.value] = cnt

    # 5. Key Systemic Observations / Insights
    insights: List[str] = []
    if course_stats and course_stats[0]["academic_concentration_pct"] >= 25.0:
        top_c = course_stats[0]
        insights.append(
            f"{top_c['name']} ({top_c['code']}) generated {top_c['academic_concentration_pct']}% of all academic early warnings during this semester."
        )

    dept_with_highest_rate = max(dept_stats, key=lambda d: d["alert_rate_pct"]) if dept_stats else None
    if dept_with_highest_rate and dept_with_highest_rate["total_alerts"] > 0:
        insights.append(
            f"Department of {dept_with_highest_rate['name']} has the highest alert incidence ({dept_with_highest_rate['alert_rate_pct']}% of enrolled students)."
        )

    # Recurring pattern: attendance vs academic
    att_count = db.query(Alert).filter_by(category=WarningCategory.DISENGAGEMENT).count()
    acad_count = db.query(Alert).filter_by(category=WarningCategory.ACADEMIC_DIFFICULTY).count()
    fin_count = db.query(Alert).filter_by(category=WarningCategory.FINANCIAL_DIFFICULTY).count()

    insights.append(f"Distribution: Academic ({acad_count}), Disengagement ({att_count}), Financial ({fin_count}).")

    return {
        "summary": {
            "total_students": total_students,
            "total_alerts": total_alerts,
            "active_alerts": db.query(Alert).filter(Alert.status.in_([AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.IN_REVIEW])).count(),
            "resolved_alerts": db.query(Alert).filter_by(status=AlertStatus.RESOLVED).count(),
            "false_positives": db.query(Alert).filter_by(status=AlertStatus.FALSE_POSITIVE).count(),
        },
        "by_department": dept_stats,
        "by_course": course_stats,
        "by_category": category_counts,
        "by_severity": severity_counts,
        "insights": insights,
    }
