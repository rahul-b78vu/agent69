"""
Agent 69 Main Orchestrator.

Orchestrates the entire student support early-warning pipeline:
1. Baseline calculation (personal historical baseline)
2. Continuous deviation detection across 8 independent signals
3. Multi-signal correlation and weighted scoring
4. Warning classification
5. Severity & urgency determination
6. Responder routing
7. Explainable alert & evidence generation
8. SLA escalation checks

Safety Guarantee:
Agent 69 is strictly an early-warning pattern assistant.
Every alert produced requires authorized human review.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.core import Student
from app.models.alerts import Alert, AlertStatus, WarningCategory
from app.engines.baseline_engine import recalculate_all_baselines_for_student
from app.engines.deviation_engine import detect_all_deviations_for_student
from app.engines.correlation_engine import correlate_signals
from app.engines.classification_engine import classify_signals
from app.engines.severity_engine import evaluate_severity_and_urgency
from app.engines.responder_engine import assign_responder
from app.engines.alert_engine import create_alert
from app.engines.escalation_engine import check_and_escalate_overdue_alerts


class Agent69:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_student(
        self,
        student_id: int,
        week_number: int,
        baseline_cutoff_week: Optional[int] = 4,
    ) -> Optional[Alert]:
        """
        Runs the full Agent 69 pipeline for a single student at week_number.
        """
        # 1. Update/Ensure baseline up to cutoff week (e.g. week 4) to prevent leakage
        recalculate_all_baselines_for_student(self.db, student_id, up_to_week=baseline_cutoff_week)

        # 2. Detect deviations at week_number
        signals = detect_all_deviations_for_student(
            self.db,
            student_id=student_id,
            week_number=week_number,
            baseline_week_cutoff=baseline_cutoff_week,
            persist=True,
        )

        if not signals:
            return None

        # 3. Correlate multi-signals
        correlation = correlate_signals(self.db, student_id, week_number, signals)

        # Do not generate alert if score is 0 or it is an isolated single weak blip without score
        if correlation.warning_score <= 0 or not correlation.contributing_signals:
            return None

        # 4. Classification
        category = classify_signals(correlation)

        # Check if active unaddressed alert already exists for this student & category
        existing_alert = (
            self.db.query(Alert)
            .filter(
                Alert.student_id == student_id,
                Alert.category == category,
                Alert.status.in_([AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.IN_REVIEW]),
            )
            .first()
        )
        if existing_alert:
            # Avoid duplicate spamming for same ongoing issue
            return existing_alert

        # 5. Severity, urgency, and deadline
        now = datetime.now(timezone.utc)
        severity, urgency, deadline = evaluate_severity_and_urgency(self.db, correlation, from_time=now)

        # 6. Responder assignment
        suggested_role, assigned_user_id = assign_responder(self.db, student_id, category, severity)

        # 7. Generate explainable alert
        alert = create_alert(
            db=self.db,
            student_id=student_id,
            category=category,
            severity=severity,
            urgency=urgency,
            deadline=deadline,
            suggested_role=suggested_role,
            assigned_user_id=assigned_user_id,
            result=correlation,
        )

        return alert

    def run_cohort_evaluation(
        self,
        week_number: int = 12,
        baseline_cutoff_week: int = 4,
    ) -> Dict[str, Any]:
        """
        Runs Agent 69 across all active students in the university.
        Also scans for SLA escalation breaches.
        """
        students = self.db.query(Student).filter(Student.is_active == True).all()
        alerts_generated = []

        for student in students:
            alert = self.evaluate_student(
                student_id=student.id,
                week_number=week_number,
                baseline_cutoff_week=baseline_cutoff_week,
            )
            if alert:
                alerts_generated.append(alert)

        # Run escalation check for any existing overdue alerts
        escalations = check_and_escalate_overdue_alerts(self.db)

        return {
            "week_evaluated": week_number,
            "students_evaluated": len(students),
            "alerts_generated_count": len(alerts_generated),
            "escalations_count": len(escalations),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
