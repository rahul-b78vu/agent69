"""
Core institutional entities: departments, courses, semesters, students,
users and roles.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SAEnum, Table
)
from sqlalchemy.orm import relationship

from app.database.session import Base


class RoleName(str, enum.Enum):
    ADMIN = "ADMIN"
    MENTOR = "MENTOR"
    HOD = "HOD"
    DEAN = "DEAN"
    COUNSELLOR = "COUNSELLOR"
    FINANCE_SUPPORT = "FINANCE_SUPPORT"
    PRINCIPAL = "PRINCIPAL"


# Association table: users <-> roles (a user may hold more than one role,
# e.g. a Mentor who is also a HoD).
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(SAEnum(RoleName), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    users = relationship("User", secondary=user_roles, back_populates="roles")


class User(Base):
    """An authorized human responder / administrator of the system."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Scoping: which department/course a Mentor/HoD is responsible for.
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    roles = relationship("Role", secondary=user_roles, back_populates="users")
    department = relationship("Department", back_populates="users")

    def has_role(self, role_name: RoleName) -> bool:
        return any(r.name == role_name for r in self.roles)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)

    courses = relationship("Course", back_populates="department")
    students = relationship("Student", back_populates="department")
    users = relationship("User", back_populates="department")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    department = relationship("Department", back_populates="courses")
    students = relationship("Student", back_populates="course")


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True)
    label = Column(String(40), unique=True, nullable=False)   # e.g. "2025-Odd", "2026-Even"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)


class Student(Base):
    """
    Minimal identifying information by design (privacy §27).
    A student_code (e.g. S101) is used as the primary human-facing
    identifier rather than exposing full personal details across the system.
    """
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)
    student_code = Column(String(20), unique=True, nullable=False, index=True)  # e.g. "S101"
    year = Column(Integer, nullable=False)          # 1..4
    section = Column(String(10), nullable=True)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="students")
    course = relationship("Course", back_populates="students")

    baselines = relationship("StudentBaseline", back_populates="student", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="student", cascade="all, delete-orphan")
