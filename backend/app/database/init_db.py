"""
Database initialization.

For this prototype we use SQLAlchemy's create_all() rather than a full
Alembic migration chain, to keep "run it locally in 2 minutes" friction
low. A `migrations/` folder using Alembic is the recommended next step
for a real deployment (see README "Future improvements").

Run directly:
    python -m app.database.init_db
"""
from app.database.session import Base, engine, SessionLocal
from app import models  # noqa: F401  (import registers all tables on Base.metadata)
from app.models.core import Role, RoleName
from app.models.governance import ThresholdConfig
from app.config.settings import get_settings


DEFAULT_THRESHOLDS = None  # populated below from Settings so there is a single source of truth


def _default_threshold_rows(settings):
    return [
        # key, value, category, description
        ("BASELINE_MIN_DATA_POINTS", settings.BASELINE_MIN_DATA_POINTS, "baseline",
         "Minimum weeks of history required before a baseline is considered confident."),
        ("BASELINE_ROLLING_WINDOW", settings.BASELINE_ROLLING_WINDOW, "baseline",
         "Rolling window size (in weeks) used for rolling mean/std baseline."),

        ("ATTENDANCE_SUSTAINED_WEEKS", settings.ATTENDANCE_SUSTAINED_WEEKS, "deviation",
         "Consecutive weeks of decline required to treat an attendance dip as sustained."),
        ("ATTENDANCE_DEVIATION_PCT_LOW", settings.ATTENDANCE_DEVIATION_PCT_LOW, "deviation",
         "Attendance deviation %% at/above which signal strength = weak."),
        ("ATTENDANCE_DEVIATION_PCT_MEDIUM", settings.ATTENDANCE_DEVIATION_PCT_MEDIUM, "deviation",
         "Attendance deviation %% at/above which signal strength = moderate."),
        ("ATTENDANCE_DEVIATION_PCT_HIGH", settings.ATTENDANCE_DEVIATION_PCT_HIGH, "deviation",
         "Attendance deviation %% at/above which signal strength = strong."),

        ("MARKS_DEVIATION_PCT_LOW", settings.MARKS_DEVIATION_PCT_LOW, "deviation", "Marks deviation weak threshold."),
        ("MARKS_DEVIATION_PCT_MEDIUM", settings.MARKS_DEVIATION_PCT_MEDIUM, "deviation", "Marks deviation moderate threshold."),
        ("MARKS_DEVIATION_PCT_HIGH", settings.MARKS_DEVIATION_PCT_HIGH, "deviation", "Marks deviation strong threshold."),

        ("ASSIGNMENT_DEVIATION_PCT_LOW", settings.ASSIGNMENT_DEVIATION_PCT_LOW, "deviation", "Assignment submission-rate deviation weak threshold."),
        ("ASSIGNMENT_DEVIATION_PCT_MEDIUM", settings.ASSIGNMENT_DEVIATION_PCT_MEDIUM, "deviation", "Assignment submission-rate deviation moderate threshold."),
        ("ASSIGNMENT_DEVIATION_PCT_HIGH", settings.ASSIGNMENT_DEVIATION_PCT_HIGH, "deviation", "Assignment submission-rate deviation strong threshold."),

        ("WEIGHT_ATTENDANCE_DECLINE", settings.WEIGHT_ATTENDANCE_DECLINE, "weight", "Score weight for an attendance decline signal."),
        ("WEIGHT_MARKS_DECLINE", settings.WEIGHT_MARKS_DECLINE, "weight", "Score weight for a marks decline signal."),
        ("WEIGHT_ASSIGNMENT_DECLINE", settings.WEIGHT_ASSIGNMENT_DECLINE, "weight", "Score weight for an assignment decline signal."),
        ("WEIGHT_ENGAGEMENT_DECLINE", settings.WEIGHT_ENGAGEMENT_DECLINE, "weight", "Score weight for an engagement decline signal."),
        ("WEIGHT_BACKLOG_INCREASE", settings.WEIGHT_BACKLOG_INCREASE, "weight", "Score weight for a backlog increase signal."),
        ("WEIGHT_FEE_ISSUE", settings.WEIGHT_FEE_ISSUE, "weight", "Score weight for a fee/payment issue signal."),
        ("WEIGHT_BEHAVIOUR_CHANGE", settings.WEIGHT_BEHAVIOUR_CHANGE, "weight", "Score weight for an authorized behaviour observation."),
        ("WEIGHT_LIBRARY_DECLINE", settings.WEIGHT_LIBRARY_DECLINE, "weight", "Score weight for a library/campus-usage decline signal."),

        ("SEVERITY_LOW_MAX", settings.SEVERITY_LOW_MAX, "severity", "Max warning_score still classified LOW."),
        ("SEVERITY_MEDIUM_MAX", settings.SEVERITY_MEDIUM_MAX, "severity", "Max warning_score still classified MEDIUM (above => HIGH)."),

        ("RESPONSE_WINDOW_HIGH_HOURS", settings.RESPONSE_WINDOW_HIGH_HOURS, "response_window", "Response deadline (hours) for HIGH severity alerts."),
        ("RESPONSE_WINDOW_MEDIUM_HOURS", settings.RESPONSE_WINDOW_MEDIUM_HOURS, "response_window", "Response deadline (hours) for MEDIUM severity alerts."),
        ("RESPONSE_WINDOW_LOW_HOURS", settings.RESPONSE_WINDOW_LOW_HOURS, "response_window", "Response deadline (hours) for LOW severity alerts."),
    ]


