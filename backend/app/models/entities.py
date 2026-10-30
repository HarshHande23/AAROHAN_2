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
    intakes = relationship("InstitutionProgramIntake", back_populates="institution", cascade="all, delete-orphan")


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


class InstitutionProgramIntake(Base):
    """
    Approved intake and supernumerary seat configurations per Institution, Program, and Academic Year.
    Used for automated intake excess monitoring.
    """
    __tablename__ = "institution_program_intakes"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    program_name = Column(String(200), nullable=False) # e.g. "B.Tech Computer Science and Engineering"
    academic_year = Column(String(50), nullable=False, default="2025-2026")
    approved_intake = Column(Integer, nullable=False, default=120)
    supernumerary_seats = Column(Integer, nullable=False, default=10)
    intake_policy = Column(String(50), default="SUPERNUMERARY_EXCLUDED") # STRICT, SUPERNUMERARY_EXCLUDED, SUPERNUMERARY_INCLUDED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="intakes")


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
    
    # SIH PS specific student categories & quotas
    admission_category = Column(String(50), default="General") # General, OBC, SC, ST, EWS, Management
    nri_status = Column(String(20), default="No") # Yes, No
    oci_status = Column(String(20), default="No") # Yes, No
    foreign_national_status = Column(String(20), default="No") # Yes, No
    supernumerary_quota = Column(String(50), default="None") # None, TFW, Sports, J&K Migrant, Defense
    submission_source = Column(String(50), default="MANUAL") # MANUAL, CSV_IMPORT, API_INTEGRATION
    submission_batch_id = Column(String(50), nullable=True)
    
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
    is_cross_institution_duplicate = Column(Boolean, default=False) # Cross-institution duplicate flag
    
    # Intake limit check result
    is_excess_intake = Column(Boolean, default=False)
    
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
    verification_code = Column(String(100), nullable=True, unique=True, index=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="students")
    alerts = relationship("Alert", back_populates="student", cascade="all, delete-orphan")
    credentials = relationship("CredentialRecord", back_populates="student", cascade="all, delete-orphan")


class CredentialRecord(Base):
    """
    Verifiable credential / certificate representation linking APAAR ID, Student ID, and institution.
    """
    __tablename__ = "credential_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    credential_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. "CRED-APAAR-XXXXX"
    verification_code = Column(String(100), unique=True, index=True, nullable=False)
    certificate_number = Column(String(100), nullable=False)
    status = Column(String(50), default="ACTIVE") # ACTIVE, REVOKED, EXPIRED
    qr_payload = Column(Text, nullable=True)
    issued_at = Column(DateTime, default=datetime.datetime.utcnow)
    issued_by = Column(String(150), nullable=True)

    student = relationship("Student", back_populates="credentials")


class DuplicateCase(Base):
    __tablename__ = "duplicate_cases"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    matched_student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    reason = Column(String(255), nullable=False)
    is_cross_institution = Column(Boolean, default=False)
    matched_institution_id = Column(Integer, nullable=True)
    matching_fields_json = Column(Text, default="[]")
    is_resolved = Column(Boolean, default=False)
    action_taken = Column(String(50), nullable=True) # CONFIRMED, DISMISSED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    alert_type = Column(String(100), nullable=False) # EXCESS_ENROLMENT, CROSS_INSTITUTION_DUPLICATE, DUPLICATE_DETECTED, ISOLATION_FOREST_ANOMALY, RANDOM_FOREST_SUSPICIOUS, etc.
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


class VerificationLog(Base):
    """
    Audit log of credential and record verification lookups by authorized users and external stakeholders.
    """
    __tablename__ = "verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=True)
    apaar_id = Column(String(100), nullable=True)
    certificate_number = Column(String(100), nullable=True)
    verifier_type = Column(String(50), default="AUTHORIZED") # AUTHORIZED, PUBLIC_EMPLOYER, REGULATOR
    verifier_identifier = Column(String(150), nullable=True) # user email, client name, or IP
    verification_result = Column(String(50), nullable=False) # VERIFIED, REJECTED, NOT_FOUND
    verification_channel = Column(String(50), default="PORTAL") # PORTAL, PUBLIC_API, QR_SCAN
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class ApiIntegrationKey(Base):
    """
    API keys for institution ERP/SIS systems to submit student records via API.
    """
    __tablename__ = "api_integration_keys"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    key_name = Column(String(100), nullable=False) # e.g. "IITD Campus ERP"
    api_key = Column(String(255), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by = Column(String(150), nullable=False)


class ImportBatch(Base):
    """
    Tracks each submission session (CSV, Manual Batch, or API Integration) from ingestion through confirmation.
    """
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(20), unique=True, index=True, nullable=False)
    submission_method = Column(String(50), default="CSV") # CSV, MANUAL, API
    filename = Column(String(500), nullable=False)
    source_file_path = Column(String(1000), nullable=True)   # Disk path to uploaded CSV if applicable
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
    cross_institution_duplicate_count = Column(Integer, default=0)
    excess_intake_count = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    suspicious_count = Column(Integer, default=0)
    genuine_count = Column(Integer, default=0)
    auto_corrections_count = Column(Integer, default=0)
    manual_review_count = Column(Integer, default=0)
    imported_count = Column(Integer, default=0)

    # Full per-record analysis stored as JSON
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
