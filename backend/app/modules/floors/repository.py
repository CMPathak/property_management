import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.floors.model import Floor
from app.repositories.base import BaseRepository
from app.modules.floors.schema import FloorCreate, FloorUpdate


class CRUDFloor(BaseRepository[Floor, FloorCreate, FloorUpdate]):
    async def get_by_property_and_number(
        self, db: AsyncSession, property_id: uuid.UUID, floor_number: int
    ) -> Floor | None:
        statement = select(Floor).where(
            Floor.property_id == property_id,
            Floor.floor_number == floor_number,
            Floor.deleted_at.is_(None),
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()


floor_crud = CRUDFloor(Floor)
