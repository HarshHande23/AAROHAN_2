from typing import Optional, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.entities import Student, Institution, DuplicateCase, Alert, AuditLog, User
from app.schemas.schemas import DashboardResponse
from app.api.students import student_to_response
from app.security.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardResponse)
def get_dashboard_metrics(
    institution_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student_query = db.query(Student)
    inst_query = db.query(Institution)
    alert_query = db.query(Alert)
    dup_query = db.query(DuplicateCase).filter(DuplicateCase.is_resolved == False)

    # Scoping for College Admin
    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id:
        student_query = student_query.filter(Student.institution_id == current_user.institution_id)
        alert_query = alert_query.join(Student, Alert.student_id == Student.id).filter(Student.institution_id == current_user.institution_id)
        inst_query = inst_query.filter(Institution.id == current_user.institution_id)
    elif institution_id:
        student_query = student_query.filter(Student.institution_id == institution_id)
        alert_query = alert_query.join(Student, Alert.student_id == Student.id).filter(Student.institution_id == institution_id)
        inst_query = inst_query.filter(Institution.id == institution_id)

    total_students = student_query.count()
    total_institutions = inst_query.count()

    # REAL Zero Data Handling (When database has 0 students)
    if total_students == 0:
        recent_logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(5).all()
        return DashboardResponse(
            total_students=0,
            total_institutions=total_institutions,
            records_validated=0,
            records_requiring_review=0,
            duplicate_cases=0,
            anomalies_detected=0,
            suspicious_records=0,
            genuine_records=0,
            pending_verification=0,
            active_alerts=0,
            bulk_import_total=0,
            program_distribution={},
            risk_distribution={},
            verification_distribution={},
            recent_students=[],
            recent_audit_logs=recent_logs
        )

    # Real Database Computed Aggregates
    records_validated = student_query.filter(Student.validation_status == "VALID").count()
    duplicate_cases = dup_query.count()
    anomalies_detected = student_query.filter(Student.anomaly_status == "ANOMALOUS").count()
    suspicious_records = student_query.filter(Student.ml_classification == "SUSPICIOUS").count()
    genuine_records = student_query.filter(Student.ml_classification == "GENUINE").count()
    pending_verification = student_query.filter(Student.verification_status == "PENDING").count()
    active_alerts = alert_query.filter(Alert.status.in_(["NEW", "UNDER_REVIEW"])).count()
    records_requiring_review = student_query.filter(
        (Student.overall_risk_level.in_(["HIGH", "CRITICAL"])) |
        (Student.validation_status == "INVALID") |
        (Student.duplicate_status.in_(["DUPLICATE_FLAGGED", "CONFIRMED_DUPLICATE"]))
    ).count()

    # Real Program Distribution Group By
    prog_rows = db.query(Student.degree_program, func.count(Student.id)).group_by(Student.degree_program).all()
    program_dist: Dict[str, int] = {row[0]: row[1] for row in prog_rows if row[0]}

    # Real Risk Distribution Group By
    risk_rows = db.query(Student.overall_risk_level, func.count(Student.id)).group_by(Student.overall_risk_level).all()
    risk_dist: Dict[str, int] = {row[0]: row[1] for row in risk_rows if row[0]}

    # Real Verification Distribution Group By
    ver_rows = db.query(Student.verification_status, func.count(Student.id)).group_by(Student.verification_status).all()
    ver_dist: Dict[str, int] = {row[0]: row[1] for row in ver_rows if row[0]}

    # Recent Students (limit 5)
    recent_students_raw = student_query.order_by(desc(Student.created_at)).limit(5).all()
    recent_students = [student_to_response(s) for s in recent_students_raw]

    # Recent Audit Logs (limit 5)
    recent_logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(5).all()

    return DashboardResponse(
        total_students=total_students,
        total_institutions=total_institutions,
        records_validated=records_validated,
        records_requiring_review=records_requiring_review,
        duplicate_cases=duplicate_cases,
        anomalies_detected=anomalies_detected,
        suspicious_records=suspicious_records,
        genuine_records=genuine_records,
        pending_verification=pending_verification,
        active_alerts=active_alerts,
        bulk_import_total=total_students,
        program_distribution=program_dist,
        risk_distribution=risk_dist,
        verification_distribution=ver_dist,
        recent_students=recent_students,
        recent_audit_logs=recent_logs
    )

