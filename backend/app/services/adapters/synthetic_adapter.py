"""
Synthetic Data Adapters implementation.
Reads from database records to provide uniform access for the data pipelines.
"""
from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services.adapters.interfaces import (
    AttendanceAdapterInterface,
    AssessmentAdapterInterface,
    AssignmentAdapterInterface,
    EngagementAdapterInterface,
    FinancialAdapterInterface,
    LibraryAdapterInterface,
    SISAdapterInterface,
)
from app.models.signals import (
    AttendanceRecord,
    AssessmentRecord,
    AssignmentRecord,
    EngagementRecord,
    FinancialRecord,
    LibraryRecord,
    BacklogRecord,
)


class SyntheticAttendanceAdapter(AttendanceAdapterInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_source_name(self) -> str:
        return "synthetic_attendance_adapter"

    def fetch_attendance(self, student_id: int, week_number: int) -> Dict[str, Any]:
        row = (
            self.db.query(AttendanceRecord)
            .filter_by(student_id=student_id, week_number=week_number)
            .first()
        )
        if not row:
            return {}
        return {
            "student_id": row.student_id,
            "week_number": row.week_number,
            "period_start": row.period_start,
            "attendance_pct": row.attendance_pct,
        }


class SyntheticAssessmentAdapter(AssessmentAdapterInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_source_name(self) -> str:
        return "synthetic_examination_adapter"

    def fetch_marks(self, student_id: int, week_number: int) -> Dict[str, Any]:
        row = (
            self.db.query(AssessmentRecord)
            .filter_by(student_id=student_id, week_number=week_number)
            .first()
        )
        if not row:
            return {}
        return {
            "student_id": row.student_id,
            "week_number": row.week_number,
            "marks_pct": row.marks_pct,
            "assessment_name": row.assessment_name,
        }


class SyntheticAssignmentAdapter(AssignmentAdapterInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_source_name(self) -> str:
        return "synthetic_assignment_adapter"

    def fetch_assignments(self, student_id: int, week_number: int) -> Dict[str, Any]:
        row = (
            self.db.query(AssignmentRecord)
            .filter_by(student_id=student_id, week_number=week_number)
            .first()
        )
        if not row:
            return {}
        return {
            "student_id": row.student_id,
            "week_number": row.week_number,
            "assignments_due": row.assignments_due,
            "assignments_submitted": row.assignments_submitted,
            "submission_rate_pct": row.submission_rate_pct,
        }


class SyntheticEngagementAdapter(EngagementAdapterInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_source_name(self) -> str:
        return "synthetic_lms_adapter"

    def fetch_engagement(self, student_id: int, week_number: int) -> Dict[str, Any]:
        row = (
            self.db.query(EngagementRecord)
            .filter_by(student_id=student_id, week_number=week_number)
            .first()
        )
        if not row:
            return {}
        return {
            "student_id": row.student_id,
            "week_number": row.week_number,
            "lms_logins": row.lms_logins,
            "portal_logins": row.portal_logins,
            "engagement_score": row.engagement_score,
        }


class SyntheticFinancialAdapter(FinancialAdapterInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_source_name(self) -> str:
        return "synthetic_financial_adapter"

    def fetch_financial(self, student_id: int, week_number: int) -> Dict[str, Any]:
        row = (
            self.db.query(FinancialRecord)
            .filter_by(student_id=student_id, week_number=week_number)
            .first()
        )
        if not row:
            return {}
        return {
            "student_id": row.student_id,
            "week_number": row.week_number,
            "amount_due": row.amount_due,
            "amount_overdue": row.amount_overdue,
            "days_overdue": row.days_overdue,
            "payment_delayed": row.payment_delayed,
        }


class SyntheticLibraryAdapter(LibraryAdapterInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_source_name(self) -> str:
        return "synthetic_library_adapter"

    def fetch_library(self, student_id: int, week_number: int) -> Dict[str, Any]:
        row = (
            self.db.query(LibraryRecord)
            .filter_by(student_id=student_id, week_number=week_number)
            .first()
        )
        if not row:
            return {}
        return {
            "student_id": row.student_id,
            "week_number": row.week_number,
            "library_visits": row.library_visits,
            "resources_borrowed": row.resources_borrowed,
            "campus_system_logins": row.campus_system_logins,
        }


class SyntheticSISAdapter(SISAdapterInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_source_name(self) -> str:
        return "synthetic_sis_adapter"

    def fetch_backlogs(self, student_id: int, week_number: int) -> Dict[str, Any]:
        row = (
            self.db.query(BacklogRecord)
            .filter_by(student_id=student_id, week_number=week_number)
            .first()
        )
        if not row:
            return {}
        return {
            "student_id": row.student_id,
            "week_number": row.week_number,
            "backlog_count": row.backlog_count,
            "new_backlogs_this_period": row.new_backlogs_this_period,
        }
