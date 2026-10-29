import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.entities import Student, Institution, User
from app.schemas.schemas import ComplianceReportResponse
from app.security.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Compliance Reports"])

@router.get("", response_model=ComplianceReportResponse)
def get_compliance_report(
    institution_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Student)

    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id:
        query = query.filter(Student.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(Student.institution_id == institution_id)

    if academic_year:
        query = query.filter(Student.academic_year == academic_year)

    total_enrolled = query.count()
    if total_enrolled == 0:
        return ComplianceReportResponse(
            generated_at=datetime.datetime.utcnow(),
            filter_institution=None,
            total_enrolled=0,
            valid_percentage=0.0,
            duplicate_rate=0.0,
            anomaly_rate=0.0,
            suspicious_rate=0.0,
            verified_percentage=0.0,
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
                "anomalies": inst_query.filter(Student.anomaly_status == "ANOMALOUS").count(),
                "suspicious": inst_query.filter(Student.ml_classification == "SUSPICIOUS").count(),
            })

    return ComplianceReportResponse(
        generated_at=datetime.datetime.utcnow(),
        filter_institution=str(institution_id) if institution_id else None,
        total_enrolled=total_enrolled,
        valid_percentage=round((valid_count / total_enrolled) * 100, 2),
        duplicate_rate=round((dup_count / total_enrolled) * 100, 2),
        anomaly_rate=round((anom_count / total_enrolled) * 100, 2),
        suspicious_rate=round((susp_count / total_enrolled) * 100, 2),
        verified_percentage=round((verified_count / total_enrolled) * 100, 2),
        institution_breakdown=breakdown
    )

