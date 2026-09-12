"""
Authentication API routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.core import User, Role, RoleName, Department
from app.auth.security import verify_password, get_password_hash, create_access_token
from app.auth.dependencies import get_current_user
from app.schemas import LoginRequest, RegisterRequest, Token, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
@router.post("/signup", response_model=Token)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new university personnel account and store in database."""
    username_clean = req.username.strip()
    email_clean = req.email.strip().lower()

    if not username_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")
    if not req.password or len(req.password) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 4 characters")
    if not req.full_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name cannot be empty")

    # Check for duplicate username
    if db.query(User).filter_by(username=username_clean).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{username_clean}' is already registered. Please choose another or sign in.",
        )

    # Check for duplicate email
    if db.query(User).filter_by(email=email_clean).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{email_clean}' is already registered. Please sign in.",
        )

    # Resolve department
    dept_id = req.department_id
    if not dept_id and req.department_code:
        dept = db.query(Department).filter_by(code=req.department_code.strip().upper()).first()
        if dept:
            dept_id = dept.id

    # Hash the password with bcrypt
    hashed_pwd = get_password_hash(req.password)

    # Create and persist new user
    new_user = User(
        username=username_clean,
        full_name=req.full_name.strip(),
        email=email_clean,
        hashed_password=hashed_pwd,
        is_active=True,
        department_id=dept_id,
    )

    # Assign role
    role_to_assign = req.role if req.role else RoleName.MENTOR
    role_obj = db.query(Role).filter_by(name=role_to_assign).first()
    if not role_obj:
        role_obj = Role(name=role_to_assign, description=f"{role_to_assign.value} role")
        db.add(role_obj)
        db.flush()
    new_user.roles.append(role_obj)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create access token for instant login
    token = create_access_token(data={"sub": new_user.username, "user_id": new_user.id})
    return Token(access_token=token, token_type="bearer", user=new_user)


@router.get("/roles-and-departments")
def get_roles_and_departments(db: Session = Depends(get_db)):
    """Provides available roles and departments for user registration."""
    roles = [
        {"code": r.value, "label": r.value.replace("_", " ").title()}
        for r in RoleName
    ]
    departments = [
        {"id": d.id, "name": d.name, "code": d.code}
        for d in db.query(Department).all()
    ]
    return {"roles": roles, "departments": departments}


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


@router.get("/users", response_model=List[UserOut])
def list_all_users(db: Session = Depends(get_db)):
    """List all registered institutional users stored in the database."""
    return db.query(User).order_by(User.id.desc()).all()


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
