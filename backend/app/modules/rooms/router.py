import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.modules.rooms.repository import room_crud
from app.modules.users.model import User
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.modules.rooms.schema import RoomCreate, RoomResponse, RoomUpdate

router = APIRouter()


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    obj_in: RoomCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("room", PermissionAction.CREATE)),
) -> Any:
    """
    Add a room to a floor.
    """
    existing = await room_crud.get_by_floor_and_number(
        db, floor_id=obj_in.floor_id, room_number=obj_in.room_number
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Room number already exists on this floor"
        )
        
    return await room_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.delete("/{id}", response_model=RoomResponse)
async def delete_room(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("room", PermissionAction.DELETE)),
) -> Any:
    """
    Soft delete a room.
    """
    room = await room_crud.get(db, id=id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return await room_crud.remove(db, id=id, user_id=current_user.id)


@router.put("/{id}", response_model=RoomResponse)
async def update_room(
    id: uuid.UUID,
    obj_in: RoomUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("room", PermissionAction.UPDATE)),
) -> Any:
    """
    Update room details.
    """
    db_obj = await room_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Room not found")
    return await room_crud.update(db, db_obj=db_obj, obj_in=obj_in, user_id=current_user.id)
