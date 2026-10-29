from typing import List
from fastapi import Depends, HTTPException, status
from app.models.entities import User
from app.security.auth import get_current_user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}. Your active role: {current_user.role}"
            )
        return current_user
    return role_checker

