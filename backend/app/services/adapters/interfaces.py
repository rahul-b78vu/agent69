"""
Data Adapter Interfaces (Step 6 / spec §21).

These abstract interfaces isolate external university data source formats
from Agent 69's internal logic. Whether data comes from an ERP, Canvas,
Moodle, Banner, or synthetic records, adapters transform raw payloads into
standardized internal dictionaries before passing them to the database
or agent engines.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional


class BaseDataAdapter(ABC):
    @abstractmethod
    def get_source_name(self) -> str:
        """Returns the identifier of the external system."""
        pass


class AttendanceAdapterInterface(BaseDataAdapter):
    @abstractmethod
    def fetch_attendance(self, student_id: int, week_number: int) -> Dict[str, Any]:
        """Returns: {"student_id": int, "week_number": int, "period_start": datetime, "attendance_pct": float}"""
        pass


class AssessmentAdapterInterface(BaseDataAdapter):
    @abstractmethod
    def fetch_marks(self, student_id: int, week_number: int) -> Dict[str, Any]:
        """Returns: {"student_id": int, "week_number": int, "marks_pct": float, "assessment_name": str}"""
        pass


class AssignmentAdapterInterface(BaseDataAdapter):
    @abstractmethod
    def fetch_assignments(self, student_id: int, week_number: int) -> Dict[str, Any]:
        """Returns: {"student_id": int, "week_number": int, "assignments_due": int, "assignments_submitted": int, "submission_rate_pct": float}"""
        pass


class EngagementAdapterInterface(BaseDataAdapter):
    @abstractmethod
    def fetch_engagement(self, student_id: int, week_number: int) -> Dict[str, Any]:
        """Returns: {"student_id": int, "week_number": int, "lms_logins": int, "portal_logins": int, "engagement_score": float}"""
        pass


class FinancialAdapterInterface(BaseDataAdapter):
    @abstractmethod
    def fetch_financial(self, student_id: int, week_number: int) -> Dict[str, Any]:
        """Returns: {"student_id": int, "week_number": int, "amount_due": float, "amount_overdue": float, "days_overdue": int, "payment_delayed": bool}"""
        pass


class LibraryAdapterInterface(BaseDataAdapter):
    @abstractmethod
    def fetch_library(self, student_id: int, week_number: int) -> Dict[str, Any]:
        """Returns: {"student_id": int, "week_number": int, "library_visits": int, "resources_borrowed": int, "campus_system_logins": int}"""
        pass


class SISAdapterInterface(BaseDataAdapter):
    @abstractmethod
    def fetch_backlogs(self, student_id: int, week_number: int) -> Dict[str, Any]:
        """Returns: {"student_id": int, "week_number": int, "backlog_count": int, "new_backlogs_this_period": int}"""
        pass
