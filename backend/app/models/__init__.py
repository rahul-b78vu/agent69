"""
Import every model module so that Base.metadata.create_all() (and Alembic
autogenerate, if added later) can discover all tables.
"""
from app.models.core import Department, Course, Semester, Student, User, Role, RoleName  # noqa: F401
from app.models.signals import (  # noqa: F401
    StudentBaseline, AttendanceRecord, AssessmentRecord, AssignmentRecord,
    EngagementRecord, FinancialRecord, BacklogRecord, BehaviourRecord,
    LibraryRecord, WarningSignal, SignalType,
)
from app.models.alerts import (  # noqa: F401
    Alert, AlertEvidence, AlertResponse, AlertEscalation, AlertOutcome,
    WarningCategory, Severity, Urgency, ResponderRole, AlertStatus, OutcomeChoice,
)
from app.models.governance import ThresholdConfig, CalibrationRun, AuditLog  # noqa: F401
