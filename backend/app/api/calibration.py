"""
Semester Calibration API endpoints (spec §17).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.core import User, RoleName
from app.models.governance import CalibrationRun
from app.schemas import CalibrationRunOut, CalibrationDecisionRequest
from app.engines.calibration_engine import run_semester_calibration, approve_calibration_recommendation

router = APIRouter(prefix="/calibration", tags=["calibration"])


@router.get("", response_model=List[CalibrationRunOut])
def list_calibration_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    runs = db.query(CalibrationRun).order_by(CalibrationRun.run_at.desc()).all()
    return runs


@router.post("/run", response_model=CalibrationRunOut)
def execute_calibration(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleName.ADMIN])),
):
    """
    Executes semester calibration analysis and generates recommended threshold updates.
    """
    run = run_semester_calibration(db, user_id=current_user.id)
    return run


@router.post("/{run_id}/approve", response_model=CalibrationRunOut)
def approve_calibration(
    run_id: int,
    req: CalibrationDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleName.ADMIN])),
):
    """
    Authorized Administrator approval of pending calibration recommendations.
    """
    try:
        updated_run = approve_calibration_recommendation(
            db,
            calibration_run_id=run_id,
            user_id=current_user.id,
            approved=req.approved,
        )
        return updated_run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
