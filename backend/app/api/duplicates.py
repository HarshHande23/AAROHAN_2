import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import DuplicateCase, Student, User
from app.api.students import student_to_response
from app.security.auth import get_current_user
from app.security.rbac import require_roles
from app.services.audit_service import log_audit

router = APIRouter(prefix="/duplicates", tags=["Duplicates"])

@router.get("")
def get_duplicates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(DuplicateCase).filter(DuplicateCase.is_resolved == False)

    cases = query.order_by(DuplicateCase.created_at.desc()).all()
    results = []

    for c in cases:
        student = db.query(Student).filter(Student.id == c.student_id).first()
        matched = db.query(Student).filter(Student.id == c.matched_student_id).first() if c.matched_student_id else None

        if student:
            results.append({
                "id": c.id,
                "student": student_to_response(student),
                "matched_student": student_to_response(matched) if matched else None,
                "reason": c.reason,
                "created_at": c.created_at
            })

    return {
        "duplicate_cases": results,
        "total": len(results)
    }

@router.post("/{id}/resolve")
def resolve_duplicate(
    id: int,
    action: str = Body(..., embed=True), # CONFIRM or DISMISS
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN"])),
    db: Session = Depends(get_db)
):
    case = db.query(DuplicateCase).filter(DuplicateCase.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Duplicate case not found.")

    case.is_resolved = True
    case.action_taken = action
    case.resolved_at = datetime.datetime.utcnow()

    # Update associated student duplicate status
    student = db.query(Student).filter(Student.id == case.student_id).first()
    if student:
        if action == "CONFIRM":
            student.duplicate_status = "CONFIRMED_DUPLICATE"
        else:
            student.duplicate_status = "RESOLVED"

    db.commit()

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="DUPLICATE_RESOLVED",
        entity_type="DuplicateCase",
        entity_id=str(id),
        details=f"Resolved duplicate case #{id} with action: '{action}'"
    )

    return {"success": True, "message": f"Duplicate case #{id} marked as {action}."}

