"""
REST API Endpoints and RBAC Authorization Tests (Step 25).
"""
import pytest
from app.models.alerts import Alert, AlertStatus, WarningCategory, Severity, ResponderRole, Urgency


def test_auth_login_and_me(client, auth_headers):
    # Success
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"

    # Invalid password
    bad_resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert bad_resp.status_code == 401

    # /auth/me
    headers = auth_headers("admin")
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "admin"


def test_students_api(client, auth_headers, db_session):
    headers = auth_headers("admin")
    resp = client.get("/api/students", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_alerts_workflow_api(client, auth_headers, db_session):
    from app.models.core import Student
    s = db_session.query(Student).first()
    if not s:
        from tests.test_mandatory_scenarios import _create_test_student
        s = _create_test_student(db_session, "API_STUDENT")

    alert = Alert(
        student_id=s.id,
        category=WarningCategory.ACADEMIC_DIFFICULTY,
        severity=Severity.HIGH,
        urgency=Urgency.IMMEDIATE,
        warning_score=6,
        confidence=0.85,
        suggested_responder_role=ResponderRole.MENTOR,
        status=AlertStatus.NEW,
        narrative_summary="Test Academic Alert",
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    headers = auth_headers("admin")

    # 1. Acknowledge
    ack_resp = client.post(f"/api/alerts/{alert.id}/acknowledge", json={"notes": "Checked"}, headers=headers)
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"

    # 2. Add Note
    note_resp = client.post(f"/api/alerts/{alert.id}/response", json={"notes": "Met with student"}, headers=headers)
    assert note_resp.status_code == 200

    # 3. Action Recorded
    act_resp = client.post(f"/api/alerts/{alert.id}/action", json={"action_description": "Enrolled in peer tutoring"}, headers=headers)
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "ACTION_TAKEN"

    # 4. Resolve
    res_resp = client.post(
        f"/api/alerts/{alert.id}/resolve",
        json={
            "outcome": "ACADEMIC_SUPPORT_PROVIDED",
            "action_taken": "Tutoring assigned",
            "concern_was_real": True,
            "intervention_useful": True,
            "notes": "Student improved",
        },
        headers=headers,
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["outcome"] == "ACADEMIC_SUPPORT_PROVIDED"


def test_rbac_counselling_and_finance_separation(client, auth_headers, db_session):
    from tests.test_mandatory_scenarios import _create_test_student
    s = _create_test_student(db_session, "RBAC_STUDENT")

    # Create one financial alert and one health alert
    fin_alert = Alert(
        student_id=s.id,
        category=WarningCategory.FINANCIAL_DIFFICULTY,
        severity=Severity.MEDIUM,
        urgency=Urgency.PROMPT,
        warning_score=4,
        confidence=0.8,
        suggested_responder_role=ResponderRole.FINANCE_SUPPORT,
        status=AlertStatus.NEW,
        narrative_summary="Tuition overdue",
    )
    health_alert = Alert(
        student_id=s.id,
        category=WarningCategory.HEALTH_PERSONAL,
        severity=Severity.HIGH,
        urgency=Urgency.IMMEDIATE,
        warning_score=6,
        confidence=0.8,
        suggested_responder_role=ResponderRole.COUNSELLOR,
        status=AlertStatus.NEW,
        narrative_summary="Counselling check-in requested",
    )
    db_session.add(fin_alert)
    db_session.add(health_alert)
    db_session.commit()

    # Finance officer login
    fin_headers = auth_headers("finance")
    resp = client.get("/api/alerts", headers=fin_headers)
    assert resp.status_code == 200
    categories_visible = [a["category"] for a in resp.json()]
    assert "FINANCIAL_DIFFICULTY" in categories_visible
    assert "HEALTH_PERSONAL" not in categories_visible, "Finance officer must not see health/counselling alerts"


def test_calibration_and_admin_approval(client, auth_headers):
    admin_headers = auth_headers("admin")
    mentor_headers = auth_headers("mentor")

    # Mentor cannot run or approve calibration (requires ADMIN)
    bad_resp = client.post("/api/calibration/run", headers=mentor_headers)
    assert bad_resp.status_code == 403

    # Admin runs calibration
    cal_resp = client.post("/api/calibration/run", headers=admin_headers)
    assert cal_resp.status_code == 200
    cal_data = cal_resp.json()
    run_id = cal_data["id"]

    # Admin approves calibration
    app_resp = client.post(f"/api/calibration/{run_id}/approve", json={"approved": True}, headers=admin_headers)
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "APPLIED"


def test_dashboard_and_reports_endpoints(client, auth_headers):
    headers = auth_headers("admin")

    dash_resp = client.get("/api/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert "cards" in data
    assert "charts" in data
    assert "recurring_patterns" in data["charts"]

    rep_resp = client.get("/api/reports", headers=headers)
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert "by_department" in rep_data
    assert "by_course" in rep_data
    assert "insights" in rep_data
