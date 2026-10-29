import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.entities import Student, User
from app.security.auth import get_current_user
from app.services.validation_service import validation_service

router = APIRouter(prefix="/validation", tags=["Validation"])

@router.post("/{student_id}")
def validate_student(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student_dict = {
        "apaar_id": student.apaar_id,
        "student_id": student.student_id,
        "full_name": student.full_name,
        "email": student.email,
        "institution_id": student.institution_id,
        "degree_program": student.degree_program,
        "cgpa": student.cgpa,
        "last_semester_gpa": student.last_semester_gpa,
        "attendance_percentage": student.attendance_percentage,
        "certificate_number": student.certificate_number,
        "admission_date": student.admission_date,
        "certificate_issue_date": student.certificate_issue_date
    }

    is_valid, errors = validation_service.validate_student_record(student_dict)
    student.validation_status = "VALID" if is_valid else "INVALID"
    student.validation_errors_json = json.dumps(errors)
    db.commit()

    return {
        "validation_status": student.validation_status,
        "errors": errors,
        "is_valid": is_valid
    }

@router.get("/summary")
def get_validation_summary(db: Session = Depends(get_db)):
    total = db.query(Student).count()
    valid_count = db.query(Student).filter(Student.validation_status == "VALID").count()
    invalid_count = db.query(Student).filter(Student.validation_status == "INVALID").count()

    return {
        "total_validated": total,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "common_errors": [
            {"rule": "APAAR Identifier Schema", "count": 0},
            {"rule": "CGPA & Scale Bounds", "count": 0},
            {"rule": "Attendance Percentage Range", "count": 0},
            {"rule": "Chronology Consistency", "count": 0}
        ]
    }

