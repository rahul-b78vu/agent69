"""
Audit Log API endpoints (spec §22).
"""
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.core import User, RoleName
from app.models.governance import AuditLog
from app.schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleName.ADMIN, RoleName.DEAN, RoleName.PRINCIPAL])),
):
    entries = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

    user_map = {u.id: u.full_name for u in db.query(User).all()}
    results = []
    for e in entries:
        results.append(AuditLogOut(
            id=e.id,
            user_id=e.user_id,
            user_name=user_map.get(e.user_id, "System") if e.user_id else "System",
            action=e.action,
            object_type=e.object_type,
            object_id=e.object_id,
            previous_value=e.previous_value,
            new_value=e.new_value,
            ip_address=e.ip_address,
            created_at=e.created_at,
        ))
    return results
