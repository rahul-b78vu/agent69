"""
Synthetic data generator (Step 4).

Generates a realistic, reproducible dataset for demoing and testing
Agent 69, WITHOUT pretending any real university system is connected
(see spec §21 / §28).

Design:
    - 3 departments, several courses each, 1 active semester.
    - ~120 students distributed across departments/courses/years/sections.
    - 12 weeks of weekly signal data per student across all signal types.
    - Weeks 1-4 are a stable "baseline formation" period (small noise only)
      for every student, regardless of profile - this is what the Baseline
      Engine will later learn from.
    - From week 5 onward, each student's PROFILE determines whether/how
      their signals deviate from their own baseline. Profiles intentionally
      include:
        * NORMAL                    - stays close to baseline (noise only)
        * ATTENDANCE_DECLINE        - sustained attendance drop only
        * MARKS_DECLINE             - sustained marks drop only
        * ASSIGNMENT_DECLINE        - sustained submission-rate drop only
        * ENGAGEMENT_DECLINE        - sustained LMS/portal drop only
        * FINANCIAL_SIGNAL          - fee overdue starting mid-semester
        * BACKLOG_INCREASE          - new backlogs accumulate
        * COMBO_ACADEMIC            - attendance + marks + assignment decline together
        * COMBO_DISENGAGEMENT       - attendance + engagement + library decline together
        * COMBO_FINANCIAL           - fee issue + attendance decline together
        * TEMP_DIP                  - ONE WEEK ONLY attendance dip, then recovers
                                       (must NOT trigger a significant alert - false
                                       positive test case, spec §28/§29 Scenario 1)

Run directly:
    python -m app.services.synthetic_data
"""
import random
from datetime import datetime, timedelta

import numpy as np

from app.database.session import SessionLocal, Base, engine
from app import models  # noqa: F401
from app.models.core import Department, Course, Semester, Student
from app.models.signals import (
    AttendanceRecord, AssessmentRecord, AssignmentRecord, EngagementRecord,
    FinancialRecord, BacklogRecord, LibraryRecord, BehaviourRecord,
)

SEED = 42
NUM_WEEKS = 12
BASELINE_WEEKS = 4          # weeks 1..4 = stable baseline-formation period

DEPARTMENTS = [
    ("Computer Science", "CSE"),
    ("Electronics & Communication", "ECE"),
    ("Mechanical Engineering", "MECH"),
]

COURSES_PER_DEPT = {
    "CSE": [("B.Tech CSE - Core", "CSE-CORE"), ("B.Tech CSE - AI/ML", "CSE-AIML")],
    "ECE": [("B.Tech ECE - Core", "ECE-CORE"), ("B.Tech ECE - VLSI", "ECE-VLSI")],
    "MECH": [("B.Tech Mechanical", "MECH-CORE")],
}

PROFILES = [
    "NORMAL", "NORMAL", "NORMAL", "NORMAL", "NORMAL", "NORMAL",   # weighted common
    "ATTENDANCE_DECLINE",
    "MARKS_DECLINE",
    "ASSIGNMENT_DECLINE",
    "ENGAGEMENT_DECLINE",
    "FINANCIAL_SIGNAL",
    "BACKLOG_INCREASE",
    "COMBO_ACADEMIC",
    "COMBO_DISENGAGEMENT",
    "COMBO_FINANCIAL",
    "TEMP_DIP",
]


def clamp(value, lo=0.0, hi=100.0):
    return max(lo, min(hi, value))


def week_start(base_date: datetime, week_number: int) -> datetime:
    return base_date + timedelta(weeks=week_number - 1)


