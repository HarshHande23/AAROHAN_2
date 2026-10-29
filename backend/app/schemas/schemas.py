from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    institution_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None

class RoleSwitchRequest(BaseModel):
    role: str

class InstitutionResponse(BaseModel):
    id: int
    code: str
    name: str
    state: str
    type: str
    contact_email: str
    is_active: bool

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    apaar_id: str
    student_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    gender: Optional[str] = "Other"
    date_of_birth: Optional[str] = "2000-01-01"
    institution_id: int
    degree_program: str
    department: Optional[str] = None
    academic_year: Optional[str] = "2025-2026"
    current_semester: Optional[str] = "1st"
    admission_date: Optional[str] = "2023-08-01"
    cgpa: float
    last_semester_gpa: float
    attendance_percentage: float
    study_hours_per_day: Optional[float] = 4.0
    sleep_hours: Optional[float] = 7.0
    gaming_hours: Optional[float] = 1.0
    certificate_number: str
    certificate_issue_date: Optional[str] = "2023-07-20"

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cgpa: Optional[float] = None
    last_semester_gpa: Optional[float] = None
    attendance_percentage: Optional[float] = None
    study_hours_per_day: Optional[float] = None
    sleep_hours: Optional[float] = None
    gaming_hours: Optional[float] = None
    degree_program: Optional[str] = None
    department: Optional[str] = None
    current_semester: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    validation_status: str
    validation_errors: List[str] = []
    duplicate_status: str
    duplicate_match_id: Optional[int] = None
    duplicate_reason: Optional[str] = None
    anomaly_status: str
    anomaly_score: Optional[float] = None
    anomaly_reason: Optional[str] = None
    ml_classification: str
    ml_confidence: Optional[float] = None
    ml_reason: Optional[str] = None
    overall_risk_level: str
    verification_status: str
    verified_at: Optional[datetime.datetime] = None
    verified_by: Optional[str] = None
    verification_notes: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class StudentPaginatedResponse(BaseModel):
    items: List[StudentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class VerifyStudentRequest(BaseModel):
    status: str # VERIFIED, REJECTED, FLAGGED
    notes: Optional[str] = None

class DuplicateCaseResponse(BaseModel):
    id: int
    student: StudentResponse
    matched_student: Optional[StudentResponse] = None
    reason: str
    created_at: datetime.datetime

class AlertResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    apaar_id: str
    institution_name: str
    alert_type: str
    severity: str
    reason: str
    status: str
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

class UpdateAlertRequest(BaseModel):
    status: str
    notes: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: int
    user_email: str
    user_role: str
    action: str
    entity_type: str
    entity_id: str
    details: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class MLModelStatusResponse(BaseModel):
    model_name: str
    version: str
    algorithm: str
    is_trained: bool
    trained_at: Optional[datetime.datetime] = None
    training_records: Optional[int] = None
    training_dataset: Optional[str] = None
    features: Optional[List[str]] = None
    metrics: Optional[Dict[str, Any]] = None
    status_message: str

class DashboardResponse(BaseModel):
    total_students: int
    total_institutions: int
    records_validated: int
    records_requiring_review: int
    duplicate_cases: int
    anomalies_detected: int
    suspicious_records: int
    genuine_records: int
    pending_verification: int
    active_alerts: int
    bulk_import_total: int
    program_distribution: Dict[str, int]
    risk_distribution: Dict[str, int]
    verification_distribution: Dict[str, int]
    recent_students: List[StudentResponse]
    recent_audit_logs: List[AuditLogResponse]

class BulkImportErrorItem(BaseModel):
    row: int
    field: str
    value: Optional[str] = None
    reason: str

# ─── New two-phase bulk import schemas ────────────────────────────────────────

class CorrectionItem(BaseModel):
    field: str
    original: str
    corrected: str
    reason: str

class AnalyzedRecord(BaseModel):
    row: int
    original_data: Dict[str, Any]
    corrected_data: Dict[str, Any]
    corrections: List[CorrectionItem]
    validation_errors: List[str]
    is_valid: bool
    is_duplicate_in_db: bool
    is_duplicate_in_batch: bool
    duplicate_reason: Optional[str] = None
    duplicate_match_id: Optional[int] = None
    anomaly_status: str   # NORMAL | ANOMALOUS | NOT_RUN
    anomaly_score: Optional[float] = None
    anomaly_reason: Optional[str] = None
    ml_classification: str  # GENUINE | SUSPICIOUS | NOT_RUN
    ml_confidence: Optional[float] = None
    ml_reason: Optional[str] = None
    overall_risk: str   # LOW | MEDIUM | HIGH | CRITICAL
    include_in_import: bool  # user-toggleable; pre-set by analysis

class BatchAnalysisResponse(BaseModel):
    batch_id: str
    filename: str
    total_records: int
    valid_records: int
    validation_issues: int
    duplicate_count: int
    anomaly_count: int
    suspicious_count: int
    auto_corrections_count: int
    manual_review_count: int
    records: List[AnalyzedRecord]

class ConfirmImportRequest(BaseModel):
    excluded_rows: List[int] = []   # row numbers the user wants to skip

class ConfirmImportResponse(BaseModel):
    batch_id: str
    imported_count: int
    skipped_count: int
    status: str
    message: str

class BatchSummaryResponse(BaseModel):
    id: int
    batch_id: str
    filename: str
    uploaded_by: str
    uploaded_by_role: str
    upload_timestamp: datetime.datetime
    processing_timestamp: Optional[datetime.datetime] = None
    status: str
    total_records: int
    valid_records: int
    validation_issues_count: int
    duplicate_count: int
    anomaly_count: int
    suspicious_count: int
    imported_count: int
    file_deleted: bool

    class Config:
        from_attributes = True

# ─── Legacy single-phase schema (kept for backward compat) ────────────────────

class BulkImportResponseSchema(BaseModel):
    import_id: str
    filename: str
    total_rows: int
    success_count: int
    failed_count: int
    duplicate_count: int
    anomalous_count: int
    suspicious_count: int
    errors: List[BulkImportErrorItem]
    imported_students: List[StudentResponse]

class ComplianceReportResponse(BaseModel):
    generated_at: datetime.datetime
    filter_institution: Optional[str] = None
    total_enrolled: int
    valid_percentage: float
    duplicate_rate: float
    anomaly_rate: float
    suspicious_rate: float
    verified_percentage: float
    institution_breakdown: List[Dict[str, Any]]

