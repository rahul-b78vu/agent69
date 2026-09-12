"""
Authentication & Authorization dependencies (Step 21 / spec §23).

Enforces Role-Based Access Control (RBAC):
Roles: ADMIN, MENTOR, HOD, DEAN, COUNSELLOR, FINANCE_SUPPORT, PRINCIPAL

Rules:
- Finance Support only has access to financial-related alerts.
- Counselling information is restricted to COUNSELLOR, DEAN, and ADMIN.
- Threshold modification and Calibration Approval require ADMIN role.
"""
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.security import decode_access_token
from app.models.core import User, RoleName, Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = db.query(User).filter_by(username=username, is_active=True).first()
    if user is None:
        raise credentials_exception

    return user


def require_roles(allowed_roles: List[RoleName]):
    """
    Dependency factory to check if current user holds at least one of the allowed roles.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_names = [r.name for r in current_user.roles]

        # ADMIN always has access
        if RoleName.ADMIN in user_role_names:
            return current_user

        has_access = any(role in user_role_names for role in allowed_roles)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker
