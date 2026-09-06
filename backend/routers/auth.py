from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from database import get_db

from models import User

from schemas import (
    UserCreate,
    UserLogin,
    UserResponse
)

from security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)


# -----------------------------------
# Router
# -----------------------------------

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# -----------------------------------
# OAuth2
# -----------------------------------

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# -----------------------------------
# REGISTER
# -----------------------------------

@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # --------------------------------
    # Check existing email
    # --------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == user.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # --------------------------------
    # Check bcrypt password limit
    # --------------------------------

    if len(
        user.password.encode("utf-8")
    ) > 72:

        raise HTTPException(
            status_code=400,
            detail="Password cannot exceed 72 bytes"
        )


    # --------------------------------
    # Hash password
    # --------------------------------

    hashed_password = hash_password(
        user.password
    )


    # --------------------------------
    # Create user
    # --------------------------------

    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password
    )


    db.add(new_user)

    db.commit()

    db.refresh(new_user)


    return new_user


# -----------------------------------
# LOGIN
# -----------------------------------

@router.post("/login")
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):

    # --------------------------------
    # Find user
    # --------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == user.email
        )
        .first()
    )


    if not existing_user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    # --------------------------------
    # Verify password
    # --------------------------------

    if not verify_password(
        user.password,
        existing_user.password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    # --------------------------------
    # Create JWT
    # --------------------------------

    access_token = create_access_token(
        data={
            "sub": str(existing_user.id),
            "email": existing_user.email
        }
    )


    return {

        "message": "Login successful",

        "access_token": access_token,

        "token_type": "bearer",

        "user_id": existing_user.id,

        "name": existing_user.name,

        "email": existing_user.email
    }


# -----------------------------------
# CURRENT USER
# -----------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    # --------------------------------
    # Decode token
    # --------------------------------

    payload = decode_access_token(token)


    if payload is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


    # --------------------------------
    # Get user ID
    # --------------------------------

    user_id = payload.get("sub")


    if user_id is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


    # --------------------------------
    # Find user
    # --------------------------------

    try:

        user_id = int(user_id)

    except ValueError:

        raise HTTPException(
            status_code=401,
            detail="Invalid user ID"
        )


    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )


    if user is None:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )


    return user