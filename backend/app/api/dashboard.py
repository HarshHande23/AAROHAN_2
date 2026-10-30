from typing import Optional, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.entities import Student, Institution, DuplicateCase, Alert, AuditLog, User, InstitutionProgramIntake
from app.schemas.schemas import DashboardResponse, InstitutionIntakeBreakdownItem
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
    intake_query = db.query(InstitutionProgramIntake)

    # Scoping for College Admin and Staff
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        target_inst = current_user.institution_id
        student_query = student_query.filter(Student.institution_id == target_inst)
        alert_query = alert_query.filter(Alert.institution_id == target_inst)
        inst_query = inst_query.filter(Institution.id == target_inst)
        intake_query = intake_query.filter(InstitutionProgramIntake.institution_id == target_inst)
    elif institution_id:
        student_query = student_query.filter(Student.institution_id == institution_id)
        alert_query = alert_query.filter(Alert.institution_id == institution_id)
        inst_query = inst_query.filter(Institution.id == institution_id)
        intake_query = intake_query.filter(InstitutionProgramIntake.institution_id == institution_id)

    total_students = student_query.count()
    total_institutions = inst_query.count()

    # Calculate total approved intake capacity
    intake_records = intake_query.all()
    total_approved_intake = sum(i.approved_intake for i in intake_records) or (total_institutions * 240)
    total_actual_enrolment = total_students
    total_excess_enrolment = student_query.filter(Student.is_excess_intake == True).count()
    intake_utilization = round((total_actual_enrolment / total_approved_intake) * 100, 1) if total_approved_intake > 0 else 0.0

    # Build institution intake breakdown
    inst_breakdown: List[InstitutionIntakeBreakdownItem] = []
    institutions_list = inst_query.all()
    for inst in institutions_list:
        inst_programs = db.query(InstitutionProgramIntake).filter(InstitutionProgramIntake.institution_id == inst.id).all()
        inst_approved = sum(p.approved_intake for p in inst_programs) or 240
        inst_enrolled = db.query(Student).filter(Student.institution_id == inst.id).count()
        inst_excess = db.query(Student).filter(Student.institution_id == inst.id, Student.is_excess_intake == True).count()
        inst_util = round((inst_enrolled / inst_approved) * 100, 1) if inst_approved > 0 else 0.0

        inst_breakdown.append(InstitutionIntakeBreakdownItem(
            institution_id=inst.id,
            institution_name=inst.name,
            institution_code=inst.code,
            total_programs=len(inst_programs) or 2,
            approved_intake=inst_approved,
            actual_enrolment=inst_enrolled,
            excess_enrolment=inst_excess,
            utilization_percentage=inst_util
        ))

    recent_logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(5).all()

    # REAL Zero Data Handling (When database has 0 students)
    if total_students == 0:
        return DashboardResponse(
            total_students=0,
            total_institutions=total_institutions,
            total_approved_intake=total_approved_intake,
            total_actual_enrolment=0,
            total_excess_enrolment=0,
            intake_utilization_percentage=0.0,
            records_validated=0,
            records_requiring_review=0,
            duplicate_cases=0,
            cross_institution_duplicates=0,
            anomalies_detected=0,
            suspicious_records=0,
            genuine_records=0,
            pending_verification=0,
            verified_records=0,
            active_alerts=0,
            bulk_import_total=0,
            program_distribution={},
            risk_distribution={},
            verification_distribution={},
            institution_intake_breakdown=inst_breakdown,
            recent_students=[],
            recent_audit_logs=recent_logs
        )

    # Real Database Computed Aggregates
    records_validated = student_query.filter(Student.validation_status == "VALID").count()
    duplicate_cases = dup_query.count()
    cross_inst_dups = dup_query.filter(DuplicateCase.is_cross_institution == True).count()
    anomalies_detected = student_query.filter(Student.anomaly_status == "ANOMALOUS").count()
    suspicious_records = student_query.filter(Student.ml_classification == "SUSPICIOUS").count()
    genuine_records = student_query.filter(Student.ml_classification == "GENUINE").count()
    pending_verification = student_query.filter(Student.verification_status == "PENDING").count()
    verified_records = student_query.filter(Student.verification_status == "VERIFIED").count()
    active_alerts = alert_query.filter(Alert.status.in_(["NEW", "UNDER_REVIEW"])).count()
    records_requiring_review = student_query.filter(
        (Student.overall_risk_level.in_(["HIGH", "CRITICAL"])) |
        (Student.validation_status == "INVALID") |
        (Student.duplicate_status.in_(["DUPLICATE_FLAGGED", "CONFIRMED_DUPLICATE"])) |
        (Student.is_cross_institution_duplicate == True) |
        (Student.is_excess_intake == True)
    ).count()

    # Program Distribution Group By
    prog_rows = student_query.with_entities(Student.degree_program, func.count(Student.id)).group_by(Student.degree_program).all()
    program_dist: Dict[str, int] = {row[0]: row[1] for row in prog_rows if row[0]}

    # Risk Distribution Group By
    risk_rows = student_query.with_entities(Student.overall_risk_level, func.count(Student.id)).group_by(Student.overall_risk_level).all()
    risk_dist: Dict[str, int] = {row[0]: row[1] for row in risk_rows if row[0]}

    # Verification Distribution Group By
    ver_rows = student_query.with_entities(Student.verification_status, func.count(Student.id)).group_by(Student.verification_status).all()
    ver_dist: Dict[str, int] = {row[0]: row[1] for row in ver_rows if row[0]}

    # Recent Students (limit 5)
    recent_students_raw = student_query.order_by(desc(Student.created_at)).limit(5).all()
    recent_students = [student_to_response(s) for s in recent_students_raw]

    return DashboardResponse(
        total_students=total_students,
        total_institutions=total_institutions,
        total_approved_intake=total_approved_intake,
        total_actual_enrolment=total_actual_enrolment,
        total_excess_enrolment=total_excess_enrolment,
        intake_utilization_percentage=intake_utilization,
        records_validated=records_validated,
        records_requiring_review=records_requiring_review,
        duplicate_cases=duplicate_cases,
        cross_institution_duplicates=cross_inst_dups,
        anomalies_detected=anomalies_detected,
        suspicious_records=suspicious_records,
        genuine_records=genuine_records,
        pending_verification=pending_verification,
        verified_records=verified_records,
        active_alerts=active_alerts,
        bulk_import_total=total_students,
        program_distribution=program_dist,
        risk_distribution=risk_dist,
        verification_distribution=ver_dist,
        institution_intake_breakdown=inst_breakdown,
        recent_students=recent_students,
        recent_audit_logs=recent_logs
    )
