import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Alert, Student, Institution, User
from app.schemas.schemas import AlertResponse, UpdateAlertRequest
from app.security.auth import get_current_user
from app.services.audit_service import log_audit

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    alert_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Alert).join(Student, Alert.student_id == Student.id)

    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id:
        query = query.filter(Student.institution_id == current_user.institution_id)

    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)

    alerts = query.order_by(Alert.created_at.desc()).all()
    results = []

    for a in alerts:
        inst_name = a.student.institution.name if a.student and a.student.institution else "Central Directorate"
        results.append(AlertResponse(
            id=a.id,
            student_id=a.student_id,
            student_name=a.student.full_name if a.student else "Unknown",
            apaar_id=a.student.apaar_id if a.student else "Unknown",
            institution_name=inst_name,
            alert_type=a.alert_type,
            severity=a.severity,
            reason=a.reason,
            status=a.status,
            review_notes=a.review_notes,
            reviewed_by=a.reviewed_by,
            reviewed_at=a.reviewed_at,
            created_at=a.created_at
        ))

    return results

@router.patch("/{id}", response_model=AlertResponse)
def update_alert(
    id: int,
    payload: UpdateAlertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert record not found.")

    alert.status = payload.status
    if payload.notes:
        alert.review_notes = payload.notes
    alert.reviewed_by = current_user.email
    alert.reviewed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(alert)

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="ALERT_REVIEWED",
        entity_type="Alert",
        entity_id=str(alert.id),
        details=f"Updated Alert #{alert.id} status to '{payload.status}'. Notes: {payload.notes or 'None'}"
    )

    inst_name = alert.student.institution.name if alert.student and alert.student.institution else "Central Directorate"
    return AlertResponse(
        id=alert.id,
        student_id=alert.student_id,
        student_name=alert.student.full_name if alert.student else "Unknown",
        apaar_id=alert.student.apaar_id if alert.student else "Unknown",
        institution_name=inst_name,
        alert_type=alert.alert_type,
        severity=alert.severity,
        reason=alert.reason,
        status=alert.status,
        review_notes=alert.review_notes,
        reviewed_by=alert.reviewed_by,
        reviewed_at=alert.reviewed_at,
        created_at=alert.created_at
    )

