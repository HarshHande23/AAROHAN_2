from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Student, Institution, CredentialRecord, User
from app.schemas.schemas import CredentialResponse
from app.security.auth import get_current_user

router = APIRouter(prefix="/credentials", tags=["Student Academic Credentials"])

def build_credential_response(student: Student, db: Session) -> CredentialResponse:
    inst = db.query(Institution).filter(Institution.id == student.institution_id).first()
    inst_name = inst.name if inst else "Unknown Institution"
    inst_code = inst.code if inst else "AICTE"

    cred_rec = db.query(CredentialRecord).filter(CredentialRecord.student_id == student.id).first()
    cred_id = cred_rec.credential_id if cred_rec else f"CRED-APAAR-{student.id}"
    v_code = student.verification_code or (cred_rec.verification_code if cred_rec else f"VER-{student.id}")
    status_str = cred_rec.status if cred_rec else "ACTIVE"
    issued_at = cred_rec.issued_at if cred_rec else student.created_at

    qr_payload = f"https://apaar.aicte-india.org/verify?apaar={student.apaar_id}&cert={student.certificate_number}&code={v_code}"

    return CredentialResponse(
        credential_id=cred_id,
        verification_code=v_code,
        student_id=student.id,
        apaar_id=student.apaar_id,
        student_name=student.full_name,
        institution_name=inst_name,
        institution_code=inst_code,
        degree_program=student.degree_program,
        academic_year=student.academic_year,
        certificate_number=student.certificate_number,
        certificate_issue_date=student.certificate_issue_date,
        status=status_str,
        qr_payload=qr_payload,
        issued_at=issued_at
    )

@router.get("", response_model=List[CredentialResponse])
def list_credentials(
    institution_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List verifiable student academic credentials.
    """
    query = db.query(Student)
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        query = query.filter(Student.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(Student.institution_id == institution_id)

    students = query.order_by(Student.created_at.desc()).limit(100).all()
    return [build_credential_response(s, db) for s in students]

@router.get("/{student_id}", response_model=CredentialResponse)
def get_student_credential(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get official credential display for a specific student.
    Displays APAAR ID alongside Student ID and Certificate details.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student credential record not found.")

    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id != student.institution_id:
        raise HTTPException(status_code=403, detail="Cannot access credential for another institution.")

    return build_credential_response(student, db)
