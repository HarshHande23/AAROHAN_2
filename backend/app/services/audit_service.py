import datetime
from sqlalchemy.orm import Session
from app.models.entities import AuditLog

def log_audit(
    db: Session,
    user_email: str,
    user_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: str
) -> AuditLog:
    try:
        log_entry = AuditLog(
            user_email=user_email,
            user_role=user_role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            details=details,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        print(f"Audit log writing error: {e}")
        db.rollback()
        return None

