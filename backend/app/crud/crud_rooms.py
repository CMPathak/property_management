import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rooms import Room
from app.repositories.base import BaseRepository
from app.schemas.rooms import RoomCreate, RoomUpdate


class CRUDRoom(BaseRepository[Room, RoomCreate, RoomUpdate]):
    async def get_by_floor_and_number(
        self, db: AsyncSession, floor_id: uuid.UUID, room_number: str
    ) -> Room | None:
        statement = select(Room).where(
            Room.floor_id == floor_id,
            Room.room_number == room_number,
            Room.deleted_at.is_(None),
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()


room_crud = CRUDRoom(Room)
