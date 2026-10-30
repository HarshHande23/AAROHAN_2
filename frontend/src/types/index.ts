export type UserRole = 
  | 'AICTE_ADMIN' 
  | 'COLLEGE_ADMIN' 
  | 'ADMISSION_STAFF' 
  | 'AUTHORIZED_VERIFIER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: number | null;
  institution_name?: string | null;
  institution_code?: string | null;
  is_active: boolean;
}

export interface Institution {
  id: number;
  code: string;
  name: string;
  state: string;
  type: string; // Central, State, Private, Deemed
  contact_email: string;
  is_active: boolean;
}

export interface ProgramIntake {
  id: number;
  institution_id: number;
  institution_name?: string;
  institution_code?: string;
  program_name: string;
  academic_year: string;
  approved_intake: number;
  supernumerary_seats: number;
  intake_policy?: string;
  actual_enrolment: number;
  excess_enrolment: number;
  utilization_percentage: number;
  intake_status: 'WITHIN_LIMIT' | 'NEAR_CAPACITY' | 'EXCESS_ENROLMENT';
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  apaar_id: string;
  student_id: string; // Roll / Registration Number
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  institution_id: number;
  institution_name: string;
  institution_code: string;
  degree_program: string;
  department: string;
  academic_year: string;
  current_semester: string;
  admission_date: string;
  
  // SIH Specific Quotas and Categories
  admission_category?: string; // General, OBC, SC, ST, EWS, Management
  nri_status?: string; // Yes, No
  oci_status?: string; // Yes, No
  foreign_national_status?: string; // Yes, No
  supernumerary_quota?: string; // None, TFW, Sports, J&K Migrant, Defense
  submission_source?: string; // MANUAL, CSV_IMPORT, API_INTEGRATION
  
  // Indicators
  cgpa: number;
  last_semester_gpa: number;
  attendance_percentage: number;
  study_hours_per_day: number;
  sleep_hours: number;
  gaming_hours: number;
  certificate_number: string;
  certificate_issue_date: string;
  
  // Validation & Deterministic Checks
  validation_status: 'VALID' | 'INVALID' | 'PENDING';
  validation_errors: string[];
  
  // Deterministic Duplicate Detection
  duplicate_status: 'UNIQUE' | 'DUPLICATE_FLAGGED' | 'CONFIRMED_DUPLICATE' | 'RESOLVED';
  duplicate_match_id?: number | null;
  duplicate_reason?: string | null;
  is_cross_institution_duplicate?: boolean;
  is_excess_intake?: boolean;
  
  // Isolation Forest Anomaly Detection
  anomaly_status: 'NORMAL' | 'ANOMALOUS' | 'NOT_EVALUATED';
  anomaly_score?: number | null;
  anomaly_reason?: string | null;
  
  // Random Forest Classification
  ml_classification: 'GENUINE' | 'SUSPICIOUS' | 'NOT_EVALUATED';
  ml_confidence?: number | null;
  ml_reason?: string | null;
  
