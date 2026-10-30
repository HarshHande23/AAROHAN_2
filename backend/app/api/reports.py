import datetime
import io
import csv
from typing import Optional, List
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.entities import Student, Institution, User, InstitutionProgramIntake, DuplicateCase
from app.schemas.schemas import ComplianceReportResponse, IntakeComplianceItem
from app.security.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Compliance & Monitoring Reports"])

@router.get("", response_model=ComplianceReportResponse)
def get_compliance_report(
    institution_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    intake_query = db.query(InstitutionProgramIntake)

    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        target_inst = current_user.institution_id
        query = query.filter(Student.institution_id == target_inst)
        intake_query = intake_query.filter(InstitutionProgramIntake.institution_id == target_inst)
    elif institution_id:
        query = query.filter(Student.institution_id == institution_id)
        intake_query = intake_query.filter(InstitutionProgramIntake.institution_id == institution_id)

    if academic_year:
        query = query.filter(Student.academic_year == academic_year)
        intake_query = intake_query.filter(InstitutionProgramIntake.academic_year == academic_year)

    total_enrolled = query.count()
    intake_records = intake_query.all()
    total_approved = sum(i.approved_intake for i in intake_records) or 1200
    total_excess = query.filter(Student.is_excess_intake == True).count()
    cross_dups = query.filter(Student.is_cross_institution_duplicate == True).count()

    # Build Intake Compliance list
    intake_compliance_items = []
    for intk in intake_records:
        inst = db.query(Institution).filter(Institution.id == intk.institution_id).first()
        inst_name = inst.name if inst else f"Institution #{intk.institution_id}"
        
        actual_count = (
            query.filter(
                Student.institution_id == intk.institution_id,
                Student.degree_program.ilike(f"%{intk.program_name.strip()}%"),
                Student.academic_year == intk.academic_year
            )
            .count()
        )
        excess = max(0, actual_count - intk.approved_intake)

        intake_compliance_items.append(IntakeComplianceItem(
            institution_id=intk.institution_id,
            institution_name=inst_name,
            program_name=intk.program_name,
            academic_year=intk.academic_year,
            approved_intake=intk.approved_intake,
            supernumerary_seats=intk.supernumerary_seats,
            actual_enrolment=actual_count,
            excess_enrolment=excess,
            status="EXCESS" if excess > 0 else "NORMAL"
        ))

    if total_enrolled == 0:
        return ComplianceReportResponse(
            generated_at=datetime.datetime.utcnow(),
            filter_institution=str(institution_id) if institution_id else None,
            total_enrolled=0,
            total_approved_intake=total_approved,
            total_excess_enrolment=0,
            valid_percentage=0.0,
            duplicate_rate=0.0,
            cross_institution_duplicate_count=0,
            anomaly_rate=0.0,
            suspicious_rate=0.0,
            verified_percentage=0.0,
            intake_compliance=intake_compliance_items,
            institution_breakdown=[]
        )

    valid_count = query.filter(Student.validation_status == "VALID").count()
    dup_count = query.filter(Student.duplicate_status.in_(["DUPLICATE_FLAGGED", "CONFIRMED_DUPLICATE"])).count()
    anom_count = query.filter(Student.anomaly_status == "ANOMALOUS").count()
    susp_count = query.filter(Student.ml_classification == "SUSPICIOUS").count()
    verified_count = query.filter(Student.verification_status == "VERIFIED").count()

    # Institution breakdown
    institutions = db.query(Institution).all()
    breakdown = []

    for inst in institutions:
        inst_query = query.filter(Student.institution_id == inst.id)
        inst_total = inst_query.count()
        if inst_total > 0:
            breakdown.append({
                "institution_name": inst.name,
                "institution_code": inst.code,
                "total": inst_total,
                "valid": inst_query.filter(Student.validation_status == "VALID").count(),
                "duplicates": inst_query.filter(Student.duplicate_status.in_(["DUPLICATE_FLAGGED", "CONFIRMED_DUPLICATE"])).count(),
                "cross_duplicates": inst_query.filter(Student.is_cross_institution_duplicate == True).count(),
                "excess_intake": inst_query.filter(Student.is_excess_intake == True).count(),
                "anomalies": inst_query.filter(Student.anomaly_status == "ANOMALOUS").count(),
                "suspicious": inst_query.filter(Student.ml_classification == "SUSPICIOUS").count(),
                "verified": inst_query.filter(Student.verification_status == "VERIFIED").count(),
            })

    return ComplianceReportResponse(
        generated_at=datetime.datetime.utcnow(),
        filter_institution=str(institution_id) if institution_id else None,
        total_enrolled=total_enrolled,
        total_approved_intake=total_approved,
        total_excess_enrolment=total_excess,
        valid_percentage=round((valid_count / total_enrolled) * 100, 2),
        duplicate_rate=round((dup_count / total_enrolled) * 100, 2),
        cross_institution_duplicate_count=cross_dups,
        anomaly_rate=round((anom_count / total_enrolled) * 100, 2),
        suspicious_rate=round((susp_count / total_enrolled) * 100, 2),
        verified_percentage=round((verified_count / total_enrolled) * 100, 2),
        intake_compliance=intake_compliance_items,
        institution_breakdown=breakdown
    )

@router.get("/export/csv")
def export_reports_csv(
    institution_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports comprehensive student enrolment and compliance data as CSV.
    """
    query = db.query(Student)
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        query = query.filter(Student.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(Student.institution_id == institution_id)

    if academic_year:
        query = query.filter(Student.academic_year == academic_year)

    students = query.order_by(Student.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "APAAR ID", "Student ID", "Full Name", "Institution Code",
        "Degree Program", "Academic Year", "Admission Category", "NRI Status", "OCI Status", "FN Status",
        "Validation Status", "Duplicate Status", "Cross Institution Duplicate", "Excess Intake",
        "ML Anomaly Status", "ML Suspicious Classification", "Overall Risk Level", "Verification Status"
    ])

    for s in students:
        inst_code = s.institution.code if s.institution else "UNK"
        writer.writerow([
            s.id, s.apaar_id, s.student_id, s.full_name, inst_code,
            s.degree_program, s.academic_year, s.admission_category, s.nri_status, s.oci_status, s.foreign_national_status,
            s.validation_status, s.duplicate_status, "Yes" if s.is_cross_institution_duplicate else "No",
            "Yes" if s.is_excess_intake else "No", s.anomaly_status, s.ml_classification, s.overall_risk_level, s.verification_status
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=apaar_compliance_report_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
