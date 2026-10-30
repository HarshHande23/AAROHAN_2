"""
Bulk Import API — Two-phase workflow
  Phase 1: POST /analyze    — parse, safe corrections, validate, dedup, intake check, ML; return analysis; save CSV to disk
  Phase 2: POST /confirm    — store approved records in DB; generate credentials; log audit
  Extra:   DELETE /{id}/source-file — delete uploaded CSV (not DB records)
           GET /batches             — batch history
           GET /template            — download CSV template
"""
import io
import os
import re
import uuid
import json
import datetime
import pandas as pd
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Student, Institution, DuplicateCase, Alert, User, ImportBatch, CredentialRecord
from app.schemas.schemas import (
    BatchAnalysisResponse, AnalyzedRecord, CorrectionItem,
    ConfirmImportRequest, ConfirmImportResponse,
    BatchSummaryResponse,
    BulkImportErrorItem, BulkImportResponseSchema,
)
from app.api.students import student_to_response
from app.security.auth import get_current_user
from app.security.rbac import require_roles
from app.services.validation_service import validation_service
from app.services.duplicate_service import duplicate_service, DuplicateCheckResult
from app.services.ml_service import ml_service
from app.services.pipeline_service import pipeline_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/bulk-import", tags=["Bulk Import"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe_str(val: Any) -> str:
    if pd.isna(val) if not isinstance(val, str) else False:
        return ""
    return str(val)


def apply_safe_corrections(row_dict: Dict[str, Any]) -> tuple[Dict[str, Any], List[CorrectionItem]]:
    corrected = dict(row_dict)
    corrections: List[CorrectionItem] = []

    string_fields = [
        "apaar_id", "student_id", "full_name", "email", "phone",
        "gender", "date_of_birth", "degree_program", "department",
        "academic_year", "current_semester", "admission_date",
        "certificate_number", "certificate_issue_date",
        "admission_category", "nri_status", "oci_status", "foreign_national_status"
    ]

    for field in string_fields:
        original = str(corrected.get(field, ""))
        trimmed = original.strip()

        if field in ("apaar_id", "certificate_number"):
            final = trimmed.upper()
        elif field == "email":
            final = trimmed.lower()
        elif field in ("nri_status", "oci_status", "foreign_national_status"):
            final = trimmed.capitalize()
        else:
            final = trimmed

        if final != original:
            corrections.append(CorrectionItem(
                field=field,
                original=original,
                corrected=final,
                reason=(
                    "Leading/trailing whitespace removed"
                    if trimmed == original else
                    "Whitespace removed and normalised to uppercase"
                    if field in ("apaar_id", "certificate_number") else
                    "Whitespace removed and normalised to lowercase"
                    if field == "email" else
                    "Leading/trailing whitespace removed"
                )
            ))
            corrected[field] = final

    return corrected, corrections


def _check_batch_duplicate(
    row_dict: Dict[str, Any],
    seen: Dict[str, Dict[str, int]],
    row_num: int
) -> tuple[bool, Optional[str]]:
    checks = [
        ("apaar_id", "APAAR ID"),
        ("student_id", "Student ID"),
        ("email", "Email address"),
        ("certificate_number", "Certificate number"),
    ]
    for key, label in checks:
        val = str(row_dict.get(key, "")).strip().upper()
        if val and val in seen.get(key, {}):
            prev_row = seen[key][val]
            return True, f"Intra-batch duplicate: {label} '{val}' also appears in row {prev_row}."
    return False, None


def _register_seen(row_dict: Dict[str, Any], seen: Dict[str, Dict[str, int]], row_num: int):
    for key in ("apaar_id", "student_id", "email", "certificate_number"):
        val = str(row_dict.get(key, "")).strip().upper()
        if val:
            seen.setdefault(key, {})[val] = row_num


# ─── Template ─────────────────────────────────────────────────────────────────

@router.get("/template", response_class=PlainTextResponse)
def get_template():
    return (
        "apaar_id,student_id,full_name,email,phone,gender,date_of_birth,"
        "degree_program,department,academic_year,current_semester,"
        "admission_date,admission_category,nri_status,oci_status,foreign_national_status,supernumerary_quota,"
        "cgpa,last_semester_gpa,attendance_percentage,"
        "study_hours_per_day,sleep_hours,gaming_hours,"
        "certificate_number,certificate_issue_date\n"
        "APAAR-2026-9001,REG-2026-9001,Aarav Patel,aarav.patel@example.edu,+919876543210,Male,2003-08-14,"
        "B.Tech Computer Science and Engineering,Computer Science,2025-2026,6th,"
        "2022-08-01,General,No,No,No,None,3.82,3.85,92.0,6.5,7.0,1.0,"
        "CERT-2026-90010,2022-08-15\n"
    )


