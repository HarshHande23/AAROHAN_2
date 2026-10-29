from typing import Tuple, Optional
from sqlalchemy.orm import Session
from app.models.entities import Student

class DuplicateService:
    @staticmethod
    def check_duplicate(db: Session, student_data: dict, exclude_id: Optional[int] = None) -> Tuple[bool, Optional[int], Optional[str]]:
        apaar_id = str(student_data.get("apaar_id", "")).strip().upper()
        cert_num = str(student_data.get("certificate_number", "")).strip().upper()
        student_id = str(student_data.get("student_id", "")).strip().upper()
        inst_id = student_data.get("institution_id")
        full_name = str(student_data.get("full_name", "")).strip().lower()
        dob = str(student_data.get("date_of_birth", "")).strip()

        # Check 1: Duplicate APAAR ID
        if apaar_id:
            query = db.query(Student).filter(Student.apaar_id == apaar_id)
            if exclude_id:
                query = query.filter(Student.id != exclude_id)
            existing = query.first()
            if existing:
                return True, existing.id, f"Deterministic duplicate: APAAR ID '{apaar_id}' already assigned to registered student #{existing.id} ({existing.full_name})."

        # Check 2: Duplicate Certificate / Credential Number
        if cert_num:
            query = db.query(Student).filter(Student.certificate_number == cert_num)
            if exclude_id:
                query = query.filter(Student.id != exclude_id)
            existing = query.first()
            if existing:
                return True, existing.id, f"Deterministic duplicate: Certificate document '{cert_num}' already registered to student #{existing.id} ({existing.full_name})."

        # Check 3: Same Institutional Roll/Registration Number
        if student_id and inst_id:
            query = db.query(Student).filter(
                Student.student_id == student_id,
                Student.institution_id == inst_id
            )
            if exclude_id:
                query = query.filter(Student.id != exclude_id)
            existing = query.first()
            if existing:
                return True, existing.id, f"Institutional collision: Roll number '{student_id}' already registered in institution #{inst_id} (Student #{existing.id})."

        # Check 4: Identity Collision (Name + DOB + Institution)
        if full_name and dob and inst_id:
            query = db.query(Student).filter(
                Student.full_name.ilike(full_name),
                Student.date_of_birth == dob,
                Student.institution_id == inst_id
            )
            if exclude_id:
                query = query.filter(Student.id != exclude_id)
            existing = query.first()
            if existing:
                return True, existing.id, f"Suspected identity collision: Same student name, birthdate, and institution as student #{existing.id}."

        return False, None, None

duplicate_service = DuplicateService()

