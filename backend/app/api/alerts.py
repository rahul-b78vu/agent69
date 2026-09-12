"""
Alerts & Human Response Workflow API endpoints (spec §9, §11, §12).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.core import User, Student, RoleName
from app.models.alerts import (
    Alert,
    AlertStatus,
    WarningCategory,
    Severity,
    ResponderRole,
)
from app.schemas import (
    AlertOut,
    AlertEvidenceOut,
    AlertResponseOut,
    AlertOutcomeOut,
    AcknowledgeRequest,
    NoteRequest,
    ActionRequest,
    OutcomeRequest,
    FalsePositiveRequest,
    EscalateRequest,
)
from app.services.alert_workflow_service import (
    acknowledge_alert,
    add_alert_note,
    record_alert_action,
    record_alert_outcome,
    mark_alert_false_positive,
    manual_escalate,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _map_alert_out(alert: Alert) -> AlertOut:
    student = alert.student
    return AlertOut(
        id=alert.id,
        student_id=alert.student_id,
        student_code=student.student_code if student else None,
        department_name=student.department.name if student and student.department else None,
        course_name=student.course.name if student and student.course else None,
        category=alert.category,
        severity=alert.severity,
        urgency=alert.urgency,
        confidence=alert.confidence,
        warning_score=alert.warning_score,
        suggested_responder_role=alert.suggested_responder_role,
        assigned_user_id=alert.assigned_user_id,
        assigned_user_name=None,
        status=alert.status,
        narrative_summary=alert.narrative_summary,
        response_deadline=alert.response_deadline,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
        resolved_at=alert.resolved_at,
        evidence=[AlertEvidenceOut.model_validate(e) for e in alert.evidence],
        outcome=AlertOutcomeOut.model_validate(alert.outcome) if alert.outcome else None,
    )


@router.get("", response_model=List[AlertOut])
def list_alerts(
    status: Optional[AlertStatus] = None,
    category: Optional[WarningCategory] = None,
    severity: Optional[Severity] = None,
    department_id: Optional[int] = None,
    student_id: Optional[int] = None,
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Alert).join(Student, Alert.student_id == Student.id)

    # RBAC Data Filtering:
    user_roles = [r.name for r in current_user.roles]

    if RoleName.ADMIN in user_roles or RoleName.DEAN in user_roles or RoleName.PRINCIPAL in user_roles:
        # Full institutional visibility
        pass
    elif RoleName.FINANCE_SUPPORT in user_roles:
        # Finance support only sees financial alerts
        q = q.filter(Alert.category == WarningCategory.FINANCIAL_DIFFICULTY)
    elif RoleName.COUNSELLOR in user_roles:
        # Counsellor sees health/personal & disengagement
        q = q.filter(Alert.category.in_([WarningCategory.HEALTH_PERSONAL, WarningCategory.DISENGAGEMENT]))
    elif RoleName.HOD in user_roles or RoleName.MENTOR in user_roles:
        # Departmental filter if assigned
        if current_user.department_id:
            q = q.filter(Student.department_id == current_user.department_id)

    if status:
        q = q.filter(Alert.status == status)
    if category:
        q = q.filter(Alert.category == category)
    if severity:
        q = q.filter(Alert.severity == severity)
    if department_id:
        q = q.filter(Student.department_id == department_id)
    if student_id:
        q = q.filter(Alert.student_id == student_id)

    alerts = q.order_by(Alert.created_at.desc()).limit(limit).all()
    return [_map_alert_out(a) for a in alerts]


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return _map_alert_out(alert)


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert_endpoint(
    alert_id: int,
    req: AcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated = acknowledge_alert(db, alert_id=alert_id, user_id=current_user.id, note=req.notes)
        return _map_alert_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{alert_id}/response")
def add_response_endpoint(
    alert_id: int,
    req: NoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        resp = add_alert_note(db, alert_id=alert_id, user_id=current_user.id, notes=req.notes)
        return {"status": "success", "response_id": resp.id, "created_at": resp.created_at}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{alert_id}/action", response_model=AlertOut)
def record_action_endpoint(
    alert_id: int,
    req: ActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated = record_alert_action(db, alert_id=alert_id, user_id=current_user.id, action_description=req.action_description)
        return _map_alert_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{alert_id}/resolve", response_model=AlertOutcomeOut)
def resolve_alert_endpoint(
    alert_id: int,
    req: OutcomeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        outcome = record_alert_outcome(
            db,
            alert_id=alert_id,
            user_id=current_user.id,
            outcome=req.outcome,
            action_taken=req.action_taken,
            concern_was_real=req.concern_was_real,
            intervention_useful=req.intervention_useful,
            notes=req.notes,
        )
        return AlertOutcomeOut.model_validate(outcome)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{alert_id}/false-positive", response_model=AlertOutcomeOut)
def false_positive_endpoint(
    alert_id: int,
    req: FalsePositiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        outcome = mark_alert_false_positive(
            db,
            alert_id=alert_id,
            user_id=current_user.id,
            reason=req.reason,
        )
        return AlertOutcomeOut.model_validate(outcome)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{alert_id}/escalate")
def escalate_alert_endpoint(
    alert_id: int,
    req: EscalateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        esc = manual_escalate(
            db,
            alert_id=alert_id,
            user_id=current_user.id,
            reason=req.reason,
            target_role=req.target_role,
        )
        return {
            "status": "escalated",
            "escalation_level": esc.escalation_level,
            "escalated_to_role": esc.escalated_to_role.value,
            "escalated_at": esc.escalated_at,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
