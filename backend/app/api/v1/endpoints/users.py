import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.crud.crud_user import user_crud
from app.models.users import User, UserRole
from app.permissions.rbac import require_role
from app.schemas.users import UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    role: UserRole | None = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List users, optionally filtering by role.
    """
    # Only OWNER and SUPER_ADMIN can query users generally
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view users roster."
        )

    statement = select(User).where(User.deleted_at.is_(None))
    if role:
        statement = statement.where(User.role == role)
    
    statement = statement.offset(skip).limit(limit)
    result = await db.execute(statement)
    return list(result.scalars().all())


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: UserCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OWNER])),
) -> Any:
    """
    Create a new user/staff member.
    """
    existing_user = await user_crud.get_by_email(db, email=obj_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    return await user_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.put("/{id}", response_model=UserResponse)
async def update_user(
    id: uuid.UUID,
    obj_in: UserUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a user's details.
    """
    # Users can update themselves, or OWNER/SUPER_ADMIN can update anyone
    if current_user.id != id and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this user."
        )

    # Restrict role assignment/modification to SUPER_ADMIN or OWNER only
    if obj_in.role is not None and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role assignment is restricted to Super Admin or Owner only."
        )

    db_obj = await user_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="User not found")
    return await user_crud.update(db, db_obj=db_obj, obj_in=obj_in, user_id=current_user.id)


@router.delete("/{id}", response_model=UserResponse)
async def delete_user(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OWNER])),
) -> Any:
    """
    Soft delete a user.
    """
    db_obj = await user_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="User not found")
    return await user_crud.remove(db, id=id, user_id=current_user.id)
