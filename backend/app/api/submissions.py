import uuid
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Student, Institution, User, ImportBatch, ApiIntegrationKey
from app.schemas.schemas import (
    StudentCreate, StudentResponse,
    ApiBatchSubmissionRequest, ApiStudentRecordPayload, ApiSubmissionResponse,
    BatchSummaryResponse
)
from app.api.students import student_to_response
from app.security.auth import get_current_user
from app.security.rbac import require_roles
from app.services.pipeline_service import pipeline_service, PipelineResult
from app.services.audit_service import log_audit

router = APIRouter(prefix="/submissions", tags=["Data Submission Channels"])

# ─── Channel B: Manual Entry ──────────────────────────────────────────────────

@router.post("/manual", response_model=StudentResponse)
def submit_manual_student(
    payload: StudentCreate,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF"])),
    db: Session = Depends(get_db)
):
    """
    Submission Channel B — Manual Entry.
    Feeds directly into the central unified validation & anomaly pipeline.
    """
    target_inst_id = payload.institution_id
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        target_inst_id = current_user.institution_id

    inst = db.query(Institution).filter(Institution.id == target_inst_id).first()
    if not inst:
        raise HTTPException(status_code=400, detail=f"Institution #{target_inst_id} does not exist.")

    data_dict = payload.model_dump()
    data_dict["institution_id"] = target_inst_id

    result: PipelineResult = pipeline_service.process_student(
        db=db,
        raw_data=data_dict,
        submission_source="MANUAL",
        batch_id=f"MANUAL-{uuid.uuid4().hex[:6].upper()}",
        current_user=current_user,
        auto_commit=True
    )

    return student_to_response(result.student)


# ─── Channel A: API Integration (Institution ERP / SIS) ───────────────────────

@router.post("/api", response_model=ApiSubmissionResponse)
def submit_via_api(
    payload: ApiBatchSubmissionRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submission Channel A — Secure API Integration.
    Accepts student records directly from verified institutional ERP/SIS systems.
    Passes through the exact same central validation, deduplication, intake, and ML pipeline.
    """
    # Authenticate via either JWT user session or X-API-Key header
    target_inst_id = None
    submitter_email = "api-system@aicte.gov.in"
    submitter_role = "API_INTEGRATION"

    if current_user:
        submitter_email = current_user.email
        submitter_role = current_user.role
        if current_user.institution_id:
            target_inst_id = current_user.institution_id
    elif x_api_key:
        api_key_rec = db.query(ApiIntegrationKey).filter(ApiIntegrationKey.api_key == x_api_key, ApiIntegrationKey.is_active == True).first()
        if not api_key_rec:
            raise HTTPException(status_code=401, detail="Invalid or revoked X-API-Key.")
        target_inst_id = api_key_rec.institution_id
        submitter_email = f"api-key-{api_key_rec.id}"
        api_key_rec.last_used_at = datetime.datetime.utcnow()
    else:
        raise HTTPException(status_code=401, detail="Authentication required. Provide Bearer token or X-API-Key header.")

    if not payload.records:
        raise HTTPException(status_code=400, detail="Empty submission payload: 'records' list contains 0 items.")

    batch_id = f"API-{uuid.uuid4().hex[:8].upper()}"

    batch = ImportBatch(
        batch_id=batch_id,
        submission_method="API",
        filename=f"API_Batch_{len(payload.records)}_records",
        uploaded_by=submitter_email,
        uploaded_by_role=submitter_role,
        institution_id=target_inst_id,
        status="COMPLETED",
        total_records=len(payload.records),
        created_at=datetime.datetime.utcnow(),
        processing_timestamp=datetime.datetime.utcnow()
    )
    db.add(batch)
    db.flush()

    accepted = 0
    rejected = 0
    dups_flagged = 0
    cross_dups = 0
    excess_flagged = 0
    anomalies = 0
    processed_records = []

    for item in payload.records:
        rec_dict = item.model_dump()
        rec_inst = rec_dict.get("institution_id") or target_inst_id or 1
        rec_dict["institution_id"] = rec_inst

        res: PipelineResult = pipeline_service.process_student(
            db=db,
            raw_data=rec_dict,
            submission_source="API_INTEGRATION",
            batch_id=batch_id,
            current_user=current_user,
            auto_commit=False # Will commit batch together
        )

        if res.is_valid and not res.is_duplicate:
            accepted += 1
        else:
            rejected += 1

        if res.is_duplicate:
            dups_flagged += 1
        if res.is_cross_institution:
            cross_dups += 1
        if res.is_excess_intake:
            excess_flagged += 1
        if res.anomaly_status == "ANOMALOUS":
            anomalies += 1

        processed_records.append({
            "apaar_id": res.student.apaar_id,
            "student_id": res.student.student_id,
            "student_db_id": res.student.id,
            "validation_status": res.student.validation_status,
            "duplicate_status": res.student.duplicate_status,
            "is_cross_institution_duplicate": res.is_cross_institution,
            "is_excess_intake": res.is_excess_intake,
            "anomaly_status": res.anomaly_status,
            "anomaly_score": res.anomaly_score,
            "overall_risk": res.overall_risk,
            "verification_code": res.verification_code
        })

    # Update batch counts
    batch.valid_records = accepted
    batch.validation_issues_count = rejected
    batch.duplicate_count = dups_flagged
    batch.cross_institution_duplicate_count = cross_dups
    batch.excess_intake_count = excess_flagged
    batch.anomaly_count = anomalies
    batch.imported_count = len(processed_records)
    batch.updated_at = datetime.datetime.utcnow()

    db.commit()

    log_audit(
        db=db,
        user_email=submitter_email,
        user_role=submitter_role,
        action="API_SUBMISSION_COMPLETED",
        entity_type="ImportBatch",
        entity_id=batch_id,
        details=f"API submitted {len(payload.records)} records. Accepted: {accepted}, Rejected/Flagged: {rejected}, Cross-dups: {cross_dups}, Excess: {excess_flagged}"
    )

    return ApiSubmissionResponse(
        success=True,
        batch_id=batch_id,
        total_submitted=len(payload.records),
        accepted=accepted,
        rejected=rejected,
        duplicates_flagged=dups_flagged,
        cross_institution_duplicates=cross_dups,
        excess_intake_flagged=excess_flagged,
        anomalies_detected=anomalies,
        records=processed_records,
        message=f"Successfully processed {len(payload.records)} student records via API integration gateway."
    )


# ─── Batch Submission History ─────────────────────────────────────────────────

@router.get("/batches", response_model=List[BatchSummaryResponse])
def get_submission_batches(
    submission_method: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ImportBatch)
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF") and current_user.institution_id:
        query = query.filter(ImportBatch.institution_id == current_user.institution_id)
    
    if submission_method:
        query = query.filter(ImportBatch.submission_method == submission_method)

    batches = query.order_by(ImportBatch.created_at.desc()).limit(100).all()
    return batches
