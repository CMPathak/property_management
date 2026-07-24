import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.crud.crud_beds import bed_crud
from app.models.users import User
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.schemas.beds import BedCreate, BedResponse, BedUpdate

router = APIRouter()


@router.post("/", response_model=BedResponse, status_code=status.HTTP_201_CREATED)
async def create_bed(
    obj_in: BedCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("bed", PermissionAction.CREATE)),
) -> Any:
    """
    Add a bed to a room.
    """
    existing = await bed_crud.get_by_room_and_number(
        db, room_id=obj_in.room_id, bed_number=obj_in.bed_number
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Bed number already exists in this room"
        )
        
    return await bed_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.delete("/{id}", response_model=BedResponse)
async def delete_bed(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("bed", PermissionAction.DELETE)),
) -> Any:
    """
    Soft delete a bed.
    """
    bed = await bed_crud.get(db, id=id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    return await bed_crud.remove(db, id=id, user_id=current_user.id)


@router.put("/{id}", response_model=BedResponse)
async def update_bed(
    id: uuid.UUID,
    obj_in: BedUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("bed", PermissionAction.UPDATE)),
) -> Any:
    """
    Update bed details.
    """
    db_obj = await bed_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Bed not found")
    return await bed_crud.update(db, db_obj=db_obj, obj_in=obj_in, user_id=current_user.id)
