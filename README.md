# Agent 69 — Early Warning Agent
### Production-Style Prototype for University Student-Support Early-Warning System

Agent 69 is an explainable, human-in-the-loop early-warning system designed for higher education institutions. It detects meaningful changes in student behaviour by comparing each student against their **own historical personal baseline**—never merely against class or peer averages. It correlates multiple independent signals (attendance, internal assessment marks, assignments, academic LMS engagement, financial fees, backlogs, authorized staff observations, and library usage) to surface observed patterns requiring authorized human review.

---

> ### ⚠️ Critical Safety & Ethical Mandate
> **Agent 69 is an early-warning assistant, NOT an autonomous decision-making system.**
> The AI and detection engines NEVER:
> - Diagnose a student
> - Claim a student definitely has a problem or medical condition
> - Automatically punish or discipline a student
> - Automatically fail, suspend, or blacklist a student
> - Make final risk decisions or invent unsupported evidence
> 
> Every alert explicitly communicates that it is an **observed pattern requiring human review**. Final outcomes and intervention decisions can only be recorded by authorized human responders.

---

## 1. System Architecture

```
External University Data Adapters (SIS, LMS, Attendance, Exam, Finance, Library)
                                   │
                                   ▼
                Raw Signal Tables (8 independent signals)
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AGENT 69 ORCHESTRATION PIPELINE                       │
│                                                                              │
│  1. Personal Baseline Engine    → Historical mean, median, rolling mean/std  │
│  2. Deviation Detection Engine  → Sustained & sudden decline threshold scan │
│  3. Multi-Signal Correlator     → Configurable weighted scoring & filtering  │
│  4. Warning Classifier          → Academic, Disengagement, Financial, Health│
│  5. Severity & Urgency Engine   → LOW/MED/HIGH bands, ROUTINE/PROMPT/IMMED  │
│  6. Responder Routing Engine    → Mentor, HoD, Counsellor, Finance, Dean     │
│  7. Alert Generation & Audit    → Exact explainability breakdown & evidence  │
│  8. SLA Escalation Engine       → Automatic response deadline monitoring     │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          HUMAN-IN-THE-LOOP RESPONSE                          │
│                                                                              │
│  Authorized Responder Review → Acknowledge → Add Observation Note            │
│  → Record Action Taken → Resolve with Human Outcome / False Positive         │
│  → Semester Calibration Analysis → Admin-Approved Threshold Recalibration   │
│  → Leadership Curricular Risk Reports (Course Concentration Analytics)       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

```
agent69/
├── backend/
│   ├── app/
│   │   ├── api/                 # REST API endpoints
│   │   │   ├── auth.py              # Login, token validation, demo users
│   │   │   ├── students.py          # Directory, personal baselines, 12-week signals
│   │   │   ├── alerts.py            # Alert lifecycle (ack, notes, actions, resolve)
│   │   │   ├── agent.py             # Agent 69 execution & synthetic data generator
│   │   │   ├── dashboard.py         # 8 metric cards + 10 analytical charts
│   │   │   ├── reports.py           # Institutional leadership intelligence
│   │   │   ├── calibration.py       # Semester precision & threshold approval
│   │   │   ├── settings.py          # Database-backed threshold & weight configs
│   │   │   └── audit.py             # Tamper-evident audit trail
│   │   ├── auth/                # Direct bcrypt hashing, JWT tokens, RBAC dependencies
│   │   ├── config/              # Central pydantic settings (settings.py)
│   │   ├── database/            # SQLAlchemy session and schema seeding (init_db.py)
│   │   ├── engines/             # Core deterministic engines
│   │   │   ├── baseline_engine.py      # Personal baseline computation
│   │   │   ├── deviation_engine.py     # Independent signal deviation detectors
│   │   │   ├── correlation_engine.py   # Multi-signal weighted scoring & noise filter
│   │   │   ├── classification_engine.py# Warning category classifier
│   │   │   ├── severity_engine.py      # Severity, urgency, and SLA deadlines
│   │   │   ├── responder_engine.py     # Responder role and department routing
│   │   │   ├── alert_engine.py         # Explainability narrative and evidence
│   │   │   ├── escalation_engine.py    # SLA response deadline escalation
│   │   │   ├── calibration_engine.py   # Semester precision & recommendations
│   │   │   └── reporting_engine.py     # Leadership curricular concentration reports
│   │   ├── agents/
│   │   │   └── agent69.py              # Main Agent 69 orchestrator
│   │   ├── models/              # SQLAlchemy 2.0 relational models (24 tables)
│   │   │   ├── core.py                 # Departments, Courses, Semesters, Students, Users, Roles
│   │   │   ├── signals.py              # StudentBaseline + 8 raw signal tables + WarningSignal
│   │   │   ├── alerts.py               # Alert, AlertEvidence, AlertResponse, AlertEscalation, AlertOutcome
│   │   │   └── governance.py           # ThresholdConfig, CalibrationRun, AuditLog
│   │   ├── schemas/             # Pydantic request/response validation models
│   │   ├── services/
│   │   │   ├── adapters/               # External SIS, LMS, Exam, Finance adapter interfaces
│   │   │   ├── synthetic_data.py       # Deterministic 120-student scenario generator
│   │   │   ├── alert_workflow_service.py # Human workflow state machine
│   │   │   └── audit_service.py        # Central audit logging
│   │   └── main.py              # FastAPI application entry point with CORS
│   ├── tests/                   # Pytest automated test suite (23 passing tests)
│   │   ├── conftest.py                 # In-memory test db fixture with StaticPool
│   │   ├── test_baseline_engine.py     # Baseline mathematical correctness
│   │   ├── test_mandatory_scenarios.py # Mandatory Scenarios 1 through 10
│   │   └── test_api_endpoints.py       # REST API endpoints & RBAC verification
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                    # Vite + React 19 + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── components/          # Sidebar, Navbar, Badges, RunAgentModal, Layout
│   │   ├── contexts/            # AuthContext (JWT session, RBAC checks)
│   │   ├── pages/               # Login, Dashboard, Students, StudentDetail, Alerts, AlertDetail, Responders, Reports, Calibration, Settings, AuditLogs
│   │   ├── services/            # Axios API client with JWT interceptor
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx              # React Router route definitions & guards
│   │   └── index.css            # Clean modern design system
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml           # PostgreSQL + Backend + Frontend
└── README.md
```

---

## 3. How to Run the Application

### Option A: Local Development (Quickstart)

#### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m pip install -r requirements.txt
python -m app.database.init_db        # Create SQLite tables and seed demo users
python -m app.services.synthetic_data # Generate 120 synthetic students across 12 weeks
python -m uvicorn app.main:app --port 8000
```
Backend API will be accessible at: `http://localhost:8000`  
Swagger API Documentation: `http://localhost:8000/docs`

#### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev -- --port 5173
```
Frontend web dashboard will be accessible at: `http://localhost:5173`

---

### Option B: Docker Compose
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 4. Demo Login Credentials (RBAC Evaluation)

The system includes pre-seeded demo accounts with 1-click login pills on the `/login` page:

| Role | Username | Password | Access Scope & Responsibilities |
|---|---|---|---|
| **ADMIN** | `admin` | `adminpassword` | Full institutional visibility, threshold configuration, calibration approval |
| **MENTOR** | `mentor_cse` | `mentorpassword` | CSE department student check-ins, routine academic and disengagement alerts |
| **HOD** | `hod_cse` | `hodpassword` | Department-wide oversight, Tier 1 escalation handling, high severity alerts |
| **DEAN** | `dean_academics` | `deanpassword` | Cross-department aggregate reports, curricular concentration, Tier 2 escalations |
| **COUNSELLOR** | `counsellor` | `counsellorpassword` | Confidential student personal and health check-ins (isolated from finance) |
| **FINANCE_SUPPORT** | `finance_officer` | `financepassword` | Tuition arrears and fee support routing (restricted from counselling data) |
| **PRINCIPAL** | `principal` | `principalpassword` | Executive university governance and policy oversight |

---

## 5. Running Agent 69 & Synthetic Data

### From the Web Dashboard:
1. Log in to `http://localhost:5173`.
2. Click the **"Run Agent 69"** button in the top navigation bar.
3. Select the target week (e.g. Week 12) and baseline cutoff (Weeks 1–4).
4. Click **"Run Agent 69"** to orchestrate baseline evaluation, deviation detection, and alert creation.
5. Alternatively, click **"Re-seed 120 Students"** to regenerate the deterministic scenario dataset.

### From the Command Line / REST API:
```bash
# Trigger cohort evaluation via API:
curl -X POST http://localhost:8000/api/agent/run \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"week_number": 12, "baseline_cutoff_week": 4}'
```

---

## 6. Automated Test Suite & Mandatory Scenarios

Run the complete test suite:
```bash
cd backend
python -m pytest tests/ -v
```

