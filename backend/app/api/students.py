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
from app.services.validation_service import validation_service
from app.services.duplicate_service import duplicate_service
from app.services.ml_service import ml_service
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
    inst_code = student.institution.code if student.institution else "UNK"

    return StudentResponse(
        id=student.id,
        apaar_id=student.apaar_id,
        student_id=student.student_id,
        full_name=student.full_name,
        email=student.email,
        phone=student.phone,
        gender=student.gender,
        date_of_birth=student.date_of_birth,
        institution_id=student.institution_id,
        institution_name=inst_name,
        institution_code=inst_code,
        degree_program=student.degree_program,
        department=student.department,
        academic_year=student.academic_year,
        current_semester=student.current_semester,
        admission_date=student.admission_date,
        cgpa=student.cgpa,
        last_semester_gpa=student.last_semester_gpa,
        attendance_percentage=student.attendance_percentage,
        study_hours_per_day=student.study_hours_per_day,
        sleep_hours=student.sleep_hours,
        gaming_hours=student.gaming_hours,
        certificate_number=student.certificate_number,
        certificate_issue_date=student.certificate_issue_date,
        validation_status=student.validation_status,
        validation_errors=val_errors,
        duplicate_status=student.duplicate_status,
        duplicate_match_id=student.duplicate_match_id,
        duplicate_reason=student.duplicate_reason,
        anomaly_status=student.anomaly_status,
        anomaly_score=student.anomaly_score,
        anomaly_reason=student.anomaly_reason,
        ml_classification=student.ml_classification,
        ml_confidence=student.ml_confidence,
        ml_reason=student.ml_reason,
        overall_risk_level=student.overall_risk_level,
        verification_status=student.verification_status,
        verified_at=student.verified_at,
        verified_by=student.verified_by,
        verification_notes=student.verification_notes,
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
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = "id",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Student)

    # Institution scope boundary for College Admin
    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id:
        query = query.filter(Student.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(Student.institution_id == institution_id)

    if search:
        search_filter = or_(
            Student.full_name.ilike(f"%{search}%"),
            Student.apaar_id.ilike(f"%{search}%"),
            Student.student_id.ilike(f"%{search}%"),
            Student.email.ilike(f"%{search}%"),
            Student.certificate_number.ilike(f"%{search}%")
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
def get_student_by_id(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id and student.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to cross-institutional student record.")

    return student_to_response(student)

@router.post("", response_model=StudentResponse)
def create_student(
    student_in: StudentCreate,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    student_dict = student_in.dict()

    # College Admin can only enrol for their institution
    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id:
        student_dict["institution_id"] = current_user.institution_id

    # 1. Deterministic Validation Engine
    is_valid, validation_errors = validation_service.validate_student_record(student_dict)
    val_status = "VALID" if is_valid else "INVALID"

    # 2. Deterministic Duplicate Detection
    is_dup, match_id, dup_reason = duplicate_service.check_duplicate(db, student_dict)
    dup_status = "DUPLICATE_FLAGGED" if is_dup else "UNIQUE"

    # 3. Isolation Forest Anomaly Detection Inference
    anom_status, anom_score, anom_reason = ml_service.run_isolation_forest_inference(student_dict)

    # 4. Random Forest Supervised Classification Inference
    ml_class, ml_conf, ml_reason = ml_service.run_random_forest_inference(student_dict)

    # 5. Combined Overall Risk Level
    overall_risk = ml_service.calculate_overall_risk(val_status, dup_status, anom_status, ml_class)

    # Create Student Database Entity
    new_student = Student(
        apaar_id=student_dict["apaar_id"],
        student_id=student_dict["student_id"],
        full_name=student_dict["full_name"],
        email=student_dict["email"],
        phone=student_dict.get("phone"),
        gender=student_dict.get("gender", "Other"),
        date_of_birth=student_dict.get("date_of_birth", "2000-01-01"),
        institution_id=student_dict["institution_id"],
        degree_program=student_dict["degree_program"],
        department=student_dict.get("department"),
        academic_year=student_dict.get("academic_year", "2025-2026"),
        current_semester=student_dict.get("current_semester", "1st"),
        admission_date=student_dict.get("admission_date", "2023-08-01"),
        cgpa=student_dict["cgpa"],
        last_semester_gpa=student_dict["last_semester_gpa"],
        attendance_percentage=student_dict["attendance_percentage"],
        study_hours_per_day=student_dict.get("study_hours_per_day", 4.0),
        sleep_hours=student_dict.get("sleep_hours", 7.0),
        gaming_hours=student_dict.get("gaming_hours", 1.0),
        certificate_number=student_dict["certificate_number"],
        certificate_issue_date=student_dict.get("certificate_issue_date", "2023-07-20"),
        validation_status=val_status,
        validation_errors_json=json.dumps(validation_errors),
        duplicate_status=dup_status,
        duplicate_match_id=match_id,
        duplicate_reason=dup_reason,
        anomaly_status=anom_status,
        anomaly_score=anom_score,
        anomaly_reason=anom_reason,
        ml_classification=ml_class,
        ml_confidence=ml_conf,
        ml_reason=ml_reason,
        overall_risk_level=overall_risk,
        verification_status="PENDING",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # 6. Automatic Alert Generation for actionable conditions
    if is_dup:
        db.add(DuplicateCase(
            student_id=new_student.id,
            matched_student_id=match_id,
            reason=dup_reason or "Duplicate identifier conflict"
        ))
        db.add(Alert(
            student_id=new_student.id,
            alert_type="DUPLICATE_DETECTED",
            severity="CRITICAL",
            reason=dup_reason or "Duplicate record flagged by deterministic engine.",
            status="NEW"
        ))

    if not is_valid:
        db.add(Alert(
            student_id=new_student.id,
            alert_type="INVALID_IDENTIFIER" if any("APAAR" in e for e in validation_errors) else "ACADEMIC_INCONSISTENCY",
            severity="WARNING",
            reason="; ".join(validation_errors),
            status="NEW"
        ))

    if anom_status == "ANOMALOUS":
        db.add(Alert(
            student_id=new_student.id,
            alert_type="ISOLATION_FOREST_ANOMALY",
            severity="WARNING",
            reason=anom_reason or "Statistical anomaly in student lifestyle/academic features.",
            status="NEW"
        ))

    if ml_class == "SUSPICIOUS":
        db.add(Alert(
            student_id=new_student.id,
            alert_type="RANDOM_FOREST_SUSPICIOUS",
            severity="CRITICAL",
            reason=ml_reason or "Supervised classifier flagged suspicious behavioral attributes.",
            status="NEW"
        ))

    db.commit()

    # 7. Audit Trail Logging
    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="STUDENT_ENROLLED",
        entity_type="Student",
        entity_id=str(new_student.id),
        details=f"Enrolled {new_student.full_name} ({new_student.apaar_id}). Validation: {val_status}, Duplicate: {dup_status}, Risk: {overall_risk}"
    )

    return student_to_response(new_student)

@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int,
    student_in: StudentUpdate,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id and student.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Unauthorized modification of cross-institutional record.")

    update_data = student_in.dict(exclude_unset=True)
    for field, val in update_data.items():
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
        details=f"Updated student #{student.id} ({student.full_name}). Modified fields: {list(update_data.keys())}"
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
        raise HTTPException(status_code=404, detail="Student record not found.")

    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id and student.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Unauthorized deletion of cross-institutional record.")

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
        details=f"Permanently deleted student #{id} ({student_name}, {apaar_id})"
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
        raise HTTPException(status_code=404, detail="Student record not found.")

    student.verification_status = payload.status
    student.verification_notes = payload.notes
    student.verified_at = datetime.datetime.utcnow()
    student.verified_by = current_user.email
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
        details=f"Updated verification status of #{student.id} to '{payload.status}'. Notes: {payload.notes or 'None'}"
    )

    return student_to_response(student)

