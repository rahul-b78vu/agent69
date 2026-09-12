"""
Escalation Engine (Step 15 / spec §12).

Monitors alerts that remain unresolved or unacknowledged past their configured response deadline.
Triggers tiered escalation:
- Level 1: MENTOR
- Level 2: HOD
- Level 3: DEAN / PRINCIPAL

Records all escalation history in `AlertEscalation` and updates alert status to ESCALATED.
"""
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.alerts import (
    Alert,
    AlertStatus,
    AlertEscalation,
    ResponderRole,
)


def get_next_escalation_role(current_role: ResponderRole, current_level: int) -> ResponderRole:
    """
    Tiered progression:
    Level 1 -> MENTOR / HOD
    Level 2 -> HOD
    Level 3 -> DEAN
    Level 4+ -> PRINCIPAL
    """
    if current_level == 1:
        return ResponderRole.HOD if current_role == ResponderRole.MENTOR else ResponderRole.DEAN
    elif current_level == 2:
        return ResponderRole.DEAN
    else:
        return ResponderRole.PRINCIPAL


def escalate_alert(
    db: Session,
    alert_id: int,
    reason: str,
    target_role: Optional[ResponderRole] = None,
) -> AlertEscalation:
    """
    Escalates an alert to the next leadership tier and records the escalation.
    """
    alert = db.query(Alert).filter_by(id=alert_id).first()
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")

    prior_escalations = (
        db.query(AlertEscalation)
        .filter_by(alert_id=alert_id)
        .order_by(AlertEscalation.escalation_level.desc())
        .all()
    )
    next_level = (prior_escalations[0].escalation_level + 1) if prior_escalations else 1

    escalated_role = target_role or get_next_escalation_role(alert.suggested_responder_role, next_level)

    escalation = AlertEscalation(
        alert_id=alert.id,
        escalation_level=next_level,
        escalated_to_role=escalated_role,
        reason=reason,
        escalated_at=datetime.now(timezone.utc),
    )
    db.add(escalation)

    alert.status = AlertStatus.ESCALATED
    alert.suggested_responder_role = escalated_role
    alert.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(escalation)
    return escalation


def check_and_escalate_overdue_alerts(db: Session, current_time: Optional[datetime] = None) -> List[AlertEscalation]:
    """
    Scans all open alerts (NEW, ACKNOWLEDGED, IN_REVIEW) where response_deadline < current_time.
    Executes automatic escalation.
    """
    now = current_time or datetime.now(timezone.utc)

    overdue_alerts = (
        db.query(Alert)
        .filter(
            Alert.status.in_([AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.IN_REVIEW]),
            Alert.response_deadline != None,
            Alert.response_deadline < now,
        )
        .all()
    )

    escalations_created = []
    for alert in overdue_alerts:
        esc = escalate_alert(
            db,
            alert_id=alert.id,
            reason=f"SLA response window expired at {alert.response_deadline.isoformat()}",
        )
        escalations_created.append(esc)

    return escalations_created
