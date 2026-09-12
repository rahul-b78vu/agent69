"""
Audit Logging Service (Step 22 / spec §15).

Captures an immutable audit trail of actions taken in the system:
- Alert viewed
- Alert acknowledged
- Status changed
- Note added
- Alert escalated
- Alert resolved with human outcome
- Threshold changed
- Calibration approved

Never stores unnecessary sensitive student data into audit logs.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.governance import AuditLog


def log_audit_event(
    db: Session,
    action: str,
    object_type: str,
    object_id: Optional[str] = None,
    user_id: Optional[int] = None,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Appends an entry to the audit_logs table.
    """
    entry = AuditLog(
        user_id=user_id,
        action=action,
        object_type=object_type,
        object_id=str(object_id) if object_id is not None else None,
        previous_value=str(previous_value) if previous_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
