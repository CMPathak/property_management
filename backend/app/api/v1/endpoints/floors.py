import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.crud.crud_floors import floor_crud
from app.models.users import User
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.schemas.floors import FloorCreate, FloorResponse

router = APIRouter()


@router.post("/", response_model=FloorResponse, status_code=status.HTTP_201_CREATED)
async def create_floor(
    obj_in: FloorCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("floor", PermissionAction.CREATE)),
) -> Any:
    """
    Add a floor to a property.
    """
    existing = await floor_crud.get_by_property_and_number(
        db, property_id=obj_in.property_id, floor_number=obj_in.floor_number
    )
    if existing:
        return existing
        
    return await floor_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.delete("/{id}", response_model=FloorResponse)
async def delete_floor(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("floor", PermissionAction.DELETE)),
) -> Any:
    """
    Soft delete a floor.
    """
    floor = await floor_crud.get(db, id=id)
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    return await floor_crud.remove(db, id=id, user_id=current_user.id)
