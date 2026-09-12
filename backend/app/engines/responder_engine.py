"""
Responder Assignment Engine (Step 12 / spec §10).

Routes alerts to the appropriate institutional role based on:
- Warning Category (Academic -> Mentor, Financial -> Finance Support, Health/Personal -> Counsellor)
- Prior Alert History (Repeated academic alerts -> escalate to HoD)
- Severity Level (Institution-wide / High severity -> HoD or Dean)

Also matches to a specific staff user in the student's department when available.
"""
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.core import Student, User, Role, RoleName
from app.models.alerts import Alert, WarningCategory, Severity, ResponderRole


def assign_responder(
    db: Session,
    student_id: int,
    category: WarningCategory,
    severity: Severity,
) -> Tuple[ResponderRole, Optional[int]]:
    """
    Returns (suggested_role, assigned_user_id).
    """
    student = db.query(Student).filter_by(id=student_id).first()
    dept_id = student.department_id if student else None

    # Check prior alerts for repeated concern
    prior_alert_count = (
        db.query(Alert)
        .filter(Alert.student_id == student_id, Alert.category == category)
        .count()
    )

    suggested_role: ResponderRole

    if category == WarningCategory.FINANCIAL_DIFFICULTY:
        suggested_role = ResponderRole.FINANCE_SUPPORT

    elif category == WarningCategory.HEALTH_PERSONAL:
        suggested_role = ResponderRole.COUNSELLOR

    elif category == WarningCategory.ACADEMIC_DIFFICULTY:
        # Repeated academic difficulty routes to HoD, otherwise Mentor
        if prior_alert_count >= 2 or severity == Severity.HIGH:
            suggested_role = ResponderRole.HOD
        else:
            suggested_role = ResponderRole.MENTOR

    elif category == WarningCategory.DISENGAGEMENT:
        suggested_role = ResponderRole.MENTOR

    else:
        # GENERAL_EARLY_WARNING
        suggested_role = ResponderRole.MENTOR

    # Try to find a matching active user in the student's department with this role
    assigned_user_id = None
    target_role_name = RoleName(suggested_role.value)

    user_query = (
        db.query(User)
        .join(User.roles)
        .filter(Role.name == target_role_name, User.is_active == True)
    )
    if dept_id and suggested_role in (ResponderRole.MENTOR, ResponderRole.HOD):
        dept_user = user_query.filter(User.department_id == dept_id).first()
        if dept_user:
            assigned_user_id = dept_user.id

    if not assigned_user_id:
        fallback_user = user_query.first()
        if fallback_user:
            assigned_user_id = fallback_user.id

    return suggested_role, assigned_user_id
