import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.beds.model import Bed, BedStatus
from app.repositories.base import BaseRepository
from app.modules.beds.schema import BedCreate, BedUpdate


class CRUDBed(BaseRepository[Bed, BedCreate, BedUpdate]):
    async def get_by_room_and_number(
        self, db: AsyncSession, room_id: uuid.UUID, bed_number: str
    ) -> Bed | None:
        statement = select(Bed).where(
            Bed.room_id == room_id,
            Bed.bed_number == bed_number,
            Bed.deleted_at.is_(None),
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def update_status(
        self, db: AsyncSession, bed_id: uuid.UUID, status: BedStatus
    ) -> Bed | None:
        bed = await self.get(db, bed_id)
        if bed:
            bed.status = status
            db.add(bed)
            await db.commit()
            await db.refresh(bed)
        return bed


bed_crud = CRUDBed(Bed)