def generate_student_profile_series(profile: str, rng: np.random.Generator):
    """
    Returns per-week dicts of raw signal values for one student across
    NUM_WEEKS weeks, driven by `profile`. Baseline weeks (1..BASELINE_WEEKS)
    are always stable/noisy-only so the Baseline Engine has clean history.
    """
    # --- personal baseline levels (this IS the student's own "normal") ---
    base_attendance = rng.uniform(82, 96)
    base_marks = rng.uniform(60, 88)
    base_submission = rng.uniform(80, 98)
    base_engagement = rng.uniform(50, 90)
    base_library = rng.uniform(1, 6)

    weeks = {}
    backlog_count = int(rng.integers(0, 2))  # most students start with 0-1 backlog

    for w in range(1, NUM_WEEKS + 1):
        attendance = base_attendance + rng.normal(0, 1.5)
        marks = base_marks + rng.normal(0, 2.0)
        submission = base_submission + rng.normal(0, 2.5)
        engagement = base_engagement + rng.normal(0, 4.0)
        library = max(0, base_library + rng.normal(0, 1.0))
        amount_overdue = 0.0
        days_overdue = 0
        new_backlog = 0

        post_baseline = w > BASELINE_WEEKS
        weeks_into_decline = w - BASELINE_WEEKS  # 1,2,3... after baseline period

        if post_baseline and profile == "ATTENDANCE_DECLINE":
            attendance -= min(weeks_into_decline * 5.0, 30)

        elif post_baseline and profile == "MARKS_DECLINE":
            marks -= min(weeks_into_decline * 4.5, 30)

        elif post_baseline and profile == "ASSIGNMENT_DECLINE":
            submission -= min(weeks_into_decline * 6.0, 45)

        elif post_baseline and profile == "ENGAGEMENT_DECLINE":
            engagement -= min(weeks_into_decline * 7.0, 55)
            library -= min(weeks_into_decline * 0.5, 4)

        elif post_baseline and profile == "FINANCIAL_SIGNAL":
            if w >= BASELINE_WEEKS + 3:
                amount_overdue = 15000 + weeks_into_decline * 1500
                days_overdue = (weeks_into_decline - 2) * 7
                attendance -= min((weeks_into_decline - 2) * 1.5, 8)  # mild secondary effect

        elif post_baseline and profile == "BACKLOG_INCREASE":
            if w in (BASELINE_WEEKS + 3, BASELINE_WEEKS + 6, BASELINE_WEEKS + 8):
                new_backlog = 1
                backlog_count += 1

        elif post_baseline and profile == "COMBO_ACADEMIC":
            attendance -= min(weeks_into_decline * 5.5, 32)
            marks -= min(weeks_into_decline * 4.8, 30)
            submission -= min(weeks_into_decline * 7.0, 45)
            if w in (BASELINE_WEEKS + 4, BASELINE_WEEKS + 7):
                new_backlog = 1
                backlog_count += 1

        elif post_baseline and profile == "COMBO_DISENGAGEMENT":
            attendance -= min(weeks_into_decline * 4.5, 28)
            engagement -= min(weeks_into_decline * 7.5, 55)
            library -= min(weeks_into_decline * 0.6, 4)

        elif post_baseline and profile == "COMBO_FINANCIAL":
            if w >= BASELINE_WEEKS + 2:
                amount_overdue = 18000 + weeks_into_decline * 2000
                days_overdue = (weeks_into_decline - 1) * 7
            attendance -= min(weeks_into_decline * 3.5, 22)

        elif profile == "TEMP_DIP" and w == BASELINE_WEEKS + 1:
            # Exactly ONE week dip, must recover immediately after (false-positive test)
            attendance -= 18

        weeks[w] = dict(
            attendance_pct=clamp(attendance),
            marks_pct=clamp(marks),
            submission_rate_pct=clamp(submission),
            engagement_score=clamp(engagement),
            library_visits=max(0, round(library)),
            amount_due=25000.0,
            amount_overdue=round(max(0.0, amount_overdue), 2),
            days_overdue=max(0, int(days_overdue)),
            backlog_count=backlog_count,
            new_backlogs_this_period=new_backlog,
        )

    return weeks


