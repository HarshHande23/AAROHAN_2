import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.entities import Institution, User, MLModelMetadata, InstitutionProgramIntake
from app.security.auth import get_password_hash
from app.api import (
    auth,
    institutions,
    students,
    bulk_import,
    submissions,
    verification,
    credentials,
    intakes,
    validation,
    duplicates,
    alerts,
    reports,
    audit,
    ml,
    dashboard
)
from app.services.ml_service import ml_service

def seed_initial_data():
    db = SessionLocal()
    try:
        # 1. Seed Initial Institutions if empty
        if db.query(Institution).count() == 0:
            institutions_data = [
                Institution(code="IITD", name="Indian Institute of Technology Delhi", state="Delhi", type="Institute of National Importance", contact_email="contact@iitd.ac.in"),
                Institution(code="IITB", name="Indian Institute of Technology Bombay", state="Maharashtra", type="Institute of National Importance", contact_email="contact@iitb.ac.in"),
                Institution(code="BITS", name="Birla Institute of Technology and Science Pilani", state="Rajasthan", type="Deemed University", contact_email="contact@bits-pilani.ac.in"),
                Institution(code="DTU", name="Delhi Technological University", state="Delhi", type="State University", contact_email="contact@dtu.ac.in"),
                Institution(code="AU", name="Anna University Chennai", state="Tamil Nadu", type="State University", contact_email="contact@annauniv.edu")
            ]
            db.add_all(institutions_data)
            db.commit()
            print("[Database Seed] Seeded official institutions.")

        # 2. Seed Program Intake Configuration if empty
        if db.query(InstitutionProgramIntake).count() == 0:
            iitd = db.query(Institution).filter(Institution.code == "IITD").first()
            iitb = db.query(Institution).filter(Institution.code == "IITB").first()
            bits = db.query(Institution).filter(Institution.code == "BITS").first()
            dtu = db.query(Institution).filter(Institution.code == "DTU").first()
            au = db.query(Institution).filter(Institution.code == "AU").first()

            intake_entries = [
                # IIT Delhi
                InstitutionProgramIntake(institution_id=iitd.id if iitd else 1, program_name="B.Tech Computer Science and Engineering", academic_year="2025-2026", approved_intake=120, supernumerary_seats=12),
                InstitutionProgramIntake(institution_id=iitd.id if iitd else 1, program_name="B.Tech Electrical Engineering", academic_year="2025-2026", approved_intake=100, supernumerary_seats=10),
                InstitutionProgramIntake(institution_id=iitd.id if iitd else 1, program_name="B.Tech Mechanical Engineering", academic_year="2025-2026", approved_intake=90, supernumerary_seats=9),
                # IIT Bombay
                InstitutionProgramIntake(institution_id=iitb.id if iitb else 2, program_name="B.Tech Computer Science and Engineering", academic_year="2025-2026", approved_intake=120, supernumerary_seats=12),
                InstitutionProgramIntake(institution_id=iitb.id if iitb else 2, program_name="B.Tech Mechanical Engineering", academic_year="2025-2026", approved_intake=110, supernumerary_seats=11),
                # BITS Pilani
                InstitutionProgramIntake(institution_id=bits.id if bits else 3, program_name="B.Tech Information Technology", academic_year="2025-2026", approved_intake=100, supernumerary_seats=10),
                InstitutionProgramIntake(institution_id=bits.id if bits else 3, program_name="B.Tech Computer Science and Engineering", academic_year="2025-2026", approved_intake=120, supernumerary_seats=12),
                # DTU
                InstitutionProgramIntake(institution_id=dtu.id if dtu else 4, program_name="B.Tech Electrical Engineering", academic_year="2025-2026", approved_intake=80, supernumerary_seats=8),
                # Anna University
                InstitutionProgramIntake(institution_id=au.id if au else 5, program_name="B.Tech Information Technology", academic_year="2025-2026", approved_intake=90, supernumerary_seats=9),
            ]
            db.add_all(intake_entries)
            db.commit()
            print("[Database Seed] Seeded approved intake configurations.")

        # 3. Seed Initial User Profiles (Essential Roles)
        existing_users = {u.email for u in db.query(User).all()}
        iitd = db.query(Institution).filter(Institution.code == "IITD").first()
        iitd_id = iitd.id if iitd else 1

        users_to_add = []
        user_definitions = [
            ("admin@aicte.gov.in", "Admin@1234", "Dr. Anil Sahasrabudhe (AICTE Directorate)", "AICTE_ADMIN", None),
            ("college.admin@iitd.ac.in", "College@1234", "Prof. Rangan Banerjee (Director, IIT Delhi)", "COLLEGE_ADMIN", iitd_id),
            ("admin@iitd.ac.in", "Admin@1234", "Prof. Rangan Banerjee (IIT Delhi)", "COLLEGE_ADMIN", iitd_id),
            ("staff@iitd.ac.in", "Staff@1234", "Dr. Sanjeev Sanghi (Admission Officer)", "ADMISSION_STAFF", iitd_id),
            ("admissions@iitd.ac.in", "Admin@1234", "Dr. Sanjeev Sanghi (Admission In-Charge)", "ADMISSION_STAFF", iitd_id),
            ("verifier@aicte.gov.in", "Verify@1234", "Kavita Iyer (Authorized Verification Officer)", "AUTHORIZED_VERIFIER", None),
            ("verifier@tcs.com", "Admin@1234", "Kavita Iyer (TCS Academic Verification Lead)", "AUTHORIZED_VERIFIER", None)
        ]

        for email, pwd, name, role, inst_id in user_definitions:
            if email not in existing_users:
                users_to_add.append(
                    User(
                        email=email,
                        hashed_password=get_password_hash(pwd),
                        full_name=name,
                        role=role,
                        institution_id=inst_id
                    )
                )

        if users_to_add:
            db.add_all(users_to_add)
            db.commit()
            print(f"[Database Seed] Seeded {len(users_to_add)} authorized users.")

        # 4. Seed ML Model Metadata entries
        if db.query(MLModelMetadata).count() == 0:
            if_meta = MLModelMetadata(
                model_name="APAAR Student Lifestyle Anomaly Detector",
                version="1.0.0",
                algorithm="sklearn.ensemble.IsolationForest",
                is_trained=ml_service.if_pipeline is not None,
                training_dataset="golden data.csv",
                status_message="Initialized and active"
            )
            rf_meta = MLModelMetadata(
                model_name="APAAR Academic Suspicious Behavior Classifier",
                version="1.0.0",
                algorithm="sklearn.ensemble.RandomForestClassifier",
                is_trained=ml_service.rf_pipeline is not None,
                training_dataset="Students suspicious behaviors detection dataset_V1.csv",
                status_message="Initialized and active"
            )
            db.add_all([if_meta, rf_meta])
            db.commit()

        # NOTE: Students, duplicate cases, and alerts remain 0 initially!
    except Exception as e:
        print(f"[Database Seed Error] {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Lifecycle] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    ml_service.load_models()
    yield
    print("[Lifecycle] Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="AICTE APAAR National Academic Identity & Student Data Management Platform (Problem Statement 2).",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(institutions.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(intakes.router, prefix=settings.API_V1_STR)
app.include_router(submissions.router, prefix=settings.API_V1_STR)
app.include_router(bulk_import.router, prefix=settings.API_V1_STR) # Backward-compatible CSV import
app.include_router(verification.router, prefix=settings.API_V1_STR)
app.include_router(credentials.router, prefix=settings.API_V1_STR)
app.include_router(validation.router, prefix=settings.API_V1_STR)
app.include_router(duplicates.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)

# Also expose direct integration path requested in Section 12 & 31:
@app.post(f"{settings.API_V1_STR}/integration/student-records", tags=["Data Submission Channels"])
def direct_api_integration(
    payload: submissions.ApiBatchSubmissionRequest,
    x_api_key: str = None,
    current_user = Depends(submissions.get_current_user),
    db = Depends(submissions.get_db)
):
    return submissions.submit_via_api(payload=payload, x_api_key=x_api_key, current_user=current_user, db=db)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "standard": "AICTE-APAAR-PS2",
        "status": "ONLINE",
        "api_docs": "/docs",
        "verification_gateway": "/api/verification/public"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
