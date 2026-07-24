import uuid
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.core.redis import redis_client
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.crud.crud_user import user_crud
from app.models.users import User
from app.schemas.users import Token, UserResponse, UserCreate

router = APIRouter()


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = await user_crud.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    # Create a unique session ID
    session_id = str(uuid.uuid4())

    # Log login history
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    device_info = user_agent[:100] if user_agent else "Unknown"

    await user_crud.add_login_history(
        db,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        device_info=device_info,
    )

    access_token = create_access_token(
        subject=user.id, role=user.role.value, session_id=session_id
    )
    refresh_token = create_refresh_token(subject=user.id, session_id=session_id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=Token)
async def refresh(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Refresh access token using a refresh token.
    """
    try:
        payload = decode_token(body.refresh_token)
        user_id: str | None = payload.get("sub")
        session_id: str | None = payload.get("sid")
        token_type: str | None = payload.get("type")

        if token_type != "refresh" or not user_id or not session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Verify if session has been blacklisted (e.g. user logged out)
    if await redis_client.is_session_blacklisted(session_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or user has logged out",
        )

    user = await user_crud.get(db, id=user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or not found",
        )

    # Generate new tokens (token rotation is standard, using same session_id)
    access_token = create_access_token(
        subject=user.id, role=user.role.value, session_id=session_id
    )
    new_refresh_token = create_refresh_token(subject=user.id, session_id=session_id)

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.post("/logout")
async def logout(
    request: Request,
    token: str = Depends(deps.reusable_oauth2),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Logout the current user, blacklisting their session ID in Redis.
    """
    try:
        payload = decode_token(token)
        session_id: str | None = payload.get("sid")
        exp: int | None = payload.get("exp")

        if not session_id or not exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        # Calculate time remaining until access token naturally expires
        now = int(datetime.now(timezone.utc).timestamp())
        expire_seconds = max(exp - now, 60)  # blacklist for at least 60 seconds

        # Add session to Redis blacklist
        await redis_client.blacklist_session(session_id, expire_seconds)

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return {"detail": "Successfully logged out"}


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: UserCreate,
) -> Any:
    """
    Register a new user (default role Owner or Tenant).
    """
    existing_user = await user_crud.get_by_email(db, email=obj_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    return await user_crud.create(db, obj_in=obj_in)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get the currently logged in user profile details.
    """
    return current_user
