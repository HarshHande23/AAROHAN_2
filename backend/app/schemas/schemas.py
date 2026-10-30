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

# ─── Program Intake Schemas ───────────────────────────────────────────────────

class InstitutionProgramIntakeBase(BaseModel):
    program_name: str
    academic_year: Optional[str] = "2025-2026"
    approved_intake: int = 120
    supernumerary_seats: int = 10
    intake_policy: Optional[str] = "SUPERNUMERARY_EXCLUDED"

class InstitutionProgramIntakeCreate(InstitutionProgramIntakeBase):
    institution_id: int

class InstitutionProgramIntakeResponse(InstitutionProgramIntakeBase):
    id: int
    institution_id: int
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    actual_enrolment: int = 0
    excess_enrolment: int = 0
    utilization_percentage: float = 0.0
    intake_status: str = "WITHIN_LIMIT" # WITHIN_LIMIT | NEAR_CAPACITY | EXCESS_ENROLMENT
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# ─── Student Schemas ──────────────────────────────────────────────────────────

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
    
    # SIH Specific Categories & Quotas
    admission_category: Optional[str] = "General"
    nri_status: Optional[str] = "No"
    oci_status: Optional[str] = "No"
    foreign_national_status: Optional[str] = "No"
    supernumerary_quota: Optional[str] = "None"
    submission_source: Optional[str] = "MANUAL"
    
    # Indicators
    cgpa: float = 0.0
    last_semester_gpa: float = 0.0
    attendance_percentage: float = 0.0
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
    admission_category: Optional[str] = None
    nri_status: Optional[str] = None
    oci_status: Optional[str] = None
    foreign_national_status: Optional[str] = None
    supernumerary_quota: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    validation_status: str
    validation_errors: List[str] = []
    duplicate_status: str
    duplicate_match_id: Optional[int] = None
    duplicate_reason: Optional[str] = None
    is_cross_institution_duplicate: bool = False
    is_excess_intake: bool = False
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
    verification_code: Optional[str] = None
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

# ─── Credential Schemas ───────────────────────────────────────────────────────

class CredentialResponse(BaseModel):
    credential_id: str
    verification_code: str
    student_id: int
    apaar_id: str
    student_name: str
    institution_name: str
    institution_code: str
    degree_program: str
    academic_year: str
    certificate_number: str
    certificate_issue_date: str
    status: str
    qr_payload: str
    issued_at: datetime.datetime

# ─── Public Verification Schemas ──────────────────────────────────────────────

class PublicVerificationRequest(BaseModel):
    identifier: str # APAAR ID, Student ID, or Certificate Number

class PublicVerificationResponse(BaseModel):
    verified: bool
    apaar_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    institution_name: Optional[str] = None
    degree_program: Optional[str] = None
    academic_year: Optional[str] = None
    certificate_number: Optional[str] = None
    certificate_issue_date: Optional[str] = None
    verification_status: Optional[str] = None
    verification_code: Optional[str] = None
    message: str

# ─── Duplicate & Alert Schemas ────────────────────────────────────────────────

class DuplicateCaseResponse(BaseModel):
    id: int
    student: StudentResponse
    matched_student: Optional[StudentResponse] = None
    reason: str
    is_cross_institution: bool = False
    created_at: datetime.datetime

class AlertResponse(BaseModel):
    id: int
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    apaar_id: Optional[str] = None
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None
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

# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class InstitutionIntakeBreakdownItem(BaseModel):
    institution_id: int
    institution_name: str
    institution_code: str
    total_programs: int
    approved_intake: int
    actual_enrolment: int
    excess_enrolment: int
    utilization_percentage: float

class DashboardResponse(BaseModel):
    total_students: int
    total_institutions: int
    total_approved_intake: int = 0
    total_actual_enrolment: int = 0
    total_excess_enrolment: int = 0
    intake_utilization_percentage: float = 0.0
    records_validated: int
    records_requiring_review: int
    duplicate_cases: int
    cross_institution_duplicates: int = 0
    anomalies_detected: int
    suspicious_records: int
    genuine_records: int
    pending_verification: int
    verified_records: int = 0
    active_alerts: int
    bulk_import_total: int
    program_distribution: Dict[str, int]
    risk_distribution: Dict[str, int]
    verification_distribution: Dict[str, int]
    institution_intake_breakdown: List[InstitutionIntakeBreakdownItem] = []
    recent_students: List[StudentResponse]
    recent_audit_logs: List[AuditLogResponse]