All 23 automated tests pass, verifying the **10 mandatory scenarios** from the project specification:

| Scenario | Test Function | Expected Outcome | Status |
|---|---|---|---|
| **Scenario 1** | `test_scenario_1_single_week_attendance_drop_no_major_warning` | Attendance drops for only 1 week (TEMP_DIP) -> No high severity warning produced | **PASSED** |
| **Scenario 2** | `test_scenario_2_attendance_decreases_3_consecutive_weeks` | 3 consecutive weeks of attendance decline -> Sustained deviation signal detected | **PASSED** |
| **Scenario 3** | `test_scenario_3_attendance_marks_assignments_drop` | Attendance ↓ + Marks ↓ + Assignments ↓ -> `ACADEMIC_DIFFICULTY` alert generated | **PASSED** |
| **Scenario 4** | `test_scenario_4_attendance_and_engagement_drop` | Attendance ↓ + LMS Engagement ↓ -> `DISENGAGEMENT` alert generated | **PASSED** |
| **Scenario 5** | `test_scenario_5_fee_issue_and_attendance_decline` | Fee overdue + Attendance decline -> `FINANCIAL_DIFFICULTY` alert generated | **PASSED** |
| **Scenario 6** | `test_scenario_6_only_one_weak_signal_no_high_severity` | Only one weak isolated signal -> Filtered out / No HIGH severity alert | **PASSED** |
| **Scenario 7** | `test_scenario_7_multiple_strong_sustained_signals` | Multiple strong sustained declines -> High severity human review alert | **PASSED** |
| **Scenario 8** | `test_scenario_8_alert_ignored_beyond_deadline_escalates` | Response deadline unaddressed -> Tiered escalation triggered and logged | **PASSED** |
| **Scenario 9** | `test_scenario_9_human_marks_false_positive` | Alert marked false positive -> Outcome stored & calibration FP rate updated | **PASSED** |
| **Scenario 10** | `test_scenario_10_semester_ends_calibration_generated` | Semester end -> Calibration report generated with threshold proposals | **PASSED** |

---

## 7. Important REST API Endpoints

- `POST /api/auth/login` — Authenticate and receive JWT bearer token
- `GET /api/auth/me` — Current authenticated user profile and roles
- `GET /api/auth/demo-users` — Quick-reference list of demo accounts
- `GET /api/dashboard` — Executive summary cards and 10 analytical datasets
- `GET /api/students` — Filterable student directory
- `GET /api/students/{id}` — Student profile, personal baselines, and signal comparison
- `GET /api/students/{id}/signals` — 12-week time-series trends for charting
- `GET /api/alerts` — Role-filtered early-warning alert queue
- `GET /api/alerts/{id}` — Full explainability evidence audit breakdown
- `POST /api/alerts/{id}/acknowledge` — Human responder acknowledgment
- `POST /api/alerts/{id}/response` — Append observation notes
- `POST /api/alerts/{id}/action` — Record staff intervention action
- `POST /api/alerts/{id}/resolve` — Final human outcome resolution
- `POST /api/alerts/{id}/false-positive` — Record false positive with reason
- `POST /api/alerts/{id}/escalate` — Escalate to higher role tier
- `POST /api/agent/run` — Execute Agent 69 early-warning pipeline
- `GET /api/reports` — Curricular concentration and leadership analytics
- `GET /api/calibration` — Semester calibration runs
- `POST /api/calibration/run` — Run empirical calibration analysis
- `POST /api/calibration/{id}/approve` — Administrator approval of threshold changes
- `GET /api/settings` — View all database-backed threshold configs and weights
- `PUT /api/settings/{id}` — Update threshold value (Admin only)
- `GET /api/audit-logs` — Tamper-evident audit log trail

---

## 8. Known Limitations & Future Improvements

### Current Prototype Limitations:
- Relies on SQLite by default for zero-friction local execution; production deployments should switch the `DATABASE_URL` environment variable to PostgreSQL via Docker.
- Synthetic data generates 120 students across 12 academic weeks; real university scale might involve 10,000+ students.

### Recommended Future Improvements:
- **Alembic Migrations**: Transition from `Base.metadata.create_all()` to formal versioned Alembic database migration scripts.
- **External Adapter Integrations**: Implement live REST/OAuth2 connectors for Canvas LMS, Moodle, Ellucian Banner, and Blackboard.
- **Automated Webhooks / Email Alerts**: Send Slack, Teams, or institutional email notifications to mentors when urgent alerts are generated or escalated.
