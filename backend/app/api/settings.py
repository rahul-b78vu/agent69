"""
Threshold Settings & Governance API endpoints (spec §16).
"""
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.core import User, RoleName
from app.models.governance import ThresholdConfig
from app.schemas import ThresholdConfigOut, ThresholdUpdateRequest
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=List[ThresholdConfigOut])
def get_threshold_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    configs = db.query(ThresholdConfig).order_by(ThresholdConfig.category, ThresholdConfig.key).all()
    return configs


@router.put("/{config_id}", response_model=ThresholdConfigOut)
def update_threshold_setting(
    config_id: int,
    req: ThresholdUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleName.ADMIN])),
):
    cfg = db.query(ThresholdConfig).filter_by(id=config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Threshold configuration not found")

    old_val = cfg.value
    cfg.value = req.value
    cfg.updated_at = datetime.now(timezone.utc)
    cfg.updated_by_user_id = current_user.id
    db.commit()
    db.refresh(cfg)

    log_audit_event(
        db,
        action="UPDATE_THRESHOLD",
        object_type="ThresholdConfig",
        object_id=str(cfg.id),
        user_id=current_user.id,
        previous_value=str(old_val),
        new_value=str(req.value),
    )
    return cfg