  // Overall Review / Risk Level
  overall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Academic Credential Verification
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'FLAGGED';
  verified_at?: string | null;
  verified_by?: string | null;
  verification_notes?: string | null;
  verification_code?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface InstitutionIntakeBreakdown {
  institution_id: number;
  institution_name: string;
  institution_code: string;
  total_programs: number;
  approved_intake: number;
  actual_enrolment: number;
  excess_enrolment: number;
  utilization_percentage: number;
}

export interface DashboardMetrics {
  total_students: number;
  total_institutions: number;
  total_approved_intake?: number;
  total_actual_enrolment?: number;
  total_excess_enrolment?: number;
  intake_utilization_percentage?: number;
  records_validated: number;
  records_requiring_review: number;
  duplicate_cases: number;
  cross_institution_duplicates?: number;
  anomalies_detected: number;
  suspicious_records: number;
  genuine_records: number;
  pending_verification: number;
  verified_records?: number;
  active_alerts: number;
  bulk_import_total: number;
  program_distribution: Record<string, number>;
  risk_distribution: Record<string, number>;
  verification_distribution: Record<string, number>;
  institution_intake_breakdown?: InstitutionIntakeBreakdown[];
  recent_students: Student[];
  recent_audit_logs: AuditLog[];
}

export interface Alert {
  id: number;
  student_id?: number | null;
  student_name?: string | null;
  apaar_id?: string | null;
  institution_id?: number | null;
  institution_name?: string | null;
  alert_type: 
    | 'EXCESS_ENROLMENT'
    | 'CROSS_INSTITUTION_DUPLICATE'
    | 'DUPLICATE_DETECTED'
    | 'INVALID_IDENTIFIER'
    | 'ACADEMIC_INCONSISTENCY'
    | 'DOCUMENT_INCONSISTENCY'
    | 'ISOLATION_FOREST_ANOMALY'
    | 'RANDOM_FOREST_SUSPICIOUS'
    | 'BULK_IMPORT_ISSUE'
    | 'VERIFICATION_FLAGGED';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  reason: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
}

export interface AuditLog {
  id: number;
  user_email: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

export interface Credential {
  credential_id: string;
  verification_code: string;
  student_id: number;
  apaar_id: string;
  student_name: string;
  institution_name: string;
  institution_code: string;
  degree_program: string;
  academic_year: string;
  certificate_number: string;
  certificate_issue_date: string;
  status: string;
  qr_payload: string;
  issued_at: string;
}

export interface PublicVerificationResult {
  verified: boolean;
  apaar_id?: string;
  student_id?: string;
  student_name?: string;
  institution_name?: string;
  degree_program?: string;
  academic_year?: string;
  certificate_number?: string;
  certificate_issue_date?: string;
  verification_status?: string;
  verification_code?: string;
  message: string;
}

export interface BulkImportError {
  row: number;
  field: string;
  value?: string;
  reason: string;
}

export interface BulkImportResponse {
  import_id: string;
  filename: string;
  total_rows: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  anomalous_count: number;
  suspicious_count: number;
  errors: BulkImportError[];
  imported_students: Student[];
}

export interface CorrectionItem {
  field: string;
  original: string;
  corrected: string;
  reason: string;
}

export interface AnalyzedRecord {
  row: number;
  original_data: Record<string, string>;
  corrected_data: Record<string, string>;
  corrections: CorrectionItem[];
  validation_errors: string[];
  is_valid: boolean;
  is_duplicate_in_db: boolean;
  is_duplicate_in_batch: boolean;
  is_cross_institution?: boolean;
  duplicate_reason: string | null;
  duplicate_match_id: number | null;
  is_excess_intake?: boolean;
  intake_warning?: string | null;
  anomaly_status: 'NORMAL' | 'ANOMALOUS' | 'NOT_RUN';
  anomaly_score: number | null;
  anomaly_reason: string | null;
  ml_classification: 'GENUINE' | 'SUSPICIOUS' | 'NOT_RUN';
  ml_confidence: number | null;
  ml_reason: string | null;
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  include_in_import: boolean;
}

export interface BatchAnalysis {
  batch_id: string;
  filename: string;
  total_records: number;
  valid_records: number;
  validation_issues: number;
  duplicate_count: number;
  cross_institution_duplicate_count?: number;
  excess_intake_count?: number;
  anomaly_count: number;
  suspicious_count: number;
  auto_corrections_count: number;
  manual_review_count: number;
  records: AnalyzedRecord[];
}

export interface ConfirmImportResult {
  batch_id: string;
  imported_count: number;
  skipped_count: number;
  status: string;
  message: string;
}

export interface BatchSummary {
  id: number;
  batch_id: string;
  submission_method: string;
  filename: string;
  uploaded_by: string;
  uploaded_by_role: string;
  upload_timestamp: string;
  processing_timestamp: string | null;
  status: string;
  total_records: number;
  valid_records: number;
  validation_issues_count: number;
  duplicate_count: number;
  cross_institution_duplicate_count?: number;
  excess_intake_count?: number;
  anomaly_count: number;
  suspicious_count: number;
  imported_count: number;
  file_deleted: boolean;
}

export interface MLModelStatus {
  model_name: string;
  version: string;
  algorithm: string;
  is_trained: boolean;
  trained_at?: string | null;
  training_records?: number | null;
  training_dataset?: string | null;
  features?: string[] | null;
  metrics?: Record<string, number | string | Record<string, any>> | null;
  status_message: string;
}

export interface IntakeComplianceItem {
  institution_id: number;
  institution_name: string;
  program_name: string;
  academic_year: string;
  approved_intake: number;
  supernumerary_seats: number;
  actual_enrolment: number;
  excess_enrolment: number;
  status: 'NORMAL' | 'EXCESS';
}

export interface ComplianceReport {
  generated_at: string;
  filter_institution?: string;
  total_enrolled: number;
  total_approved_intake?: number;
  total_excess_enrolment?: number;
  valid_percentage: number;
  duplicate_rate: number;
  cross_institution_duplicate_count?: number;
  anomaly_rate: number;
  suspicious_rate: number;
  verified_percentage: number;
  intake_compliance?: IntakeComplianceItem[];
  institution_breakdown: {
    institution_name: string;
    institution_code: string;
    total: number;
    valid: number;
    duplicates: number;
    cross_duplicates?: number;
    excess_intake?: number;
    anomalies: number;
    suspicious: number;
    verified?: number;
  }[];
}