# ─── Ingestion & Submission Schemas ───────────────────────────────────────────

class BulkImportErrorItem(BaseModel):
    row: int
    field: str
    value: Optional[str] = None
    reason: str

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
    is_cross_institution: bool = False
    duplicate_reason: Optional[str] = None
    duplicate_match_id: Optional[int] = None
    is_excess_intake: bool = False
    intake_warning: Optional[str] = None
    anomaly_status: str   # NORMAL | ANOMALOUS | NOT_RUN
    anomaly_score: Optional[float] = None
    anomaly_reason: Optional[str] = None
    ml_classification: str  # GENUINE | SUSPICIOUS | NOT_RUN
    ml_confidence: Optional[float] = None
    ml_reason: Optional[str] = None
    overall_risk: str   # LOW | MEDIUM | HIGH | CRITICAL
    include_in_import: bool

class BatchAnalysisResponse(BaseModel):
    batch_id: str
    filename: str
    total_records: int
    valid_records: int
    validation_issues: int
    duplicate_count: int
    cross_institution_duplicate_count: int = 0
    excess_intake_count: int = 0
    anomaly_count: int
    suspicious_count: int
    auto_corrections_count: int
    manual_review_count: int
    records: List[AnalyzedRecord]

class ConfirmImportRequest(BaseModel):
    excluded_rows: List[int] = []

class ConfirmImportResponse(BaseModel):
    batch_id: str
    imported_count: int
    skipped_count: int
    status: str
    message: str

class BatchSummaryResponse(BaseModel):
    id: int
    batch_id: str
    submission_method: str = "CSV"
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
    cross_institution_duplicate_count: int = 0
    excess_intake_count: int = 0
    anomaly_count: int
    suspicious_count: int
    imported_count: int
    file_deleted: bool

    class Config:
        from_attributes = True

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

# ─── API Integration Submission Schemas ───────────────────────────────────────

class ApiStudentRecordPayload(BaseModel):
    apaar_id: str
    student_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    gender: Optional[str] = "Other"
    date_of_birth: Optional[str] = "2000-01-01"
    institution_id: Optional[int] = None
    degree_program: str
    department: Optional[str] = None
    academic_year: Optional[str] = "2025-2026"
    current_semester: Optional[str] = "1st"
    admission_date: Optional[str] = "2023-08-01"
    admission_category: Optional[str] = "General"
    nri_status: Optional[str] = "No"
    oci_status: Optional[str] = "No"
    foreign_national_status: Optional[str] = "No"
    supernumerary_quota: Optional[str] = "None"
    cgpa: float = 0.0
    last_semester_gpa: float = 0.0
    attendance_percentage: float = 0.0
    certificate_number: str
    certificate_issue_date: Optional[str] = "2023-07-20"

class ApiBatchSubmissionRequest(BaseModel):
    records: List[ApiStudentRecordPayload]

class ApiSubmissionResponse(BaseModel):
    success: bool
    batch_id: str
    total_submitted: int
    accepted: int
    rejected: int
    duplicates_flagged: int
    cross_institution_duplicates: int
    excess_intake_flagged: int
    anomalies_detected: int
    records: List[Dict[str, Any]]
    message: str

# ─── Compliance Report Schemas ────────────────────────────────────────────────

class IntakeComplianceItem(BaseModel):
    institution_id: int
    institution_name: str
    program_name: str
    academic_year: str
    approved_intake: int
    supernumerary_seats: int
    actual_enrolment: int
    excess_enrolment: int
    status: str # NORMAL | EXCESS

class ComplianceReportResponse(BaseModel):
    generated_at: datetime.datetime
    filter_institution: Optional[str] = None
    total_enrolled: int
    total_approved_intake: int
    total_excess_enrolment: int
    valid_percentage: float
    duplicate_rate: float
    cross_institution_duplicate_count: int
    anomaly_rate: float
    suspicious_rate: float
    verified_percentage: float
    intake_compliance: List[IntakeComplianceItem] = []
    institution_breakdown: List[Dict[str, Any]] = []
