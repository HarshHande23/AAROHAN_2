import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    state = Column(String(100), nullable=False)
    type = Column(String(50), default="Central/State") # Central, State, Private, Deemed
    contact_email = Column(String(150), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="institution")
    students = relationship("Student", back_populates="institution")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False) # AICTE_ADMIN, COLLEGE_ADMIN, ADMISSION_STAFF, AUTHORIZED_VERIFIER
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="users")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    apaar_id = Column(String(100), index=True, nullable=False)
    student_id = Column(String(100), index=True, nullable=False) # Roll number / Reg number
    full_name = Column(String(200), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True)
    gender = Column(String(20), default="Other")
    date_of_birth = Column(String(50), default="2000-01-01")
    
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    degree_program = Column(String(200), nullable=False)
    department = Column(String(150), nullable=True)
    academic_year = Column(String(50), default="2025-2026")
    current_semester = Column(String(20), default="1st")
    admission_date = Column(String(50), default="2023-08-01")
    
    # Academic & behavioral indicators (Inference features)
    cgpa = Column(Float, nullable=False, default=0.0)
    last_semester_gpa = Column(Float, nullable=False, default=0.0)
    attendance_percentage = Column(Float, nullable=False, default=0.0)
    study_hours_per_day = Column(Float, nullable=False, default=4.0)
    sleep_hours = Column(Float, nullable=False, default=7.0)
    gaming_hours = Column(Float, nullable=False, default=1.0)
    
    # Document Credentials
    certificate_number = Column(String(100), index=True, nullable=False)
    certificate_issue_date = Column(String(50), default="2023-07-20")
    
    # Deterministic Validation Engine Results
    validation_status = Column(String(50), default="PENDING") # VALID, INVALID, PENDING
    validation_errors_json = Column(Text, default="[]") # JSON list of strings
    
    # Deterministic Duplicate Detection Results
    duplicate_status = Column(String(50), default="UNIQUE") # UNIQUE, DUPLICATE_FLAGGED, CONFIRMED_DUPLICATE, RESOLVED
    duplicate_match_id = Column(Integer, nullable=True)
    duplicate_reason = Column(String(255), nullable=True)
    
    # Isolation Forest Anomaly Detection Results
    anomaly_status = Column(String(50), default="NOT_EVALUATED") # NORMAL, ANOMALOUS, NOT_EVALUATED
    anomaly_score = Column(Float, nullable=True)
    anomaly_reason = Column(String(255), nullable=True)
    
    # Random Forest Classification Results
    ml_classification = Column(String(50), default="NOT_EVALUATED") # GENUINE, SUSPICIOUS, NOT_EVALUATED
    ml_confidence = Column(Float, nullable=True)
    ml_reason = Column(String(255), nullable=True)
    
    # Combined Overall Risk & Audit Review
    overall_risk_level = Column(String(50), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    
    # Academic Credential Verification
    verification_status = Column(String(50), default="PENDING") # PENDING, VERIFIED, REJECTED, FLAGGED
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(String(150), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="students")
    alerts = relationship("Alert", back_populates="student", cascade="all, delete-orphan")


class DuplicateCase(Base):
    __tablename__ = "duplicate_cases"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    matched_student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    reason = Column(String(255), nullable=False)
    is_resolved = Column(Boolean, default=False)
    action_taken = Column(String(50), nullable=True) # CONFIRMED, DISMISSED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(50), default="WARNING") # CRITICAL, WARNING, INFO
    reason = Column(String(255), nullable=False)
    status = Column(String(50), default="NEW") # NEW, UNDER_REVIEW, RESOLVED, DISMISSED
    review_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(150), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(150), nullable=False)
    user_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class ImportBatch(Base):
    """Tracks each bulk import session from upload through confirmation."""
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(20), unique=True, index=True, nullable=False)
    filename = Column(String(500), nullable=False)
    source_file_path = Column(String(1000), nullable=True)   # Disk path to uploaded CSV
    file_deleted = Column(Boolean, default=False)
    uploaded_by = Column(String(200), nullable=False)
    uploaded_by_role = Column(String(50), nullable=False)
    institution_id = Column(Integer, nullable=True)

    # Timing
    upload_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    processing_timestamp = Column(DateTime, nullable=True)

    # Status: ANALYZING | PENDING_CONFIRMATION | COMPLETED | FAILED
    status = Column(String(30), default="ANALYZING")

    # Aggregate counts
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    validation_issues_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    suspicious_count = Column(Integer, default=0)
    genuine_count = Column(Integer, default=0)
    auto_corrections_count = Column(Integer, default=0)
    manual_review_count = Column(Integer, default=0)
    imported_count = Column(Integer, default=0)

    # Full per-record analysis stored as JSON (used by confirm phase)
    analysis_data_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class MLModelMetadata(Base):
    __tablename__ = "ml_model_metadata"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), unique=True, nullable=False)
    version = Column(String(50), default="1.0.0")
    algorithm = Column(String(100), nullable=False)
    is_trained = Column(Boolean, default=False)
    trained_at = Column(DateTime, nullable=True)
    training_records = Column(Integer, default=0)
    training_dataset = Column(String(200), nullable=True)
    features_json = Column(Text, default="[]")
    metrics_json = Column(Text, default="{}")
    status_message = Column(String(255), default="Initialized")

