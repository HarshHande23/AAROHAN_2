import json
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.database import get_db
from app.models.entities import Student, Institution, DuplicateCase, Alert, User
from app.schemas.schemas import (
    StudentCreate, StudentUpdate, StudentResponse, StudentPaginatedResponse, VerifyStudentRequest
)
from app.security.auth import get_current_user
from app.security.rbac import require_roles
from app.services.pipeline_service import pipeline_service, PipelineResult
from app.services.audit_service import log_audit

router = APIRouter(prefix="/students", tags=["Students"])

def student_to_response(student: Student) -> StudentResponse:
    val_errors = []
    if student.validation_errors_json:
        try:
            val_errors = json.loads(student.validation_errors_json)
        except Exception:
            val_errors = []

    inst_name = student.institution.name if student.institution else "Unknown Institution"
    inst_code = student.institution.code if student.institution else "AICTE"

    return StudentResponse(
        id=student.id,
        apaar_id=student.apaar_id,
        student_id=student.student_id,
        full_name=student.full_name,
        email=student.email,
        phone=student.phone,
        gender=student.gender or "Other",
        date_of_birth=student.date_of_birth or "2000-01-01",
        institution_id=student.institution_id,
        institution_name=inst_name,
        institution_code=inst_code,
        degree_program=student.degree_program,
        department=student.department,
        academic_year=student.academic_year or "2025-2026",
        current_semester=student.current_semester or "1st",
        admission_date=student.admission_date or "2023-08-01",
        # SIH Specific Categories & Quotas
        admission_category=student.admission_category or "General",
        nri_status=student.nri_status or "No",
        oci_status=student.oci_status or "No",
        foreign_national_status=student.foreign_national_status or "No",
        supernumerary_quota=student.supernumerary_quota or "None",
        submission_source=student.submission_source or "MANUAL",
        # Indicators
        cgpa=student.cgpa,
        last_semester_gpa=student.last_semester_gpa,
        attendance_percentage=student.attendance_percentage,
        study_hours_per_day=student.study_hours_per_day,
        sleep_hours=student.sleep_hours,
        gaming_hours=student.gaming_hours,
        certificate_number=student.certificate_number,
        certificate_issue_date=student.certificate_issue_date,
        # Validation, Duplicates & Intake
        validation_status=student.validation_status,
        validation_errors=val_errors,
        duplicate_status=student.duplicate_status,
        duplicate_match_id=student.duplicate_match_id,
        duplicate_reason=student.duplicate_reason,
        is_cross_institution_duplicate=bool(student.is_cross_institution_duplicate),
        is_excess_intake=bool(student.is_excess_intake),
        # ML
        anomaly_status=student.anomaly_status,
        anomaly_score=student.anomaly_score,
        anomaly_reason=student.anomaly_reason,
        ml_classification=student.ml_classification,
        ml_confidence=student.ml_confidence,
        ml_reason=student.ml_reason,
        overall_risk_level=student.overall_risk_level,
        # Verification
        verification_status=student.verification_status,
        verified_at=student.verified_at,
        verified_by=student.verified_by,
        verification_notes=student.verification_notes,
        verification_code=student.verification_code,
        created_at=student.created_at,
        updated_at=student.updated_at
    )

@router.get("", response_model=StudentPaginatedResponse)
def get_students(
    search: Optional[str] = None,
    institution_id: Optional[int] = None,
    department: Optional[str] = None,
    validation_status: Optional[str] = None,
    duplicate_status: Optional[str] = None,
    anomaly_status: Optional[str] = None,
    ml_classification: Optional[str] = None,
    verification_status: Optional[str] = None,
    admission_category: Optional[str] = None,
    is_cross_institution_duplicate: Optional[bool] = None,
    is_excess_intake: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = "id",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Student)

    # Institution scope boundary for College Admin and Staff
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        query = query.filter(Student.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(Student.institution_id == institution_id)

    if search:
        search_filter = or_(
            Student.full_name.ilike(f"%{search}%"),
            Student.apaar_id.ilike(f"%{search}%"),
            Student.student_id.ilike(f"%{search}%"),
            Student.email.ilike(f"%{search}%"),
            Student.certificate_number.ilike(f"%{search}%"),
            Student.degree_program.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    if department:
        query = query.filter(Student.department == department)
    if validation_status:
        query = query.filter(Student.validation_status == validation_status)
    if duplicate_status:
        query = query.filter(Student.duplicate_status == duplicate_status)
    if anomaly_status:
        query = query.filter(Student.anomaly_status == anomaly_status)
    if ml_classification:
        query = query.filter(Student.ml_classification == ml_classification)
    if verification_status:
        query = query.filter(Student.verification_status == verification_status)
    if admission_category:
        query = query.filter(Student.admission_category == admission_category)
    if is_cross_institution_duplicate is not None:
        query = query.filter(Student.is_cross_institution_duplicate == is_cross_institution_duplicate)
    if is_excess_intake is not None:
        query = query.filter(Student.is_excess_intake == is_excess_intake)

    total = query.count()

    # Sort
    sort_column = getattr(Student, sort_by, Student.id)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return StudentPaginatedResponse(
        items=[student_to_response(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{id}", response_model=StudentResponse)
def get_student_by_id(
    id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id and student.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to cross-institutional student record.")

    return student_to_response(student)

@router.post("", response_model=StudentResponse)
def create_student(
    student_in: StudentCreate,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    """
    Direct single student enrolment. Feeds into the unified central pipeline service.
    """
    student_dict = student_in.model_dump()

    # College Admin can only enrol for their institution
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        student_dict["institution_id"] = current_user.institution_id

    result: PipelineResult = pipeline_service.process_student(
        db=db,
        raw_data=student_dict,
        submission_source="MANUAL",
        current_user=current_user,
        auto_commit=True
    )

    return student_to_response(result.student)

@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int,
    student_update: StudentUpdate,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id and student.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to cross-institutional student record.")

    update_dict = student_update.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(student, field, val)

    student.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(student)

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="STUDENT_UPDATED",
        entity_type="Student",
        entity_id=str(student.id),
        details=f"Updated student #{student.id}: {', '.join(update_dict.keys())}"
    )

    return student_to_response(student)

@router.delete("/{id}")
def delete_student(
    id: int,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id and student.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Cannot delete student belonging to another institution.")

    student_name = student.full_name
    apaar_id = student.apaar_id

    db.delete(student)
    db.commit()

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="STUDENT_DELETED",
        entity_type="Student",
        entity_id=str(id),
        details=f"Deleted student record: {student_name} ({apaar_id})"
    )

    return {"success": True, "message": f"Student #{id} deleted successfully."}

@router.post("/{id}/verify", response_model=StudentResponse)
def verify_student(
    id: int,
    payload: VerifyStudentRequest,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "AUTHORIZED_VERIFIER"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    new_status = payload.status.upper()
    if new_status not in ["VERIFIED", "REJECTED", "FLAGGED", "PENDING"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be VERIFIED, REJECTED, FLAGGED, or PENDING.")

    student.verification_status = new_status
    student.verified_at = datetime.datetime.utcnow()
    student.verified_by = current_user.email
    student.verification_notes = payload.notes
    student.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(student)

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="STUDENT_VERIFIED",
        entity_type="Student",
        entity_id=str(student.id),
        details=f"Marked verification as {new_status} by {current_user.email}. Notes: {payload.notes or 'None'}"
    )

    return student_to_response(student)
