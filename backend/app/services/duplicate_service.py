from typing import Optional
from sqlalchemy.orm import Session
from app.models.entities import Student, Institution

class DuplicateCheckResult:
    def __init__(
        self,
        is_duplicate: bool = False,
        match_id: Optional[int] = None,
        reason: Optional[str] = None,
        is_cross_institution: bool = False,
        matched_institution_id: Optional[int] = None,
        matched_institution_name: Optional[str] = None
    ):
        self.is_duplicate = is_duplicate
        self.match_id = match_id
        self.reason = reason
        self.is_cross_institution = is_cross_institution
        self.matched_institution_id = matched_institution_id
        self.matched_institution_name = matched_institution_name

    def __iter__(self):
        """Allows unpacking as (is_duplicate, match_id, reason) for full backward compatibility."""
        return iter([self.is_duplicate, self.match_id, self.reason])

    def __bool__(self):
        return self.is_duplicate


class DuplicateService:
    @staticmethod
    def check_duplicate(
        db: Session, 
        student_data: dict, 
        exclude_id: Optional[int] = None
    ) -> DuplicateCheckResult:
        apaar_id = str(student_data.get("apaar_id", "")).strip().upper()
        cert_num = str(student_data.get("certificate_number", "")).strip().upper()
        student_id = str(student_data.get("student_id", "")).strip().upper()
        inst_id = student_data.get("institution_id")
        full_name = str(student_data.get("full_name", "")).strip().lower()
        dob = str(student_data.get("date_of_birth", "")).strip()

        # Check 1: Duplicate APAAR ID (Cross-Institution or Internal)
        if apaar_id:
            query = db.query(Student).filter(Student.apaar_id == apaar_id)
            if exclude_id:
                query = query.filter(Student.id != exclude_id)
            existing = query.first()
            if existing:
                is_cross = (inst_id is not None and existing.institution_id != inst_id)
                matched_inst = db.query(Institution).filter(Institution.id == existing.institution_id).first()
                inst_name = matched_inst.name if matched_inst else f"Institution #{existing.institution_id}"
                
                if is_cross:
                    reason = (
                        f"Potential Cross-Institution Duplicate Enrolment: APAAR ID '{apaar_id}' "
                        f"is already actively registered at {inst_name} (Student #{existing.id} - {existing.full_name}). "
                        f"AICTE guidelines prohibit concurrent regular degree enrolment across multiple approved institutions."
                    )
                else:
                    reason = f"Deterministic duplicate: APAAR ID '{apaar_id}' already assigned to registered student #{existing.id} ({existing.full_name})."

                return DuplicateCheckResult(
                    is_duplicate=True,
                    match_id=existing.id,
                    reason=reason,
                    is_cross_institution=is_cross,
                    matched_institution_id=existing.institution_id,
                    matched_institution_name=inst_name
                )

        # Check 2: Duplicate Certificate / Credential Number
        if cert_num:
            query = db.query(Student).filter(Student.certificate_number == cert_num)
            if exclude_id:
                query = query.filter(Student.id != exclude_id)
            existing = query.first()
            if existing:
                matched_inst = db.query(Institution).filter(Institution.id == existing.institution_id).first()
                inst_name = matched_inst.name if matched_inst else f"Institution #{existing.institution_id}"
                is_cross = (inst_id is not None and existing.institution_id != inst_id)
                
                reason = (
                    f"Deterministic duplicate: Certificate document '{cert_num}' already registered to student "
                    f"#{existing.id} ({existing.full_name}) at {inst_name}."
                )
                return DuplicateCheckResult(
                    is_duplicate=True,
                    match_id=existing.id,
                    reason=reason,
                    is_cross_institution=is_cross,
                    matched_institution_id=existing.institution_id,
                    matched_institution_name=inst_name
                )

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
                return DuplicateCheckResult(
                    is_duplicate=True,
                    match_id=existing.id,
                    reason=f"Institutional collision: Roll number '{student_id}' already registered in institution #{inst_id} (Student #{existing.id}).",
                    is_cross_institution=False,
                    matched_institution_id=inst_id
                )

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
                return DuplicateCheckResult(
                    is_duplicate=True,
                    match_id=existing.id,
                    reason=f"Suspected identity collision: Same student name, birthdate, and institution as student #{existing.id}.",
                    is_cross_institution=False,
                    matched_institution_id=inst_id
                )

        return DuplicateCheckResult(is_duplicate=False)

duplicate_service = DuplicateService()
