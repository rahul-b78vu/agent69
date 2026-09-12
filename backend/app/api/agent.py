"""
Agent 69 execution and synthetic data management endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models.core import User, RoleName
from app.schemas import RunAgentRequest
from app.agents.agent69 import Agent69
from app.services.synthetic_data import generate_synthetic_dataset
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/run")
def trigger_agent_run(
    req: RunAgentRequest = RunAgentRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes Agent 69 orchestrator across active students.
    """
    agent = Agent69(db)
    result = agent.run_cohort_evaluation(
        week_number=req.week_number,
        baseline_cutoff_week=req.baseline_cutoff_week,
    )

    log_audit_event(
        db,
        action="RUN_AGENT69",
        object_type="System",
        object_id=f"Week-{req.week_number}",
        user_id=current_user.id,
        new_value=f"Alerts: {result['alerts_generated_count']}, Escalations: {result['escalations_count']}",
    )
    return result


@router.post("/seed-data")
def reseed_data(
    num_students: int = 120,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleName.ADMIN])),
):
    """
    Regenerates the synthetic dataset with all scenario profiles.
    """
    res = generate_synthetic_dataset(num_students=num_students, drop_first=True)
    log_audit_event(
        db,
        action="RESEED_DATA",
        object_type="System",
        user_id=current_user.id,
        new_value=f"{num_students} students",
    )
    return {"status": "success", "data": res}
