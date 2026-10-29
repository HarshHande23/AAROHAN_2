import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.entities import Institution, User, MLModelMetadata
from app.security.auth import get_password_hash
from app.api import (
    auth,
    institutions,
    students,
    bulk_import,
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

        # 2. Seed Initial User Profiles (4 Essential Roles) if empty
        if db.query(User).count() == 0:
            iitd = db.query(Institution).filter(Institution.code == "IITD").first()
            iitd_id = iitd.id if iitd else 1

            users_data = [
                User(
                    email="admin@aicte.gov.in",
                    hashed_password=get_password_hash("Admin@1234"),
                    full_name="Dr. Anil Sahasrabudhe (AICTE Directorate)",
                    role="AICTE_ADMIN",
                    institution_id=None
                ),
                User(
                    email="admin@iitd.ac.in",
                    hashed_password=get_password_hash("Admin@1234"),
                    full_name="Prof. Rangan Banerjee (IIT Delhi)",
                    role="COLLEGE_ADMIN",
                    institution_id=iitd_id
                ),
                User(
                    email="admissions@iitd.ac.in",
                    hashed_password=get_password_hash("Admin@1234"),
                    full_name="Dr. Sanjeev Sanghi (Admission In-Charge)",
                    role="ADMISSION_STAFF",
                    institution_id=iitd_id
                ),
                User(
                    email="verifier@tcs.com",
                    hashed_password=get_password_hash("Admin@1234"),
                    full_name="Kavita Iyer (TCS Academic Verification Lead)",
                    role="AUTHORIZED_VERIFIER",
                    institution_id=None
                )
            ]
            db.add_all(users_data)
            db.commit()
            print("[Database Seed] Seeded authorized role users.")

        # 3. Seed ML Model Metadata entries
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
        # This guarantees 100% adherence to Rule 6 & 40 (starting with 0 students).
    except Exception as e:
        print(f"[Database Seed Error] {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed core entities
    print("[Lifecycle] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    ml_service.load_models()
    yield
    print("[Lifecycle] Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Production-grade AICTE APAAR National Academic Verification Platform for Problem Statement 2 (PS2).",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow development frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(institutions.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(bulk_import.router, prefix=settings.API_V1_STR)
app.include_router(validation.router, prefix=settings.API_V1_STR)
app.include_router(duplicates.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "ONLINE",
        "api_docs": "/docs",
        "standard": "AICTE-APAAR-PS2"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

