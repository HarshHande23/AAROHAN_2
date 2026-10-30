import re
import uuid
import json
import datetime
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    Student, Institution, InstitutionProgramIntake, 
    DuplicateCase, Alert, CredentialRecord
)
from app.services.validation_service import validation_service
from app.services.duplicate_service import duplicate_service, DuplicateCheckResult
from app.services.ml_service import ml_service
from app.services.audit_service import log_audit

class PipelineResult:
    def __init__(
        self,
        student: Optional[Student] = None,
        is_valid: bool = False,
        validation_errors: List[str] = None,
        is_duplicate: bool = False,
        is_cross_institution: bool = False,
        duplicate_reason: Optional[str] = None,
        duplicate_match_id: Optional[int] = None,
        is_excess_intake: bool = False,
        intake_info: Optional[Dict[str, Any]] = None,
        anomaly_status: str = "NOT_EVALUATED",
        anomaly_score: Optional[float] = None,
        anomaly_reason: Optional[str] = None,
        ml_classification: str = "NOT_EVALUATED",
        ml_confidence: Optional[float] = None,
        ml_reason: Optional[str] = None,
        overall_risk: str = "LOW",
        corrections: List[Dict[str, str]] = None,
        verification_code: Optional[str] = None
    ):
        self.student = student
        self.is_valid = is_valid
        self.validation_errors = validation_errors or []
        self.is_duplicate = is_duplicate
        self.is_cross_institution = is_cross_institution
        self.duplicate_reason = duplicate_reason
        self.duplicate_match_id = duplicate_match_id
        self.is_excess_intake = is_excess_intake
        self.intake_info = intake_info or {}
        self.anomaly_status = anomaly_status
        self.anomaly_score = anomaly_score
        self.anomaly_reason = anomaly_reason
        self.ml_classification = ml_classification
        self.ml_confidence = ml_confidence
        self.ml_reason = ml_reason
        self.overall_risk = overall_risk
        self.corrections = corrections or []
        self.verification_code = verification_code


