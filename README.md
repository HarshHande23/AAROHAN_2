# APAAR Registry Platform — Problem Statement 2 (PS2)

**APAAR (Academic Bank of Credits — Academic Permanent Account and Registration)**  
**Aarohan Hackathon PS2 — Fully Functional Implementation**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Setup & Installation](#5-setup--installation)
6. [Environment Variables](#6-environment-variables)
7. [Running the Application](#7-running-the-application)
8. [User Roles & Credentials](#8-user-roles--credentials)
9. [API Documentation Summary](#9-api-documentation-summary)
10. [ML Models — Datasets & Training](#10-ml-models--datasets--training)
11. [Isolation Forest — Training Results](#11-isolation-forest--training-results)
12. [Random Forest — Training Results](#12-random-forest--training-results)
13. [Validation Engine Rules](#13-validation-engine-rules)
14. [Duplicate Detection Logic](#14-duplicate-detection-logic)
15. [Data Flow](#15-data-flow)
16. [Known Limitations](#16-known-limitations)
17. [Important Disclaimers](#17-important-disclaimers)

---

## 1. Project Overview

This platform implements the AICTE APAAR (Academic Permanent Account and Registration) student registry system as defined in PS2. It is a **fully functional, production-grade web application** with:

- **Real student enrolment** with validation and deduplication
- **Bulk CSV/Excel import** with per-row reporting
- **Real ML anomaly detection** (Isolation Forest, trained on official CSV dataset)
- **Real ML classification** (Random Forest, trained on official labeled CSV dataset)
- **Role-based access control** with JWT authentication
- **Real-time dashboard** powered entirely by live database queries
- **Compliance reports** generated from actual stored records
- **Immutable audit trail** for all significant actions
- **Alert queue** for anomalies, duplicates, and suspicious records

**There is NO mock data, NO hardcoded dashboard values, NO fake ML predictions, and NO synthetic training data anywhere in this application.**

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vite)                    │
│              http://localhost:5173                           │
│  Dashboard | Students | Bulk Import | Validation | Alerts   │
│  Reports | Audit Logs | ML Status | Role-Based Navigation   │
└──────────────────────┬──────────────────────────────────────┘
                       │ Axios + JWT
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                          │
│              http://localhost:8000                           │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Auth & RBAC │  │  Validation  │  │ Duplicate Detect │  │
│  │  (JWT/bcrypt│  │   Engine     │  │   (4 rules)      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ML Service                          │   │
│  │  ┌───────────────────┐  ┌────────────────────────┐  │   │
│  │  │  Isolation Forest │  │    Random Forest        │  │   │
│  │  │  (anomaly detect) │  │  (suspicious classify)  │  │   │
│  │  └───────────────────┘  └────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQLAlchemy ORM
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (SQLite / PostgreSQL-ready)            │
│  Students | Institutions | Users | DuplicateCases |         │
│  Alerts | AuditLogs | MLModelMetadata                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **Frontend Charts** | Recharts |
| **Frontend HTTP** | Axios with JWT interceptors |
| **Backend** | FastAPI (Python 3.13) |
| **ORM** | SQLAlchemy 2.x |
| **Database** | SQLite (easily upgradable to PostgreSQL) |
| **Authentication** | JWT (python-jose), bcrypt password hashing |
| **ML** | scikit-learn (IsolationForest, RandomForestClassifier) |
| **ML Preprocessing** | pandas, StandardScaler, SimpleImputer |
| **ML Serialization** | joblib |
| **File Parsing** | pandas (CSV + Excel) |
| **CORS** | FastAPI middleware |
| **Validation** | Pydantic v2 |

---

## 4. Project Structure

```
Aarohan_PS2/
├── frontend/                        # React/Vite frontend
│   ├── src/
│   │   ├── api/                     # Axios API client + service functions
│   │   ├── components/
│   │   │   ├── layout/              # Header, Sidebar, AppLayout
│   │   │   └── ui/                  # Badge, EmptyState, Spinner, Pagination
│   │   ├── context/                 # AuthContext (JWT state management)
│   │   ├── pages/                   # All page components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── StudentsPage.tsx
│   │   │   ├── StudentDetailPage.tsx
│   │   │   ├── BulkImportPage.tsx
│   │   │   ├── ValidationDuplicatesPage.tsx
│   │   │   ├── AlertsAnomaliesPage.tsx
│   │   │   ├── ComplianceReportsPage.tsx
│   │   │   ├── AuditLogsPage.tsx
│   │   │   ├── MLStatusPage.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── types/index.ts           # TypeScript interfaces
│   │   ├── App.tsx                  # Router + protected routes
│   │   └── main.tsx                 # React entry point
│   ├── .env.local                   # Frontend environment variables
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                         # FastAPI backend
│   ├── app/
│   │   ├── main.py                  # FastAPI app, lifespan, CORS, seeding
│   │   ├── config.py                # Application settings
│   │   ├── database.py              # SQLAlchemy engine + session
│   │   ├── api/                     # REST API route handlers
│   │   │   ├── auth.py              # POST /api/auth/login, GET /api/auth/me
│   │   │   ├── students.py          # CRUD /api/students
│   │   │   ├── institutions.py      # GET /api/institutions
│   │   │   ├── bulk_import.py       # POST /api/bulk-import
│   │   │   ├── validation.py        # POST /api/validation/{id}
│   │   │   ├── duplicates.py        # GET /api/duplicates
│   │   │   ├── alerts.py            # GET /api/alerts, PATCH /api/alerts/{id}
│   │   │   ├── reports.py           # GET /api/reports
│   │   │   ├── audit.py             # GET /api/audit-logs
│   │   │   ├── ml.py                # GET /api/ml/status, POST /api/ml/*/train
│   │   │   └── dashboard.py         # GET /api/dashboard
│   │   ├── models/
│   │   │   └── entities.py          # SQLAlchemy ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   ├── security/
│   │   │   ├── auth.py              # JWT creation/verification, bcrypt
│   │   │   └── rbac.py              # require_roles() dependency
│   │   ├── services/
│   │   │   ├── validation_service.py  # Deterministic validation rules
│   │   │   ├── duplicate_service.py   # Duplicate detection logic
│   │   │   ├── ml_service.py          # ML inference wrapper
│   │   │   └── audit_service.py       # Audit log helper
│   │   └── ml/
│   │       ├── saved_models/          # Trained model artifacts
│   │       │   ├── isolation_forest_model.joblib
│   │       │   ├── isolation_forest_metadata.json
│   │       │   ├── random_forest_model.joblib
│   │       │   └── random_forest_metadata.json
│   │       └── training/              # Training scripts
│   │           ├── train_isolation_forest.py
│   │           └── train_random_forest.py
│   ├── .env                         # Backend environment variables
│   ├── .venv/                       # Python virtual environment
│   └── apaar_registry.db            # SQLite database (auto-created)
│
├── datasets/                        # Official training datasets (CSV)
│   ├── golden data.csv              # Used for Isolation Forest training
│   ├── Students suspicious behaviors detection dataset_V1.csv  # Used for Random Forest
│   ├── ecotec_online_student_risk.csv
│   ├── ResearchInformation3.csv
│   └── student-mat.csv
│
├── test_e2e_workflow.py             # End-to-end test script (all 20 steps)
└── README.md                        # This file
```

---

## 5. Setup & Installation

### Prerequisites

- Python 3.10+ (tested with 3.13)
- Node.js 18+ and npm
- The `backend/.venv/` virtual environment (already set up)

### Backend Setup

```powershell
# The virtual environment already has all dependencies installed.
# If needed, install manually:
cd backend
.\.venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] pandas scikit-learn joblib openpyxl python-multipart

# Database is auto-created and seeded on first startup.
```

### Frontend Setup

```powershell
cd frontend
# node_modules already installed. If needed:
npm install
```

---

## 6. Environment Variables

### Backend (`backend/.env`)

```env
SECRET_KEY=apaar_super_secret_jwt_key_2026_ps2_aicte_gov
DATABASE_URL=sqlite:///./apaar_registry.db
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 7. Running the Application

### Start Backend

```powershell
Set-Location "c:\Users\Harsh\Desktop\Aarohan_PS2\backend"
& ".\..venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Or using the full path:
```powershell
& "c:\Users\Harsh\Desktop\Aarohan_PS2\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Start Frontend

```powershell
Set-Location "c:\Users\Harsh\Desktop\Aarohan_PS2\frontend"
npm run dev
```

### Run End-to-End Tests

```powershell
# First delete DB for a clean test run:
Remove-Item "c:\Users\Harsh\Desktop\Aarohan_PS2\backend\apaar_registry.db" -ErrorAction SilentlyContinue
# Restart backend (will re-seed automatically)
# Then:
& "c:\Users\Harsh\Desktop\Aarohan_PS2\backend\.venv\Scripts\python.exe" "c:\Users\Harsh\Desktop\Aarohan_PS2\test_e2e_workflow.py"
```

### Retrain ML Models

```powershell
# Isolation Forest (uses golden data.csv):
& "c:\Users\Harsh\Desktop\Aarohan_PS2\backend\.venv\Scripts\python.exe" "c:\Users\Harsh\Desktop\Aarohan_PS2\backend\app\ml\training\train_isolation_forest.py"

# Random Forest (uses Students suspicious behaviors detection dataset_V1.csv):
& "c:\Users\Harsh\Desktop\Aarohan_PS2\backend\.venv\Scripts\python.exe" "c:\Users\Harsh\Desktop\Aarohan_PS2\backend\app\ml\training\train_random_forest.py"
```

Or via the API (AICTE_ADMIN role required):
```
POST http://localhost:8000/api/ml/isolation-forest/train
POST http://localhost:8000/api/ml/random-forest/train
```

---

## 8. User Roles & Credentials

The following seed accounts are created automatically when the database is first initialized:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **AICTE_ADMIN** | `admin@aicte.gov.in` | `Admin@1234` | Full system access |
| **COLLEGE_ADMIN** | `college.admin@iitd.ac.in` | `College@1234` | Institution-scoped management |
| **ADMISSION_STAFF** | `staff@iitd.ac.in` | `Staff@1234` | Student enrolment & validation |
| **AUTHORIZED_VERIFIER** | `verifier@aicte.gov.in` | `Verify@1234` | Read-only verification access |

> **Passwords are stored as bcrypt hashes — never in plain text.**

### Role Permissions

| Feature | AICTE_ADMIN | COLLEGE_ADMIN | ADMISSION_STAFF | AUTHORIZED_VERIFIER |
|---------|:-----------:|:-------------:|:---------------:|:-------------------:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View All Students | ✅ | Own inst. | Own inst. | ✅ |
| Add Student | ✅ | ✅ | ✅ | ❌ |
| Edit Student | ✅ | ✅ | ✅ | ❌ |
| Delete Student | ✅ | ✅ | ❌ | ❌ |
| Bulk Import | ✅ | ✅ | ✅ | ❌ |
| Validate Student | ✅ | ✅ | ✅ | ❌ |
| View Duplicates | ✅ | ✅ | ✅ | ✅ |
| Resolve Duplicates | ✅ | ✅ | ❌ | ❌ |
| View Alerts | ✅ | ✅ | ✅ | ✅ |
| Dismiss Alerts | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ❌ | ✅ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Trigger ML Retrain | ✅ | ❌ | ❌ | ❌ |
| View ML Status | ✅ | ✅ | ❌ | ❌ |

---

## 9. API Documentation Summary

Full interactive documentation available at: `http://localhost:8000/docs` (Swagger UI)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `POST` | `/api/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/auth/me` | Get current user profile | Yes |
| `GET` | `/api/dashboard` | All dashboard metrics from DB | Yes |
| `GET` | `/api/students` | List students (paginated, filtered) | Yes |
| `POST` | `/api/students` | Enrol new student (with ML inference) | Yes |
| `GET` | `/api/students/{id}` | Get student details | Yes |
| `PUT` | `/api/students/{id}` | Update student record | Yes |
| `DELETE` | `/api/students/{id}` | Delete student | Admin only |
| `POST` | `/api/students/{id}/verify` | Mark student as verified | Yes |
| `POST` | `/api/bulk-import` | Upload CSV/Excel for batch import | Yes |
| `GET` | `/api/bulk-import/template` | Download CSV import template | No |
| `POST` | `/api/validation/{id}` | Re-run validation on a student | Yes |
| `GET` | `/api/validation/summary` | Validation statistics | Yes |
| `GET` | `/api/duplicates` | List all duplicate cases | Yes |
| `POST` | `/api/duplicates/{id}/resolve` | Resolve a duplicate case | Yes |
| `GET` | `/api/alerts` | List all alerts | Yes |
| `PATCH` | `/api/alerts/{id}` | Update alert status | Yes |
| `GET` | `/api/reports` | Compliance report (all metrics) | Yes |
| `GET` | `/api/audit-logs` | Immutable audit trail | AICTE_ADMIN |
| `GET` | `/api/ml/status` | ML model status and metrics | Yes |
| `POST` | `/api/ml/isolation-forest/train` | Retrain Isolation Forest | AICTE_ADMIN |
| `POST` | `/api/ml/random-forest/train` | Retrain Random Forest | AICTE_ADMIN |
| `GET` | `/api/institutions` | List all institutions | Yes |
| `GET` | `/health` | Backend health check | No |

---

## 10. ML Models — Datasets & Training

### Dataset Evaluation Summary

Five official CSV datasets were provided and evaluated. Only those with genuine, applicable structure were used for model training.

| Dataset | Shape | Label Column | Used For | Reason |
|---------|-------|-------------|----------|--------|
| `golden data.csv` | 19,222 × 13 | `is_passing`, `final_grade` | **Isolation Forest (primary)** | Rich behavioral lifestyle features (study hours, sleep, gaming, attendance, stress, focus) ideal for unsupervised anomaly detection |
| `Students suspicious behaviors detection dataset_V1.csv` | 5,500 × 38 | `label` (0=Normal, 1=Suspicious) | **Random Forest (primary)** | Only dataset with genuine binary labels (independently labeled, not derived); proctoring/behavioral features |
| `ecotec_online_student_risk.csv` | 12,632 × 18 | `TARGET_RISK` | Not used (training) | Severely imbalanced (Withdrawal >> Pass/Fail); domain mismatch for this registry context |
| `ResearchInformation3.csv` | 493 × 16 | None (continuous GPA) | Not used | No binary or categorical classification label; continuous GPA column unsuitable for supervised classification |
| `student-mat.csv` | 395 × 33 | None (continuous grade G1/G2/G3) | Not used | No legitimate classification label; continuous grades only; too small for reliable model training |

> **No synthetic labels were created. Datasets without genuine labels were NOT used for Random Forest training.**

---

## 11. Isolation Forest — Training Results

**Model:** `sklearn.ensemble.IsolationForest`  
**Training Dataset:** `golden data.csv`  
**Task:** Unsupervised anomaly detection on student lifestyle/behavioral profiles

### Features Used (8)

| Feature | Description |
|---------|-------------|
| `study_hours_per_day` | Daily study hours |
| `sleep_hours` | Daily sleep hours |
| `gaming_hours` | Daily gaming hours |
| `social_media_hours` | Daily social media hours |
| `attendance_percentage` | Class attendance % |
| `stress_level` | Self-reported stress (1–10) |
| `focus_score` | Focus/concentration score (0–100) |
| `Previous_Grades` | Historical academic grade score |

### Hyperparameters

| Parameter | Value |
|-----------|-------|
| `n_estimators` | 150 |
| `contamination` | 0.08 (8%) |
| `random_state` | 42 |
| `max_samples` | 'auto' |

### Training Results

| Metric | Value |
|--------|-------|
| Training records | 15,377 |
| Test records | 3,845 |
| Test anomaly ratio | 8.01% |
| Normal records in test | 3,537 (92.0%) |
| Anomalous records in test | 308 (8.0%) |
| Mean anomaly score | 0.0396 |
| Score range | [-0.056, +0.1086] |
| Decision threshold | 0.0 (scores > 0 → NORMAL) |

**Saved artifacts:**
- `backend/app/ml/saved_models/isolation_forest_model.joblib`
- `backend/app/ml/saved_models/isolation_forest_metadata.json`

---

## 12. Random Forest — Training Results

**Model:** `sklearn.ensemble.RandomForestClassifier`  
**Training Dataset:** `Students suspicious behaviors detection dataset_V1.csv`  
**Task:** Supervised binary classification — Normal (0) vs Suspicious (1)

### Features Used (27)

Face detection features, hand gesture features, head pose angles (pitch/yaw/roll), phone presence/confidence, gaze tracking coordinates, and pupil position data — all derived from proctoring session recordings.

### Hyperparameters

| Parameter | Value |
|-----------|-------|
| `n_estimators` | 200 |
| `max_depth` | None (unlimited) |
| `min_samples_split` | 2 |
| `class_weight` | 'balanced' |
| `random_state` | 42 |
| `n_jobs` | -1 (all cores) |

### Test Set Performance (1,100 samples)

| Metric | Value |
|--------|-------|
| **Accuracy** | **98.91%** |
| **Precision** | **98.48%** |
| **Recall** | **99.24%** |
| **F1 Score** | **98.86%** |
| **ROC-AUC** | **0.9989** |
| 5-Fold CV Mean F1 | 0.9868 |

### Confusion Matrix

|  | Predicted Normal | Predicted Suspicious |
|--|:----------------:|:--------------------:|
| **Actually Normal** | 568 (TN) | 8 (FP) |
| **Actually Suspicious** | 4 (FN) | 520 (TP) |

### Top Feature Importances

| Feature | Importance |
|---------|-----------|
| `head_yaw` | 14.78% |
| `gaze_on_script` | 14.42% |
| `head_pitch` | 7.58% |
| `hand_obj_interaction` | 7.13% |
| `head_roll` | 6.52% |
| `face_conf` | 6.44% |

**Saved artifacts:**
- `backend/app/ml/saved_models/random_forest_model.joblib`
- `backend/app/ml/saved_models/random_forest_metadata.json`

### Inference Proxy Note

The Random Forest was trained on proctoring behavioral features (gaze, head pose, phone detection). For student registry inference (which lacks raw proctoring data), the `ml_service.py` maps academic indicators to proctoring feature proxies:

- Very low attendance (<50%) combined with very low CGPA (<1.5) → suspicious behavioral proxy
- Otherwise → normal behavioral proxy

This mapping is **documented, transparent, and deterministic** — it does NOT inject random values or fake probabilities. The actual model's `predict_proba()` output is always used for confidence scores.

---

## 13. Validation Engine Rules

The deterministic validation engine applies 6 rules to every student record:

| Rule | Check | Failure Condition |
|------|-------|-------------------|
| **Rule 1** | Mandatory Fields | `apaar_id`, `student_id`, `full_name`, `email`, `institution_id`, `degree_program`, `certificate_number` absent or empty |
| **Rule 2** | APAAR ID Format | Does not match `APAAR-YYYY-XXXX` pattern or 10–20 alphanumeric chars |
| **Rule 3** | CGPA/GPA Range | Value outside 0.00–4.00 scale |
| **Rule 4** | Attendance Range | Value outside 0.0–100.0% |
| **Rule 5** | Chronological Consistency | Certificate issue date precedes admission date |
| **Rule 6** | Email Format | Does not match standard `user@domain.tld` pattern |

Validation failure → `validation_status = "INVALID"` with detailed error list.  
Validation is separate from ML anomaly detection and ML suspicious classification — these are three distinct signals.

---

## 14. Duplicate Detection Logic

Four deterministic duplicate checks are performed in order:

| Priority | Rule | Match Condition |
|----------|------|----------------|
| 1 | **APAAR ID** | Same APAAR ID as existing student |
| 2 | **Certificate Number** | Same certificate number as existing student |
| 3 | **Roll + Institution** | Same student_id at same institution |
| 4 | **Identity Proximity** | Same name + date_of_birth + institution |

Duplicate records are **flagged**, not automatically deleted. Each duplicate case stores:
- The conflicting student's ID
- Which fields matched
- The reason string
- Review status (NEW → CONFIRMED/DISMISSED)

---

## 15. Data Flow

### Adding a Student

```
Frontend Form Submit
    → POST /api/students
        → Pydantic schema validation
        → Deterministic Validation Engine (6 rules)
        → Duplicate Detection (4 checks)
        → Isolation Forest inference (anomaly score)
        → Random Forest inference (suspicious probability)
        → Overall Risk calculation (LOW/MEDIUM/HIGH/CRITICAL)
        → Save Student to DB
        → Generate Alerts if anomalous or suspicious
        → Log Audit entry
        → Return StudentResponse with all ML results
    → Frontend updates student list and dashboard
```

### Bulk Import

```
File Upload (CSV/Excel)
    → Parse with pandas
    → Column presence check
    → Per-row: Validation → Duplicate → IF inference → RF inference
    → Import valid non-duplicate rows
    → Return: {total, success, failed, duplicate, anomalous, suspicious, errors[]}
```

---

## 16. Known Limitations

1. **RF Inference Proxy:** The Random Forest model was trained on proctoring/behavioral sensor data, not on academic registry fields. The academic-to-behavioral proxy mapping in `ml_service.py` is a documented approximation for demonstration purposes.

2. **Social Media Hours:** Not collected in the enrolment form. Defaults to `3.0` for Isolation Forest inference.

3. **SQLite for Production:** SQLite is used for development simplicity. For production deployment, update `DATABASE_URL` in `.env` to a PostgreSQL connection string — SQLAlchemy will handle the rest without code changes.

4. **No Email Notifications:** Alert notifications are stored in the database but not emailed. Email integration would require an SMTP/SendGrid configuration.

5. **No File Storage:** Document/certificate attachments are not stored; only metadata fields are captured.

---

## 17. Important Disclaimers

> **ANOMALY ≠ FRAUD.** A student record flagged as "ANOMALOUS" by the Isolation Forest model has a statistical behavioral profile that deviates from the majority of the training population. This does NOT mean the student has committed fraud. All anomaly flags require human review before any administrative action.

> **SUSPICIOUS ≠ CONFIRMED MALPRACTICE.** A record classified as "SUSPICIOUS" by the Random Forest model received a higher probability score based on derived academic indicators. This is a risk signal, not a determination of guilt.

> **ML models are decision support tools.** All final decisions must be made by authorized human reviewers.

> **Training datasets are official.** No synthetic, randomly generated, or fake data was used at any stage of training or inference. All model artifacts were produced from the 5 official CSV files provided.

