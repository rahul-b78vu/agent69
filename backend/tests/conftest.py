"""
Shared pytest fixtures. Every test gets a fresh, isolated in-memory
SQLite database using StaticPool so test client and endpoints share the exact same database.
"""
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.session import Base, get_db
from app.database.init_db import _default_threshold_rows
from app.config.settings import get_settings
from app.models.core import Department, Course, Semester, Student, User, Role, RoleName
from app.models.governance import ThresholdConfig
from app.auth.security import get_password_hash, create_access_token
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    from app import models  # noqa: F401 - register all tables
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    settings = get_settings()

    # Seed roles
    for role_name in RoleName:
        session.add(Role(name=role_name, description=f"{role_name.value} role"))
    session.commit()

    # Seed thresholds
    for key, value, category, description in _default_threshold_rows(settings):
        session.add(ThresholdConfig(key=key, value=float(value), category=category, description=description))
    session.commit()

    # Seed demo department, course, and semester
    dept = Department(name="Computer Science", code="CSE")
    session.add(dept)
    session.commit()

    course = Course(name="B.Tech Computer Science", code="CSE-CORE", department_id=dept.id)
    session.add(course)

    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    sem = Semester(label="2026-Odd", start_date=start, end_date=start + timedelta(weeks=16), is_active=True)
    session.add(sem)
    session.commit()

    # Seed demo users
    admin_role = session.query(Role).filter_by(name=RoleName.ADMIN).first()
    mentor_role = session.query(Role).filter_by(name=RoleName.MENTOR).first()
    finance_role = session.query(Role).filter_by(name=RoleName.FINANCE_SUPPORT).first()

    admin = User(username="admin", full_name="Admin", email="admin@test.com", hashed_password=get_password_hash("adminpassword"), is_active=True)
    admin.roles.append(admin_role)
    session.add(admin)

    mentor = User(username="mentor", full_name="Mentor", email="mentor@test.com", hashed_password=get_password_hash("mentorpassword"), is_active=True, department_id=dept.id)
    mentor.roles.append(mentor_role)
    session.add(mentor)

    finance = User(username="finance", full_name="Finance", email="finance@test.com", hashed_password=get_password_hash("financepassword"), is_active=True)
    finance.roles.append(finance_role)
    session.add(finance)
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers():
    def _get_headers(username: str = "admin"):
        token = create_access_token(data={"sub": username})
        return {"Authorization": f"Bearer {token}"}
    return _get_headers
