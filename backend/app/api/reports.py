"""
Institutional Reports API endpoints (spec §18).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.core import User
from app.engines.reporting_engine import generate_institutional_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregate institutional report data for leadership review.
    """
    return generate_institutional_report(db)
