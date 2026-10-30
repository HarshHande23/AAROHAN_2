import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.entities import Student, Institution, User, VerificationLog, AuditLog
from app.schemas.schemas import (
    StudentResponse, VerifyStudentRequest, 
    PublicVerificationRequest, PublicVerificationResponse
)
from app.api.students import student_to_response
from app.security.auth import get_current_user
from app.security.rbac import require_roles
from app.services.audit_service import log_audit

router = APIRouter(prefix="/verification", tags=["Academic Record & Credential Verification"])

@router.get("/pending", response_model=List[StudentResponse])
def get_pending_verifications(
    institution_id: Optional[int] = None,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "AUTHORIZED_VERIFIER"])),
    db: Session = Depends(get_db)
):
    """
    Returns student records currently pending verification or flagged for review.
    """
    query = db.query(Student).filter(
        or_(
            Student.verification_status == "PENDING",
            Student.verification_status == "FLAGGED",
            Student.overall_risk_level.in_(["HIGH", "CRITICAL"])
        )
    )

    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id:
        query = query.filter(Student.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(Student.institution_id == institution_id)

    records = query.order_by(Student.created_at.desc()).limit(100).all()
    return [student_to_response(s) for s in records]

@router.post("/public", response_model=PublicVerificationResponse)
def public_verify_record(
    payload: PublicVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Public / External Verification Gateway.
    Allows employers, regulatory bodies, and universities to verify student authenticity
    via APAAR ID, Student ID, or Certificate Number without exposing sensitive private contact info.
    """
    identifier = payload.identifier.strip().upper()
    if not identifier:
        raise HTTPException(status_code=400, detail="Identifier cannot be empty.")

    # Search by APAAR ID, Certificate Number, or Student ID
    student = (
        db.query(Student)
        .filter(
            or_(
                Student.apaar_id == identifier,
                Student.certificate_number == identifier,
                Student.student_id.ilike(identifier),
                Student.verification_code == identifier
            )
        )
        .first()
    )

    if not student:
        # Record lookup failure for security audit
        db.add(VerificationLog(
            apaar_id=identifier,
            verifier_type="PUBLIC_EMPLOYER",
            verifier_identifier="Public Gateway Client",
            verification_result="NOT_FOUND",
            verification_channel="PUBLIC_API",
            timestamp=datetime.datetime.utcnow()
        ))
        db.commit()

        return PublicVerificationResponse(
            verified=False,
            message="No matching academic record found in AICTE APAAR National Registry for this identifier."
        )

    inst = db.query(Institution).filter(Institution.id == student.institution_id).first()
    inst_name = inst.name if inst else "AICTE Approved Institution"

    # Mask student name for privacy (e.g. "Arjun Sundaram" -> "Arjun S.")
    parts = student.full_name.split()
    masked_name = f"{parts[0]} {parts[1][0]}." if len(parts) > 1 else parts[0]

    # Record successful lookup
    db.add(VerificationLog(
        student_id=student.id,
        apaar_id=student.apaar_id,
        certificate_number=student.certificate_number,
        verifier_type="PUBLIC_EMPLOYER",
        verifier_identifier="Public Gateway Client",
        verification_result="VERIFIED" if student.validation_status == "VALID" else "UNVERIFIED",
        verification_channel="PUBLIC_API",
        timestamp=datetime.datetime.utcnow()
    ))
    db.commit()

    return PublicVerificationResponse(
        verified=True,
        apaar_id=student.apaar_id,
        student_id=student.student_id,
        student_name=masked_name,
        institution_name=inst_name,
        degree_program=student.degree_program,
        academic_year=student.academic_year,
        certificate_number=student.certificate_number,
        certificate_issue_date=student.certificate_issue_date,
        verification_status=student.verification_status,
        verification_code=student.verification_code or f"VER-{student.id}",
        message="Authentic record verified against the AICTE APAAR National Central Repository."
    )

@router.post("/{student_id}", response_model=StudentResponse)
def verify_student_record(
    student_id: int,
    payload: VerifyStudentRequest,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "AUTHORIZED_VERIFIER"])),
    db: Session = Depends(get_db)
):
    """
    Public / External Verification Gateway.
    Allows employers, regulatory bodies, and universities to verify student authenticity
    via APAAR ID, Student ID, or Certificate Number without exposing sensitive private contact info.
    """
    identifier = payload.identifier.strip().upper()
    if not identifier:
        raise HTTPException(status_code=400, detail="Identifier cannot be empty.")

    # Search by APAAR ID, Certificate Number, or Student ID
    student = (
        db.query(Student)
        .filter(
            or_(
                Student.apaar_id == identifier,
                Student.certificate_number == identifier,
                Student.student_id.ilike(identifier),
                Student.verification_code == identifier
            )
        )
        .first()
    )

    if not student:
        # Record lookup failure for security audit
        db.add(VerificationLog(
            apaar_id=identifier,
            verifier_type="PUBLIC_EMPLOYER",
            verifier_identifier="Public Gateway Client",
            verification_result="NOT_FOUND",
            verification_channel="PUBLIC_API",
            timestamp=datetime.datetime.utcnow()
        ))
        db.commit()

        return PublicVerificationResponse(
            verified=False,
            message="No matching academic record found in AICTE APAAR National Registry for this identifier."
        )

    inst = db.query(Institution).filter(Institution.id == student.institution_id).first()
    inst_name = inst.name if inst else "AICTE Approved Institution"

    # Mask student name for privacy (e.g. "Arjun Sundaram" -> "Arjun S.")
    parts = student.full_name.split()
    masked_name = f"{parts[0]} {parts[1][0]}." if len(parts) > 1 else parts[0]

    # Record successful lookup
    db.add(VerificationLog(
        student_id=student.id,
        apaar_id=student.apaar_id,
        certificate_number=student.certificate_number,
        verifier_type="PUBLIC_EMPLOYER",
        verifier_identifier="Public Gateway Client",
        verification_result="VERIFIED" if student.validation_status == "VALID" else "UNVERIFIED",
        verification_channel="PUBLIC_API",
        timestamp=datetime.datetime.utcnow()
    ))
    db.commit()

    return PublicVerificationResponse(
        verified=True,
        apaar_id=student.apaar_id,
        student_id=student.student_id,
        student_name=masked_name,
        institution_name=inst_name,
        degree_program=student.degree_program,
        academic_year=student.academic_year,
        certificate_number=student.certificate_number,
        certificate_issue_date=student.certificate_issue_date,
        verification_status=student.verification_status,
        verification_code=student.verification_code or f"VER-{student.id}",
        message="Authentic record verified against the AICTE APAAR National Central Repository."
    )
