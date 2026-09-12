"""
Authentication API routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.core import User, RoleName
from app.auth.security import verify_password, create_access_token
from app.auth.dependencies import get_current_user
from app.schemas import LoginRequest, Token, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=req.username, is_active=True).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return Token(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/demo-users")
def get_demo_users():
    """Provides convenient list of test users and passwords for reviewers."""
    return [
        {"username": "admin", "role": "ADMIN", "password": "adminpassword", "name": "System Administrator", "description": "Full institutional control & threshold calibration approval"},
        {"username": "mentor_cse", "role": "MENTOR", "password": "mentorpassword", "name": "Prof. Alan Turing", "description": "Department mentor handling academic & disengagement check-ins"},
        {"username": "hod_cse", "role": "HOD", "password": "hodpassword", "name": "Dr. Grace Hopper", "description": "Department Head managing escalations & high-severity alerts"},
        {"username": "dean_academics", "role": "DEAN", "password": "deanpassword", "name": "Dean John von Neumann", "description": "Academic leadership reviewing institutional patterns"},
        {"username": "counsellor", "role": "COUNSELLOR", "password": "counsellorpassword", "name": "Dr. Carl Rogers", "description": "Support professional handling confidential check-ins"},
        {"username": "finance_officer", "role": "FINANCE_SUPPORT", "password": "financepassword", "name": "Sarah Jenkins", "description": "Finance administrator managing fee/tuition assistance"},
        {"username": "principal", "role": "PRINCIPAL", "password": "principalpassword", "name": "Dr. Ada Lovelace", "description": "Executive university oversight & systemic governance"},
    ]