def generate_synthetic_dataset(num_students: int = 120, drop_first: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    rng = np.random.default_rng(SEED)
    random.seed(SEED)

    try:
        # --- wipe prior synthetic data so this is idempotent/repeatable ---
        if drop_first:
            for model in [
                AttendanceRecord, AssessmentRecord, AssignmentRecord, EngagementRecord,
                FinancialRecord, BacklogRecord, LibraryRecord, BehaviourRecord,
            ]:
                db.query(model).delete()
            db.query(Student).delete()
            db.query(Course).delete()
            db.query(Department).delete()
            db.query(Semester).delete()
            db.commit()

        # --- departments & courses ---
        dept_objs = {}
        for name, code in DEPARTMENTS:
            existing = db.query(Department).filter_by(code=code).first()
            dept_objs[code] = existing or Department(name=name, code=code)
            if not existing:
                db.add(dept_objs[code])
        db.commit()

        course_objs = []
        for dept_code, course_list in COURSES_PER_DEPT.items():
            for name, code in course_list:
                existing = db.query(Course).filter_by(code=code).first()
                c = existing or Course(name=name, code=code, department_id=dept_objs[dept_code].id)
                if not existing:
                    db.add(c)
                course_objs.append((dept_code, c))
        db.commit()

        # --- active semester ---
        semester = db.query(Semester).filter_by(label="2026-Odd").first()
        if not semester:
            start = datetime(2026, 7, 1)
            semester = Semester(label="2026-Odd", start_date=start,
                                 end_date=start + timedelta(weeks=NUM_WEEKS), is_active=True)
            db.add(semester)
            db.commit()
        base_date = semester.start_date

        # --- students ---
        students_created = []
        profile_assignment = {}
        # guarantee at least 2 of each *non-NORMAL* profile appear, spread the rest randomly
        must_have = [p for p in set(PROFILES) if p != "NORMAL"]
        forced = must_have * 2
        remaining_slots = num_students - len(forced)
        random_profiles = [rng.choice(PROFILES) for _ in range(max(0, remaining_slots))]
        all_profiles = forced + list(random_profiles)
        rng.shuffle(all_profiles)
        all_profiles = all_profiles[:num_students]

        existing_max = db.query(Student).count()
        for i in range(num_students):
            student_code = f"S{101 + existing_max + i}"
            dept_code, course = course_objs[i % len(course_objs)]
            year = int(rng.integers(1, 5))
            section = random.choice(["A", "B", "C"])
            profile = all_profiles[i]

            student = Student(
                student_code=student_code,
                year=year,
                section=section,
                department_id=dept_objs[dept_code].id,
                course_id=course.id,
                is_active=True,
            )
            db.add(student)
            db.flush()  # get student.id without full commit
            students_created.append(student)
            profile_assignment[student.id] = profile

        db.commit()

        # --- weekly signal records ---
        for student in students_created:
            profile = profile_assignment[student.id]
            series = generate_student_profile_series(profile, rng)

            for w in range(1, NUM_WEEKS + 1):
                pstart = week_start(base_date, w)
                vals = series[w]

                db.add(AttendanceRecord(student_id=student.id, week_number=w, period_start=pstart,
                                         attendance_pct=vals["attendance_pct"]))
                db.add(AssessmentRecord(student_id=student.id, week_number=w, period_start=pstart,
                                         assessment_name=f"Internal Assessment W{w}",
                                         marks_pct=vals["marks_pct"]))
                due = 3
                submitted = round(due * vals["submission_rate_pct"] / 100.0)
                db.add(AssignmentRecord(student_id=student.id, week_number=w, period_start=pstart,
                                         assignments_due=due, assignments_submitted=submitted,
                                         submission_rate_pct=vals["submission_rate_pct"]))
                db.add(EngagementRecord(student_id=student.id, week_number=w, period_start=pstart,
                                         lms_logins=max(0, round(vals["engagement_score"] / 10)),
                                         portal_logins=max(0, round(vals["engagement_score"] / 20)),
                                         engagement_score=vals["engagement_score"]))
                db.add(FinancialRecord(student_id=student.id, week_number=w, period_start=pstart,
                                        amount_due=vals["amount_due"], amount_overdue=vals["amount_overdue"],
                                        days_overdue=vals["days_overdue"],
                                        payment_delayed=vals["amount_overdue"] > 0))
                db.add(BacklogRecord(student_id=student.id, week_number=w, period_start=pstart,
                                      backlog_count=vals["backlog_count"],
                                      new_backlogs_this_period=vals["new_backlogs_this_period"]))
                db.add(LibraryRecord(student_id=student.id, week_number=w, period_start=pstart,
                                      library_visits=vals["library_visits"],
                                      resources_borrowed=max(0, vals["library_visits"] - 1),
                                      campus_system_logins=vals["library_visits"] + 2))
                # Behaviour records: only authorized, neutral, mostly empty (no flag)
                db.add(BehaviourRecord(student_id=student.id, week_number=w, period_start=pstart,
                                        observation_flag=False, observation_note=None))

            if len(students_created) and student.id % 20 == 0:
                db.commit()

        db.commit()

        print(f"[synthetic_data] Created {len(students_created)} students, "
              f"{len(course_objs)} courses, {NUM_WEEKS} weeks of records each.")
        # profile distribution summary
        from collections import Counter
        counts = Counter(profile_assignment.values())
        for k, v in sorted(counts.items()):
            print(f"    {k:22s}: {v}")
        return {"students": len(students_created), "profile_counts": dict(counts)}
    finally:
        db.close()


if __name__ == "__main__":
    generate_synthetic_dataset(num_students=120, drop_first=True)