# ─── Batch History ─────────────────────────────────────────────────────────────

@router.get("/batches", response_model=List[BatchSummaryResponse])
def get_batch_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ImportBatch)
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        query = query.filter(ImportBatch.institution_id == current_user.institution_id)
        
    batches = (
        query
        .order_by(ImportBatch.created_at.desc())
        .limit(50)
        .all()
    )
    return batches


# ─── Phase 1: Analyze ─────────────────────────────────────────────────────────

@router.post("/analyze", response_model=BatchAnalysisResponse)
async def analyze_bulk_file(
    file: UploadFile = File(...),
    institution_id: Optional[int] = Form(None),
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    """
    Phase 1 — Parse → Safe-correct → Validate → Detect duplicates & cross-institution collisions → Check intake limits → Run ML.
    Saves the uploaded CSV to disk and analysis results to DB.
    Does NOT store student records yet.
    """
    target_inst_id = (
        current_user.institution_id
        if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF")
        else (institution_id or 1)
    )
    inst = db.query(Institution).filter(Institution.id == target_inst_id).first()
    if not inst:
        raise HTTPException(status_code=400, detail=f"Institution #{target_inst_id} does not exist.")

    contents = await file.read()
    filename = file.filename or "upload.csv"

    # Parse
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Upload .csv or .xlsx")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="File contains zero data rows.")

    required_cols = ["apaar_id", "student_id", "full_name", "email", "degree_program", "certificate_number"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")

    # Generate batch ID and save file to disk
    batch_id = str(uuid.uuid4())[:8].upper()
    safe_fname = re.sub(r"[^\w.\-]", "_", filename)
    dest_path = UPLOAD_DIR / f"{batch_id}_{safe_fname}"
    dest_path.write_bytes(contents)

    # Create batch record (status=ANALYZING)
    batch = ImportBatch(
        batch_id=batch_id,
        submission_method="CSV",
        filename=filename,
        source_file_path=str(dest_path),
        uploaded_by=current_user.email,
        uploaded_by_role=current_user.role,
        institution_id=target_inst_id,
        status="ANALYZING",
        total_records=len(df),
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )
    db.add(batch)
    db.flush()

    # ── Per-row analysis ─────────────────────────────────────────────────────
    analyzed_records: List[AnalyzedRecord] = []
    seen: Dict[str, Dict[str, int]] = {}

    counters = dict(
        valid=0, issues=0, dups=0, cross_dups=0, excess_intake=0,
        anomalies=0, suspicious=0, genuine=0, corrections=0, manual_review=0
    )

    for idx, row in df.iterrows():
        row_num = int(idx) + 2

        # 1. Raw row dict
        raw = {k: ("" if (not isinstance(v, str) and pd.isna(v)) else v)
               for k, v in row.to_dict().items()}
        raw["institution_id"] = target_inst_id

        # 2. Coerce numeric fields
        for num_field, default in [
            ("cgpa", 0.0), ("last_semester_gpa", 0.0),
            ("attendance_percentage", 0.0), ("study_hours_per_day", 4.0),
            ("sleep_hours", 7.0), ("gaming_hours", 1.0),
        ]:
            try:
                raw[num_field] = float(raw.get(num_field, default))
            except (ValueError, TypeError):
                raw[num_field] = default

        # 3. Safe automatic corrections
        corrected, corrections = apply_safe_corrections(raw)
        if corrections:
            counters["corrections"] += 1

        # 4. Deterministic validation
        is_valid, validation_errors = validation_service.validate_student_record(corrected)

        # 5. Intra-batch duplicate check
        is_dup_batch, batch_dup_reason = _check_batch_duplicate(corrected, seen, row_num)
        _register_seen(corrected, seen, row_num)

        # 6. DB duplicate check & cross-institution detection
        is_dup_db = False
        db_dup_match_id = None
        db_dup_reason = None
        is_cross_inst = False

        if is_valid and not is_dup_batch:
            dup_res: DuplicateCheckResult = duplicate_service.check_duplicate(db, corrected)
            is_dup_db = dup_res.is_duplicate
            db_dup_match_id = dup_res.match_id
            db_dup_reason = dup_res.reason
            is_cross_inst = dup_res.is_cross_institution

        is_any_dup = is_dup_db or is_dup_batch

        # 7. Intake Capacity Check
        prog_name = str(corrected.get("degree_program", "")).strip()
        acad_year = str(corrected.get("academic_year", "2025-2026")).strip()
        intake_info = pipeline_service.check_intake_limit(db, target_inst_id, prog_name, acad_year)
        is_excess = intake_info.get("is_excess", False)
        intake_warn = None
        if is_excess:
            counters["excess_intake"] += 1
            intake_warn = f"Intake capacity exceeded! Approved: {intake_info['approved_intake']}, Enrolled: {intake_info['current_enrolment'] + 1}."

        # 8. ML inference
        anom_status = "NOT_RUN"
        anom_score = None
        anom_reason = None
        ml_class = "NOT_RUN"
        ml_conf = None
        ml_reason = None

        if is_valid:
            anom_status, anom_score, anom_reason = ml_service.run_isolation_forest_inference(corrected)
            ml_class, ml_conf, ml_reason = ml_service.run_random_forest_inference(corrected)

        # 9. Overall risk
        overall_risk = ml_service.calculate_overall_risk(
            "VALID" if is_valid else "INVALID",
            "DUPLICATE_FLAGGED" if is_any_dup else "UNIQUE",
            anom_status if anom_status != "NOT_RUN" else "NORMAL",
            ml_class if ml_class != "NOT_RUN" else "GENUINE",
        )
        if is_cross_inst or is_excess:
            overall_risk = "HIGH" if overall_risk in ("LOW", "MEDIUM") else overall_risk

        # 10. Update counters
        if is_valid and not is_any_dup:
            counters["valid"] += 1
        if not is_valid:
            counters["issues"] += 1
        if is_any_dup:
            counters["dups"] += 1
        if is_cross_inst:
            counters["cross_dups"] += 1
        if anom_status == "ANOMALOUS":
            counters["anomalies"] += 1
        if ml_class == "SUSPICIOUS":
            counters["suspicious"] += 1
        if ml_class == "GENUINE" and anom_status == "NORMAL":
            counters["genuine"] += 1
        if anom_status == "ANOMALOUS" or ml_class == "SUSPICIOUS" or is_cross_inst or is_excess:
            counters["manual_review"] += 1

        include = is_valid and not is_any_dup

        rec = AnalyzedRecord(
            row=row_num,
            original_data={k: str(v) for k, v in raw.items() if k != "institution_id"},
            corrected_data={k: str(v) for k, v in corrected.items() if k != "institution_id"},
            corrections=corrections,
            validation_errors=validation_errors,
            is_valid=is_valid,
            is_duplicate_in_db=is_dup_db,
            is_duplicate_in_batch=is_dup_batch,
            is_cross_institution=is_cross_inst,
            duplicate_reason=db_dup_reason or batch_dup_reason,
            duplicate_match_id=db_dup_match_id,
            is_excess_intake=is_excess,
            intake_warning=intake_warn,
            anomaly_status=anom_status,
            anomaly_score=round(anom_score, 4) if anom_score is not None else None,
            anomaly_reason=anom_reason,
            ml_classification=ml_class,
            ml_confidence=round(ml_conf, 4) if ml_conf is not None else None,
            ml_reason=ml_reason,
            overall_risk=overall_risk,
            include_in_import=include,
        )
        analyzed_records.append(rec)

    # ── Update batch record ──────────────────────────────────────────────────
    batch.valid_records = counters["valid"]
    batch.validation_issues_count = counters["issues"]
    batch.duplicate_count = counters["dups"]
    batch.cross_institution_duplicate_count = counters["cross_dups"]
    batch.excess_intake_count = counters["excess_intake"]
    batch.anomaly_count = counters["anomalies"]
    batch.suspicious_count = counters["suspicious"]
    batch.genuine_count = counters["genuine"]
    batch.auto_corrections_count = counters["corrections"]
    batch.manual_review_count = counters["manual_review"]
    batch.status = "PENDING_CONFIRMATION"
    batch.processing_timestamp = datetime.datetime.utcnow()
    batch.updated_at = datetime.datetime.utcnow()

    batch.analysis_data_json = json.dumps([r.model_dump() for r in analyzed_records])

    db.commit()

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="BULK_IMPORT_ANALYZED",
        entity_type="ImportBatch",
        entity_id=batch_id,
        details=(
            f"Analyzed '{filename}'. Total: {len(df)}, Valid: {counters['valid']}, "
            f"Issues: {counters['issues']}, Dups: {counters['dups']}, Cross-Dups: {counters['cross_dups']}, "
            f"Excess: {counters['excess_intake']}, Anomalies: {counters['anomalies']}, Corrections: {counters['corrections']}"
        )
    )

    return BatchAnalysisResponse(
        batch_id=batch_id,
        filename=filename,
        total_records=len(df),
        valid_records=counters["valid"],
        validation_issues=counters["issues"],
        duplicate_count=counters["dups"],
        cross_institution_duplicate_count=counters["cross_dups"],
        excess_intake_count=counters["excess_intake"],
        anomaly_count=counters["anomalies"],
        suspicious_count=counters["suspicious"],
        auto_corrections_count=counters["corrections"],
        manual_review_count=counters["manual_review"],
        records=analyzed_records,
    )


# ─── Phase 2: Confirm ─────────────────────────────────────────────────────────

@router.post("/confirm/{batch_id}", response_model=ConfirmImportResponse)
def confirm_import(
    batch_id: str,
    payload: ConfirmImportRequest,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    """
    Phase 2 — Store approved records in the database.
    Applies approved safe corrections, generates verifiable credentials,
    preserves analysis metadata, and updates real-time dashboard states.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")
    if batch.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="This batch has already been confirmed and imported.")
    if not batch.analysis_data_json:
        raise HTTPException(status_code=400, detail="Batch analysis data missing. Please re-upload.")

    excluded_rows = set(payload.excluded_rows)
    records_raw = json.loads(batch.analysis_data_json)

    imported = 0
    skipped = 0

    for rec_dict in records_raw:
        row_num = rec_dict["row"]

        if row_num in excluded_rows:
            skipped += 1
            continue

        if not rec_dict["is_valid"]:
            skipped += 1
            continue

        corrected = rec_dict["corrected_data"]
        corrected["institution_id"] = batch.institution_id or 1

        for num_field, default in [
            ("cgpa", 0.0), ("last_semester_gpa", 0.0),
            ("attendance_percentage", 0.0), ("study_hours_per_day", 4.0),
            ("sleep_hours", 7.0), ("gaming_hours", 1.0),
        ]:
            try:
                corrected[num_field] = float(corrected.get(num_field, default))
            except (ValueError, TypeError):
                corrected[num_field] = default

        dup_res: DuplicateCheckResult = duplicate_service.check_duplicate(db, corrected)
        is_dup = dup_res.is_duplicate
        match_id = dup_res.match_id
        dup_reason = dup_res.reason
        is_cross_inst = dup_res.is_cross_institution

        v_code = f"VER-APAAR-{uuid.uuid4().hex[:10].upper()}"

        new_student = Student(
            apaar_id=str(corrected.get("apaar_id", "")).strip().upper(),
            student_id=str(corrected.get("student_id", "")).strip(),
            full_name=str(corrected.get("full_name", "")).strip(),
            email=str(corrected.get("email", "")).strip().lower(),
            phone=str(corrected.get("phone", "")).strip() or None,
            gender=str(corrected.get("gender", "Other")),
            date_of_birth=str(corrected.get("date_of_birth", "2000-01-01")),
            institution_id=corrected["institution_id"],
            degree_program=str(corrected.get("degree_program", "")).strip(),
            department=str(corrected.get("department", "")).strip() or None,
            academic_year=str(corrected.get("academic_year", "2025-2026")),
            current_semester=str(corrected.get("current_semester", "1st")),
            admission_date=str(corrected.get("admission_date", "2023-08-01")),
            admission_category=str(corrected.get("admission_category", "General")),
            nri_status=str(corrected.get("nri_status", "No")),
            oci_status=str(corrected.get("oci_status", "No")),
            foreign_national_status=str(corrected.get("foreign_national_status", "No")),
            supernumerary_quota=str(corrected.get("supernumerary_quota", "None")),
            submission_source="CSV_IMPORT",
            submission_batch_id=batch_id,
            cgpa=corrected["cgpa"],
            last_semester_gpa=corrected["last_semester_gpa"],
            attendance_percentage=corrected["attendance_percentage"],
            study_hours_per_day=corrected["study_hours_per_day"],
            sleep_hours=corrected["sleep_hours"],
            gaming_hours=corrected["gaming_hours"],
            certificate_number=str(corrected.get("certificate_number", "")).strip().upper(),
            certificate_issue_date=str(corrected.get("certificate_issue_date", "2023-07-20")),
            validation_status="VALID",
            validation_errors_json="[]",
            duplicate_status="DUPLICATE_FLAGGED" if is_dup else "UNIQUE",
            duplicate_match_id=match_id,
            duplicate_reason=dup_reason,
            is_cross_institution_duplicate=is_cross_inst,
            is_excess_intake=bool(rec_dict.get("is_excess_intake", False)),
            anomaly_status=rec_dict.get("anomaly_status", "NOT_EVALUATED"),
            anomaly_score=rec_dict.get("anomaly_score"),
            anomaly_reason=rec_dict.get("anomaly_reason"),
            ml_classification=rec_dict.get("ml_classification", "NOT_EVALUATED"),
            ml_confidence=rec_dict.get("ml_confidence"),
            ml_reason=rec_dict.get("ml_reason"),
            overall_risk_level=rec_dict.get("overall_risk", "LOW"),
            verification_status="PENDING",
            verification_code=v_code,
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db.add(new_student)
        db.flush()

        # Add Credential Record
        db.add(CredentialRecord(
            student_id=new_student.id,
            credential_id=f"CRED-APAAR-{new_student.id}-{uuid.uuid4().hex[:6].upper()}",
            verification_code=v_code,
            certificate_number=new_student.certificate_number,
            status="ACTIVE",
            qr_payload=f"https://apaar.aicte-india.org/verify?apaar={new_student.apaar_id}&code={v_code}",
            issued_at=datetime.datetime.utcnow(),
            issued_by=current_user.email
        ))

        # Store duplicate case if flagged
        if is_dup:
            db.add(DuplicateCase(
                student_id=new_student.id,
                matched_student_id=match_id,
                reason=dup_reason or "Duplicate detected at confirmation time.",
                is_cross_institution=is_cross_inst,
                matched_institution_id=dup_res.matched_institution_id,
                created_at=datetime.datetime.utcnow()
            ))
            alert_type = "CROSS_INSTITUTION_DUPLICATE" if is_cross_inst else "DUPLICATE_DETECTED"
            db.add(Alert(
                student_id=new_student.id,
                institution_id=new_student.institution_id,
                alert_type=alert_type,
                severity="CRITICAL",
                reason=dup_reason or "Duplicate conflict detected during bulk import confirmation.",
                status="NEW"
            ))

        if new_student.is_excess_intake:
            db.add(Alert(
                student_id=new_student.id,
                institution_id=new_student.institution_id,
                alert_type="EXCESS_ENROLMENT",
                severity="CRITICAL",
                reason=f"Admissions exceed approved intake quota for program '{new_student.degree_program}'.",
                status="NEW"
            ))

        if rec_dict.get("anomaly_status") == "ANOMALOUS":
            db.add(Alert(
                student_id=new_student.id,
                institution_id=new_student.institution_id,
                alert_type="ISOLATION_FOREST_ANOMALY",
                severity="WARNING",
                reason=rec_dict.get("anomaly_reason") or "Statistical outlier detected during bulk import.",
                status="NEW"
            ))

        if rec_dict.get("ml_classification") == "SUSPICIOUS":
            db.add(Alert(
                student_id=new_student.id,
                institution_id=new_student.institution_id,
                alert_type="RANDOM_FOREST_SUSPICIOUS",
                severity="CRITICAL",
                reason=rec_dict.get("ml_reason") or "Supervised classifier flagged suspicious indicators.",
                status="NEW"
            ))

        imported += 1

    batch.status = "COMPLETED"
    batch.imported_count = imported
    batch.updated_at = datetime.datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="BULK_IMPORT_CONFIRMED",
        entity_type="ImportBatch",
        entity_id=batch_id,
        details=f"Batch '{batch_id}' confirmed. Imported: {imported}, Skipped: {skipped}."
    )

    return ConfirmImportResponse(
        batch_id=batch_id,
        imported_count=imported,
        skipped_count=skipped,
        status="COMPLETED",
        message=f"Successfully imported {imported} student records. {skipped} rows were skipped.",
    )


# ─── Delete Uploaded Source CSV ───────────────────────────────────────────────

@router.delete("/{batch_id}/source-file")
def delete_source_file(
    batch_id: str,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

    if batch.file_deleted:
        return {"success": True, "message": "Source file was already deleted."}

    file_path = batch.source_file_path
    deleted = False
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
        deleted = True

    batch.file_deleted = True
    batch.source_file_path = None
    batch.updated_at = datetime.datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="BULK_IMPORT_SOURCE_DELETED",
        entity_type="ImportBatch",
        entity_id=batch_id,
        details=f"Source CSV for batch '{batch_id}' deleted from storage. Database records preserved."
    )

    return {
        "success": True,
        "message": (
            f"Source CSV '{batch.filename}' deleted. "
            "All imported student records and analysis results remain in the database."
        ) if deleted else "File was not found on disk but batch marked as deleted."
    }
