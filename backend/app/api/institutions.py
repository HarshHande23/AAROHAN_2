from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Institution
from app.schemas.schemas import InstitutionResponse

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionResponse])
def get_institutions(db: Session = Depends(get_db)):
    return db.query(Institution).filter(Institution.is_active == True).all()