def init_db(drop_first: bool = False):
    if drop_first:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    db = SessionLocal()
    try:
        # Seed roles
        existing_roles = {r.name for r in db.query(Role).all()}
        for role_name in RoleName:
            if role_name not in existing_roles:
                db.add(Role(name=role_name, description=f"{role_name.value} role"))
        db.commit()

        # Seed default threshold configs (only if table empty, so we never
        # clobber admin-modified values on repeated startup)
        if db.query(ThresholdConfig).count() == 0:
            for key, value, category, description in _default_threshold_rows(settings):
                db.add(ThresholdConfig(key=key, value=float(value), category=category, description=description))
            db.commit()

        # Seed demo users
        from app.models.core import User, Department
        from app.auth.security import get_password_hash

        roles_by_name = {r.name: r for r in db.query(Role).all()}
        cse_dept = db.query(Department).filter_by(code="CSE").first()
        dept_id = cse_dept.id if cse_dept else None

        demo_users = [
            ("admin", "System Administrator", "admin@university.edu", "adminpassword", RoleName.ADMIN, None),
            ("mentor_cse", "Prof. Alan Turing", "mentor.cse@university.edu", "mentorpassword", RoleName.MENTOR, dept_id),
            ("hod_cse", "Dr. Grace Hopper", "hod.cse@university.edu", "hodpassword", RoleName.HOD, dept_id),
            ("dean_academics", "Dean John von Neumann", "dean@university.edu", "deanpassword", RoleName.DEAN, None),
            ("counsellor", "Dr. Carl Rogers", "counsellor@university.edu", "counsellorpassword", RoleName.COUNSELLOR, None),
            ("finance_officer", "Sarah Jenkins", "finance@university.edu", "financepassword", RoleName.FINANCE_SUPPORT, None),
            ("principal", "Dr. Ada Lovelace", "principal@university.edu", "principalpassword", RoleName.PRINCIPAL, None),
        ]

        for username, full_name, email, password, role_name, d_id in demo_users:
            u = db.query(User).filter_by(username=username).first()
            if not u:
                u = User(
                    username=username,
                    full_name=full_name,
                    email=email,
                    hashed_password=get_password_hash(password),
                    is_active=True,
                    department_id=d_id,
                )
                role_obj = roles_by_name.get(role_name)
                if role_obj:
                    u.roles.append(role_obj)
                db.add(u)
        db.commit()

        print("[init_db] Tables created, defaults seeded, and demo users created.")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

