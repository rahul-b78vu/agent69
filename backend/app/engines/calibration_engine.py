"""
Calibration Engine (Step 17 / spec §14).

Analyzes alert outcomes over a semester (or period) to measure empirical precision:
- Total Alerts
- Confirmed Concerns
- False Positives & False Positive Rate
- Average Response Times
- Breakdown by Category and Severity

Generates Data-Driven Threshold Recommendations (e.g. adjust deviation cutoffs or weights).
CRITICAL RULE:
- NEVER silently applies changes to production thresholds.
- Flags changes as 'PENDING_APPROVAL'.
- Requires explicit administrator approval to apply recommended changes.
- Logs full audit records upon approval.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.alerts import Alert, AlertOutcome, OutcomeChoice, AlertStatus, WarningCategory, Severity
from app.models.governance import CalibrationRun, ThresholdConfig
from app.services.audit_service import log_audit_event


def run_semester_calibration(
    db: Session,
    semester_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> CalibrationRun:
    """
    Executes calibration analysis across all recorded alert outcomes.
    Produces metric summaries and proposed threshold changes without mutating live settings.
    """
    alerts = db.query(Alert).all()
    total_alerts = len(alerts)

    outcomes = db.query(AlertOutcome).all()
    total_outcomes = len(outcomes)

    false_positives = sum(1 for o in outcomes if o.is_false_positive or o.outcome == OutcomeChoice.FALSE_POSITIVE)
    confirmed_concerns = sum(1 for o in outcomes if o.concern_was_real is True or o.outcome in (
        OutcomeChoice.CONCERN_CONFIRMED,
        OutcomeChoice.STUDENT_REQUESTED_SUPPORT,
        OutcomeChoice.ACADEMIC_SUPPORT_PROVIDED,
        OutcomeChoice.FINANCIAL_SUPPORT_PROVIDED,
        OutcomeChoice.COUNSELLING_REFERRAL,
    ))

    fp_rate = round((false_positives / total_outcomes * 100.0), 1) if total_outcomes > 0 else 0.0
    tp_rate = round((confirmed_concerns / total_outcomes * 100.0), 1) if total_outcomes > 0 else 0.0

    # Calculate average response time in hours
    resolved_alerts = db.query(Alert).filter(Alert.resolved_at != None).all()
    if resolved_alerts:
        response_hours = [
            (a.resolved_at - a.created_at).total_seconds() / 3600.0
            for a in resolved_alerts if a.resolved_at >= a.created_at
        ]
        avg_response_hours = round(sum(response_hours) / len(response_hours), 1) if response_hours else 0.0
    else:
        avg_response_hours = 0.0

    # Breakdowns
    cat_counts = {}
    for cat in WarningCategory:
        count = db.query(Alert).filter_by(category=cat).count()
        cat_counts[cat.value] = count

    sev_counts = {}
    for sev in Severity:
        count = db.query(Alert).filter_by(severity=sev).count()
        sev_counts[sev.value] = count

    # Threshold Recommendations logic:
    # If False Positive rate > 20%, suggest raising minimum deviation percentage or severity cutoffs
    recommendations: List[Dict[str, Any]] = []

    att_low = db.query(ThresholdConfig).filter_by(key="ATTENDANCE_DEVIATION_PCT_LOW").first()
    curr_att_low = att_low.value if att_low else 5.0

    sev_low_max = db.query(ThresholdConfig).filter_by(key="SEVERITY_LOW_MAX").first()
    curr_sev_low = sev_low_max.value if sev_low_max else 2.0

    if fp_rate > 20.0:
        # High false positive rate -> recommend tightening sensitivity
        rec_att = min(curr_att_low + 2.0, 15.0)
        recommendations.append({
            "key": "ATTENDANCE_DEVIATION_PCT_LOW",
            "current_value": curr_att_low,
            "recommended_value": rec_att,
            "reason": f"Elevated false positive rate ({fp_rate}%). Raising attendance sensitivity threshold reduces transient alert noise.",
        })
        recommendations.append({
            "key": "SEVERITY_LOW_MAX",
            "current_value": curr_sev_low,
            "recommended_value": curr_sev_low + 1.0,
            "reason": "Elevated false positive rate. Raising LOW severity threshold reserves MEDIUM/HIGH alerts for multi-signal patterns.",
        })
    elif fp_rate < 5.0 and total_outcomes >= 10:
        # Very low false positive rate -> system may be slightly under-sensitive
        rec_att = max(curr_att_low - 1.0, 3.0)
        recommendations.append({
            "key": "ATTENDANCE_DEVIATION_PCT_LOW",
            "current_value": curr_att_low,
            "recommended_value": rec_att,
            "reason": f"Very low false positive rate ({fp_rate}%). Moderately lowering threshold captures subtle early warning patterns.",
        })
    else:
        # Balanced or default recommendation
        recommendations.append({
            "key": "ATTENDANCE_DEVIATION_PCT_LOW",
            "current_value": curr_att_low,
            "recommended_value": curr_att_low,
            "reason": f"False positive rate ({fp_rate}%) is within optimal institutional boundaries (5-20%). Baseline threshold maintained.",
        })

    run = CalibrationRun(
        semester_id=semester_id,
        total_alerts=total_alerts,
        confirmed_concerns=confirmed_concerns,
        false_positives=false_positives,
        false_positive_rate=fp_rate,
        true_positive_rate=tp_rate,
        avg_response_time_hours=avg_response_hours,
        breakdown_by_category=cat_counts,
        breakdown_by_severity=sev_counts,
        recommendations=recommendations,
        status="RECOMMENDATIONS_PENDING" if recommendations else "COMPLETED",
        run_at=datetime.now(timezone.utc),
        run_by_user_id=user_id,
    )
    db.add(run)
    db.flush()

    # Store recommended changes into threshold_configs as pending
    for rec in recommendations:
        cfg = db.query(ThresholdConfig).filter_by(key=rec["key"]).first()
        if cfg and rec["current_value"] != rec["recommended_value"]:
            cfg.is_recommended_change = True
            cfg.recommended_value = float(rec["recommended_value"])
            cfg.recommendation_reason = rec["reason"]
            cfg.recommendation_approved = None  # Pending
            cfg.recommended_by_calibration_run_id = run.id

    db.commit()
    db.refresh(run)

    log_audit_event(
        db,
        action="RUN_CALIBRATION",
        object_type="CalibrationRun",
        object_id=str(run.id),
        user_id=user_id,
        new_value=f"FP Rate: {fp_rate}%, TP Rate: {tp_rate}%",
    )
    return run


def approve_calibration_recommendation(
    db: Session,
    calibration_run_id: int,
    user_id: int,
    approved: bool = True,
) -> CalibrationRun:
    """
    Authorized Administrator approval of pending calibration recommendations.
    Applies changes to production thresholds ONLY when approved is True.
    """
    run = db.query(CalibrationRun).filter_by(id=calibration_run_id).first()
    if not run:
        raise ValueError(f"CalibrationRun {calibration_run_id} not found")

    configs = db.query(ThresholdConfig).filter_by(recommended_by_calibration_run_id=run.id).all()

    for cfg in configs:
        cfg.recommendation_approved = approved
        if approved and cfg.recommended_value is not None:
            old_val = cfg.value
            cfg.value = cfg.recommended_value
            cfg.is_recommended_change = False
            cfg.updated_at = datetime.now(timezone.utc)
            cfg.updated_by_user_id = user_id

            log_audit_event(
                db,
                action="APPROVE_THRESHOLD_CHANGE",
                object_type="ThresholdConfig",
                object_id=str(cfg.id),
                user_id=user_id,
                previous_value=str(old_val),
                new_value=str(cfg.value),
            )

    run.status = "APPLIED" if approved else "REJECTED"
    db.commit()
    db.refresh(run)

    log_audit_event(
        db,
        action="CALIBRATION_DECISION",
        object_type="CalibrationRun",
        object_id=str(run.id),
        user_id=user_id,
        new_value="APPROVED" if approved else "REJECTED",
    )
    return run
