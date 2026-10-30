from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import InstitutionProgramIntake, Institution, Student, User
from app.schemas.schemas import (
    InstitutionProgramIntakeBase,
    InstitutionProgramIntakeCreate, 
    InstitutionProgramIntakeResponse,
    InstitutionIntakeBreakdownItem
)
from app.security.auth import get_current_user
from app.security.rbac import require_roles
from app.services.audit_service import log_audit

router = APIRouter(prefix="/intakes", tags=["Institution Program Intakes"])

def intake_to_response(item: InstitutionProgramIntake, db: Session) -> InstitutionProgramIntakeResponse:
    inst = db.query(Institution).filter(Institution.id == item.institution_id).first()
    
    # Calculate live enrolment count from actual database
    actual_count = (
        db.query(Student)
        .filter(
            Student.institution_id == item.institution_id,
            Student.degree_program.ilike(f"%{item.program_name.strip()}%"),
            Student.academic_year == item.academic_year
        )
        .count()
    )
    
    excess = max(0, actual_count - item.approved_intake)
    util = round((actual_count / item.approved_intake) * 100, 1) if item.approved_intake > 0 else 0.0
    
    status_str = "EXCESS_ENROLMENT" if excess > 0 else "NEAR_CAPACITY" if util >= 90.0 else "WITHIN_LIMIT"

    return InstitutionProgramIntakeResponse(
        id=item.id,
        institution_id=item.institution_id,
        institution_name=inst.name if inst else "Unknown",
        institution_code=inst.code if inst else "N/A",
        program_name=item.program_name,
        academic_year=item.academic_year,
        approved_intake=item.approved_intake,
        supernumerary_seats=item.supernumerary_seats,
        intake_policy=item.intake_policy,
        actual_enrolment=actual_count,
        excess_enrolment=excess,
        utilization_percentage=util,
        intake_status=status_str,
        created_at=item.created_at,
        updated_at=item.updated_at
    )

@router.get("", response_model=List[InstitutionProgramIntakeResponse])
def get_all_intakes(
    institution_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(InstitutionProgramIntake)
    
    # College Admin can only view their own institution's intakes
    if current_user.role in ("COLLEGE_ADMIN", "ADMISSION_STAFF"):
        if current_user.institution_id:
            query = query.filter(InstitutionProgramIntake.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(InstitutionProgramIntake.institution_id == institution_id)

    if academic_year:
        query = query.filter(InstitutionProgramIntake.academic_year == academic_year)

    intakes = query.order_by(InstitutionProgramIntake.institution_id, InstitutionProgramIntake.program_name).all()
    return [intake_to_response(item, db) for item in intakes]

@router.post("", response_model=InstitutionProgramIntakeResponse)
def create_program_intake(
    payload: InstitutionProgramIntakeCreate,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN"])),
    db: Session = Depends(get_db)
):
    target_inst_id = payload.institution_id
    if current_user.role == "COLLEGE_ADMIN" and current_user.institution_id:
        target_inst_id = current_user.institution_id

    inst = db.query(Institution).filter(Institution.id == target_inst_id).first()
    if not inst:
        raise HTTPException(status_code=400, detail=f"Institution #{target_inst_id} does not exist.")

    # Check for existing config
    existing = (
        db.query(InstitutionProgramIntake)
        .filter(
            InstitutionProgramIntake.institution_id == target_inst_id,
            InstitutionProgramIntake.program_name.ilike(payload.program_name.strip()),
            InstitutionProgramIntake.academic_year == payload.academic_year
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Intake configuration already exists for {payload.program_name} ({payload.academic_year}). Use PUT to update."
        )

    new_intake = InstitutionProgramIntake(
        institution_id=target_inst_id,
        program_name=payload.program_name.strip(),
        academic_year=payload.academic_year or "2025-2026",
        approved_intake=payload.approved_intake,
        supernumerary_seats=payload.supernumerary_seats,
        intake_policy=payload.intake_policy or "SUPERNUMERARY_EXCLUDED"
    )
    db.add(new_intake)
    db.commit()
    db.refresh(new_intake)

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="PROGRAM_INTAKE_CONFIGURED",
        entity_type="InstitutionProgramIntake",
        entity_id=str(new_intake.id),
        details=f"Configured intake for {inst.name} - {new_intake.program_name}: Approved={new_intake.approved_intake}, Supernumerary={new_intake.supernumerary_seats}"
    )

    return intake_to_response(new_intake, db)

@router.put("/{intake_id}", response_model=InstitutionProgramIntakeResponse)
def update_program_intake(
    intake_id: int,
    payload: InstitutionProgramIntakeBase,
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "COLLEGE_ADMIN"])),
    db: Session = Depends(get_db)
):
    item = db.query(InstitutionProgramIntake).filter(InstitutionProgramIntake.id == intake_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Intake configuration not found.")

    if current_user.role == "COLLEGE_ADMIN" and item.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Cannot modify intake for another institution.")

    item.approved_intake = payload.approved_intake
    item.supernumerary_seats = payload.supernumerary_seats
    if payload.intake_policy:
        item.intake_policy = payload.intake_policy
    if payload.program_name:
        item.program_name = payload.program_name.strip()
    if payload.academic_year:
        item.academic_year = payload.academic_year

    db.commit()
    db.refresh(item)

    log_audit(
        db=db,
        user_email=current_user.email,
        user_role=current_user.role,
        action="PROGRAM_INTAKE_UPDATED",
        entity_type="InstitutionProgramIntake",
        entity_id=str(item.id),
        details=f"Updated intake #{item.id}: Approved={item.approved_intake}, Supernumerary={item.supernumerary_seats}"
    )

    return intake_to_response(item, db)