class PipelineService:
    @staticmethod
    def apply_safe_corrections(data: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
        """
        Deterministic, safe, non-destructive formatting corrections:
        - Trim whitespace on all string values
        - Uppercase APAAR ID and certificate numbers
        - Lowercase email
        - Capitalize Yes/No category flags
        Never invents missing data, never alters names or academic numbers.
        """
        corrected = dict(data)
        corrections = []

        for k, v in list(corrected.items()):
            if isinstance(v, str):
                trimmed = v.strip()
                final = trimmed

                if k in ("apaar_id", "certificate_number"):
                    final = trimmed.upper()
                elif k == "email":
                    final = trimmed.lower()
                elif k in ("nri_status", "oci_status", "foreign_national_status"):
                    final = trimmed.capitalize()

                if final != v:
                    corrections.append({
                        "field": k,
                        "original": v,
                        "corrected": final,
                        "reason": (
                            "Whitespace removed and uppercase normalized" if k in ("apaar_id", "certificate_number")
                            else "Whitespace removed and lowercase normalized" if k == "email"
                            else "Leading/trailing whitespace trimmed"
                        )
                    })
                    corrected[k] = final

        return corrected, corrections

    @staticmethod
    def check_intake_limit(
        db: Session,
        institution_id: int,
        program_name: str,
        academic_year: str = "2025-2026"
    ) -> Dict[str, Any]:
        """
        Calculates approved intake vs actual enrolment in real-time.
        Flags admissions exceeding approved intake.
        """
        norm_prog = str(program_name).strip().lower()
        
        # Look up intake configuration
        intake_config = (
            db.query(InstitutionProgramIntake)
            .filter(
                InstitutionProgramIntake.institution_id == institution_id,
                InstitutionProgramIntake.academic_year == academic_year
            )
            .all()
        )
        
        # Match program loosely (case-insensitive or prefix)
        matched_config = None
        for cfg in intake_config:
            if cfg.program_name.strip().lower() == norm_prog or norm_prog in cfg.program_name.strip().lower():
                matched_config = cfg
                break

        # Count current enrolled students in this institution, program, and year
        current_count = (
            db.query(Student)
            .filter(
                Student.institution_id == institution_id,
                Student.degree_program.ilike(f"%{program_name.strip()}%"),
                Student.academic_year == academic_year
            )
            .count()
        )

        if matched_config:
            approved = matched_config.approved_intake
            supernumerary = matched_config.supernumerary_seats
            is_excess = current_count >= approved
            excess_count = max(0, current_count + 1 - approved)
            return {
                "configured": True,
                "approved_intake": approved,
                "supernumerary_seats": supernumerary,
                "current_enrolment": current_count,
                "is_excess": is_excess,
                "excess_count": excess_count,
                "utilization_pct": round((current_count / approved) * 100, 1) if approved > 0 else 0.0,
                "program_name": matched_config.program_name
            }
        else:
            # Default institutional quota if not specifically configured
            return {
                "configured": False,
                "approved_intake": 120,
                "supernumerary_seats": 10,
                "current_enrolment": current_count,
                "is_excess": False,
                "excess_count": 0,
                "utilization_pct": round((current_count / 120) * 100, 1),
                "program_name": program_name
            }

    @classmethod
    def process_student(
        cls,
        db: Session,
        raw_data: Dict[str, Any],
        submission_source: str = "MANUAL",
        batch_id: Optional[str] = None,
        current_user: Optional[Any] = None,
        auto_commit: bool = True
    ) -> PipelineResult:
        """
        Unified processing pipeline for ALL submission channels:
        Manual Entry, CSV Ingestion, and Institution ERP/SIS API Integration.
        """
        # 1. Safe deterministic formatting corrections
        corrected_data, corrections = cls.apply_safe_corrections(raw_data)

        inst_id = int(corrected_data.get("institution_id", 1))
        prog_name = str(corrected_data.get("degree_program", "")).strip()
        acad_year = str(corrected_data.get("academic_year", "2025-2026")).strip()

        # 2. Automated Validation
        is_valid, validation_errors = validation_service.validate_student_record(corrected_data)

        # 3. Duplicate Detection (Internal and Cross-Institution)
        dup_res: DuplicateCheckResult = duplicate_service.check_duplicate(db, corrected_data)
        is_dup = dup_res.is_duplicate
        dup_match_id = dup_res.match_id
        dup_reason = dup_res.reason
        is_cross_inst = dup_res.is_cross_institution

        # 4. Intake Monitoring Check
        intake_info = cls.check_intake_limit(db, inst_id, prog_name, acad_year)
        is_excess = intake_info.get("is_excess", False)

        # 5. Isolation Forest Anomaly Detection
        anom_status = "NOT_EVALUATED"
        anom_score = None
        anom_reason = None
        if is_valid:
            anom_status, anom_score, anom_reason = ml_service.run_isolation_forest_inference(corrected_data)

        # 6. Random Forest Inference (Supervised Classification)
        ml_class = "NOT_EVALUATED"
        ml_conf = None
        ml_reason = None
        if is_valid:
            ml_class, ml_conf, ml_reason = ml_service.run_random_forest_inference(corrected_data)

        # 7. Combined Overall Risk Level
        val_status_str = "VALID" if is_valid else "INVALID"
        dup_status_str = "DUPLICATE_FLAGGED" if is_dup else "UNIQUE"
        overall_risk = ml_service.calculate_overall_risk(
            val_status_str, dup_status_str, anom_status, ml_class
        )
        if is_cross_inst or is_excess:
            overall_risk = "HIGH" if overall_risk in ("LOW", "MEDIUM") else overall_risk

        # Generate unique verification code
        v_code = f"VER-APAAR-{uuid.uuid4().hex[:10].upper()}"

        # 8. Create Student Entity
        new_student = Student(
            apaar_id=str(corrected_data.get("apaar_id", "")).strip().upper(),
            student_id=str(corrected_data.get("student_id", "")).strip(),
            full_name=str(corrected_data.get("full_name", "")).strip(),
            email=str(corrected_data.get("email", "")).strip().lower(),
            phone=str(corrected_data.get("phone", "")).strip() or None,
            gender=str(corrected_data.get("gender", "Other")),
            date_of_birth=str(corrected_data.get("date_of_birth", "2000-01-01")),
            institution_id=inst_id,
            degree_program=prog_name,
            department=str(corrected_data.get("department", "")).strip() or None,
            academic_year=acad_year,
            current_semester=str(corrected_data.get("current_semester", "1st")),
            admission_date=str(corrected_data.get("admission_date", "2023-08-01")),
            # Categories & Quotas
            admission_category=str(corrected_data.get("admission_category", "General")),
            nri_status=str(corrected_data.get("nri_status", "No")),
            oci_status=str(corrected_data.get("oci_status", "No")),
            foreign_national_status=str(corrected_data.get("foreign_national_status", "No")),
            supernumerary_quota=str(corrected_data.get("supernumerary_quota", "None")),
            submission_source=submission_source,
            submission_batch_id=batch_id,
            # Indicators
            cgpa=float(corrected_data.get("cgpa", 0.0)),
            last_semester_gpa=float(corrected_data.get("last_semester_gpa", 0.0)),
            attendance_percentage=float(corrected_data.get("attendance_percentage", 0.0)),
            study_hours_per_day=float(corrected_data.get("study_hours_per_day", 4.0)),
            sleep_hours=float(corrected_data.get("sleep_hours", 7.0)),
            gaming_hours=float(corrected_data.get("gaming_hours", 1.0)),
            # Document credentials
            certificate_number=str(corrected_data.get("certificate_number", "")).strip().upper(),
            certificate_issue_date=str(corrected_data.get("certificate_issue_date", "2023-07-20")),
            # Validation & Flags
            validation_status=val_status_str,
            validation_errors_json=json.dumps(validation_errors),
            duplicate_status=dup_status_str,
            duplicate_match_id=dup_match_id,
            duplicate_reason=dup_reason,
            is_cross_institution_duplicate=is_cross_inst,
            is_excess_intake=is_excess,
            # ML
            anomaly_status=anom_status,
            anomaly_score=anom_score,
            anomaly_reason=anom_reason,
            ml_classification=ml_class,
            ml_confidence=ml_conf,
            ml_reason=ml_reason,
            overall_risk_level=overall_risk,
            verification_status="PENDING",
            verification_code=v_code,
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow()
        )

        db.add(new_student)
        db.flush()

        # 9. Create Credential Record
        cred_rec = CredentialRecord(
            student_id=new_student.id,
            credential_id=f"CRED-APAAR-{new_student.id}-{uuid.uuid4().hex[:6].upper()}",
            verification_code=v_code,
            certificate_number=new_student.certificate_number,
            status="ACTIVE",
            qr_payload=f"AICTE-APAAR://VERIFY?apaar={new_student.apaar_id}&code={v_code}&inst={inst_id}",
            issued_at=datetime.datetime.utcnow(),
            issued_by=current_user.email if current_user else "AICTE Platform"
        )
        db.add(cred_rec)

        # 10. Generate System Alerts
        if is_dup:
            db.add(DuplicateCase(
                student_id=new_student.id,
                matched_student_id=dup_match_id,
                reason=dup_reason or "Duplicate record flagged.",
                is_cross_institution=is_cross_inst,
                matched_institution_id=dup_res.matched_institution_id,
                created_at=datetime.datetime.utcnow()
            ))
            alert_type = "CROSS_INSTITUTION_DUPLICATE" if is_cross_inst else "DUPLICATE_DETECTED"
            db.add(Alert(
                student_id=new_student.id,
                institution_id=inst_id,
                alert_type=alert_type,
                severity="CRITICAL",
                reason=dup_reason or "Duplicate detection conflict flagged.",
                status="NEW"
            ))

        if is_excess:
            db.add(Alert(
                student_id=new_student.id,
                institution_id=inst_id,
                alert_type="EXCESS_ENROLMENT",
                severity="CRITICAL",
                reason=(
                    f"Admissions exceed approved intake! Program '{prog_name}' has approved intake of "
                    f"{intake_info['approved_intake']}, current enrolment reached {intake_info['current_enrolment'] + 1}."
                ),
                status="NEW"
            ))

        if anom_status == "ANOMALOUS":
            db.add(Alert(
                student_id=new_student.id,
                institution_id=inst_id,
                alert_type="ISOLATION_FOREST_ANOMALY",
                severity="WARNING",
                reason=anom_reason or "Statistical outlier detected via Isolation Forest. Requires manual verification.",
                status="NEW"
            ))

        if ml_class == "SUSPICIOUS":
            db.add(Alert(
                student_id=new_student.id,
                institution_id=inst_id,
                alert_type="RANDOM_FOREST_SUSPICIOUS",
                severity="CRITICAL",
                reason=ml_reason or "Supervised classifier marked suspicious behavioral indicators. Human review required.",
                status="NEW"
            ))

        if auto_commit:
            db.commit()
            user_email = current_user.email if current_user else "api-system@aicte.gov.in"
            user_role = current_user.role if current_user else "SYSTEM"
            log_audit(
                db=db,
                user_email=user_email,
                user_role=user_role,
                action="STUDENT_ENROLLED",
                entity_type="Student",
                entity_id=str(new_student.id),
                details=(
                    f"Enrolled {new_student.full_name} ({new_student.apaar_id}) via {submission_source}. "
                    f"Validation: {val_status_str}, Duplicates: {dup_status_str}, "
                    f"Excess Intake: {is_excess}, IF Anomaly: {anom_status}"
                )
            )

        return PipelineResult(
            student=new_student,
            is_valid=is_valid,
            validation_errors=validation_errors,
            is_duplicate=is_dup,
            is_cross_institution=is_cross_inst,
            duplicate_reason=dup_reason,
            duplicate_match_id=dup_match_id,
            is_excess_intake=is_excess,
            intake_info=intake_info,
            anomaly_status=anom_status,
            anomaly_score=anom_score,
            anomaly_reason=anom_reason,
            ml_classification=ml_class,
            ml_confidence=ml_conf,
            ml_reason=ml_reason,
            overall_risk=overall_risk,
            corrections=corrections,
            verification_code=v_code
        )

pipeline_service = PipelineService()
