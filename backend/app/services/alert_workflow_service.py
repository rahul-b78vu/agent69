"""
Human Response Workflow Service (Step 14 & 16 / spec §11 & §13).

Enforces human-in-the-loop governance:
- Acknowledge alerts
- Add notes / observations
- Record interventions
- Record outcomes (RESOLVED)
- Mark false positives
- Manual escalation

Strict requirement:
Outcome recording MUST be performed by an authorized human responder (responder_user_id is mandatory).
The AI/system never sets or decides an alert outcome.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.alerts import (
    Alert,
    AlertStatus,
    AlertResponse,
    AlertOutcome,
    OutcomeChoice,
    ResponderRole,
)
from app.services.audit_service import log_audit_event
from app.engines.escalation_engine import escalate_alert


def acknowledge_alert(db: Session, alert_id: int, user_id: int, note: Optional[str] = None) -> Alert:
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")

    prev_status = alert.status.value
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.updated_at = datetime.now(timezone.utc)

    resp = AlertResponse(
        alert_id=alert.id,
        responder_user_id=user_id,
        action="ACKNOWLEDGE",
        notes=note,
        new_status=AlertStatus.ACKNOWLEDGED,
        created_at=datetime.now(timezone.utc),
    )
    db.add(resp)
    db.commit()
    db.refresh(alert)

    log_audit_event(
        db,
        action="ACKNOWLEDGE_ALERT",
        object_type="Alert",
        object_id=str(alert.id),
        user_id=user_id,
        previous_value=prev_status,
        new_value=AlertStatus.ACKNOWLEDGED.value,
    )
    return alert


def add_alert_note(db: Session, alert_id: int, user_id: int, notes: str) -> AlertResponse:
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")

    resp = AlertResponse(
        alert_id=alert.id,
        responder_user_id=user_id,
        action="NOTE",
        notes=notes,
        new_status=alert.status,
        created_at=datetime.now(timezone.utc),
    )
    db.add(resp)
    db.commit()
    db.refresh(resp)

    log_audit_event(
        db,
        action="ADD_NOTE",
        object_type="Alert",
        object_id=str(alert.id),
        user_id=user_id,
        new_value=notes[:100],
    )
    return resp


def record_alert_action(db: Session, alert_id: int, user_id: int, action_description: str) -> Alert:
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")

    prev_status = alert.status.value
    alert.status = AlertStatus.ACTION_TAKEN
    alert.updated_at = datetime.now(timezone.utc)

    resp = AlertResponse(
        alert_id=alert.id,
        responder_user_id=user_id,
        action="ACTION_RECORDED",
        notes=action_description,
        new_status=AlertStatus.ACTION_TAKEN,
        created_at=datetime.now(timezone.utc),
    )
    db.add(resp)
    db.commit()
    db.refresh(alert)

    log_audit_event(
        db,
        action="RECORD_ACTION",
        object_type="Alert",
        object_id=str(alert.id),
        user_id=user_id,
        previous_value=prev_status,
        new_value=AlertStatus.ACTION_TAKEN.value,
    )
    return alert


def record_alert_outcome(
    db: Session,
    alert_id: int,
    user_id: int,
    outcome: OutcomeChoice,
    action_taken: Optional[str] = None,
    concern_was_real: Optional[bool] = None,
    intervention_useful: Optional[bool] = None,
    notes: Optional[str] = None,
) -> AlertOutcome:
    """
    Final human resolution of an alert.
    Requires user_id to enforce human responsibility.
    """
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")

    prev_status = alert.status.value
    is_fp = (outcome == OutcomeChoice.FALSE_POSITIVE)
    new_status = AlertStatus.FALSE_POSITIVE if is_fp else AlertStatus.RESOLVED

    alert.status = new_status
    alert.resolved_at = datetime.now(timezone.utc)
    alert.updated_at = datetime.now(timezone.utc)

    existing_outcome = db.query(AlertOutcome).filter_by(alert_id=alert_id).first()
    if existing_outcome:
        existing_outcome.outcome = outcome
        existing_outcome.responder_user_id = user_id
        existing_outcome.action_taken = action_taken
        existing_outcome.concern_was_real = concern_was_real
        existing_outcome.intervention_useful = intervention_useful
        existing_outcome.is_false_positive = is_fp
        existing_outcome.notes = notes
        existing_outcome.recorded_at = datetime.now(timezone.utc)
        outcome_obj = existing_outcome
    else:
        outcome_obj = AlertOutcome(
            alert_id=alert.id,
            responder_user_id=user_id,
            action_taken=action_taken,
            outcome=outcome,
            concern_was_real=concern_was_real,
            intervention_useful=intervention_useful,
            is_false_positive=is_fp,
            notes=notes,
            recorded_at=datetime.now(timezone.utc),
        )
        db.add(outcome_obj)

    resp = AlertResponse(
        alert_id=alert.id,
        responder_user_id=user_id,
        action="STATUS_CHANGE",
        notes=f"Alert finalized with outcome: {outcome.value}. Notes: {notes or 'N/A'}",
        new_status=new_status,
        created_at=datetime.now(timezone.utc),
    )
    db.add(resp)

    db.commit()
    db.refresh(outcome_obj)

    log_audit_event(
        db,
        action="RESOLVE_ALERT_OUTCOME",
        object_type="Alert",
        object_id=str(alert.id),
        user_id=user_id,
        previous_value=prev_status,
        new_value=new_status.value,
    )
    return outcome_obj


def mark_alert_false_positive(db: Session, alert_id: int, user_id: int, reason: str) -> AlertOutcome:
    """
    Helper for marking an alert as FALSE_POSITIVE.
    """
    return record_alert_outcome(
        db,
        alert_id=alert_id,
        user_id=user_id,
        outcome=OutcomeChoice.FALSE_POSITIVE,
        action_taken="Marked as False Positive by Responder",
        concern_was_real=False,
        intervention_useful=False,
        notes=reason,
    )


def manual_escalate(
    db: Session,
    alert_id: int,
    user_id: int,
    reason: str,
    target_role: Optional[ResponderRole] = None,
):
    esc = escalate_alert(db, alert_id=alert_id, reason=reason, target_role=target_role)
    log_audit_event(
        db,
        action="ESCALATE_ALERT",
        object_type="Alert",
        object_id=str(alert_id),
        user_id=user_id,
        new_value=esc.escalated_to_role.value,
    )
    return esc
