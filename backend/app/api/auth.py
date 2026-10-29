from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, Institution
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse, RoleSwitchRequest
from app.security.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Allow testing role selection if requested
    active_role = request.role if request.role in ["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF", "AUTHORIZED_VERIFIER"] else user.role

    access_token = create_access_token(
        data={"sub": user.email, "role": active_role, "user_id": user.id}
    )

    inst_name = user.institution.name if user.institution else None
    inst_code = user.institution.code if user.institution else None

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=active_role,
        institution_id=user.institution_id,
        institution_name=inst_name,
        institution_code=inst_code,
        is_active=user.is_active,
        created_at=user.created_at
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    inst_name = current_user.institution.name if current_user.institution else None
    inst_code = current_user.institution.code if current_user.institution else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        institution_id=current_user.institution_id,
        institution_name=inst_name,
        institution_code=inst_code,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

@router.post("/switch-role")
def switch_role(req: RoleSwitchRequest, current_user: User = Depends(get_current_user)):
    allowed = ["AICTE_ADMIN", "COLLEGE_ADMIN", "ADMISSION_STAFF", "AUTHORIZED_VERIFIER"]
    if req.role not in allowed:
        raise HTTPException(status_code=400, detail="Invalid role specification.")

    new_token = create_access_token(
        data={"sub": current_user.email, "role": req.role, "user_id": current_user.id}
    )

    inst_name = current_user.institution.name if current_user.institution else None
    inst_code = current_user.institution.code if current_user.institution else None

    user_resp = UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=req.role,
        institution_id=current_user.institution_id,
        institution_name=inst_name,
        institution_code=inst_code,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

    return {
        "access_token": new_token,
        "token_type": "bearer",
        "user": user_resp
    }

