import uuid
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.properties.model import Property
from app.repositories.base import BaseRepository
from app.modules.properties.schema import PropertyCreate, PropertyUpdate


class CRUDProperty(BaseRepository[Property, PropertyCreate, PropertyUpdate]):
    async def get(self, db: AsyncSession, id: uuid.UUID) -> Property | None:
        statement = (
            select(Property)
            .options(
                selectinload(Property.managers),
                selectinload(Property.floors)
            )
            .where(and_(Property.id == id, Property.deleted_at.is_(None)))
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> list[Property]:
        statement = (
            select(Property)
            .options(
                selectinload(Property.managers),
                selectinload(Property.floors)
            )
            .where(Property.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_by_name(self, db: AsyncSession, name: str) -> Property | None:
        statement = select(Property).where(
            Property.name == name, Property.deleted_at.is_(None)
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(
        self, db: AsyncSession, *, obj_in: PropertyCreate, user_id: uuid.UUID | None = None
    ) -> Property:
        obj_in_data = obj_in.model_dump()
        manager_ids = obj_in_data.pop("manager_ids", None)
        
        db_obj = self.model(**obj_in_data)
        if user_id:
            db_obj.created_by = user_id
            db_obj.updated_by = user_id

        # Associate managers if any were selected
        if manager_ids:
            from app.modules.users.repository import user_crud
            managers = []
            for m_id in manager_ids:
                mgr = await user_crud.get(db, id=m_id)
                if mgr:
                    managers.append(mgr)
            db_obj.managers = managers

        db.add(db_obj)
        await db.commit()
        
        # Return reloaded property with relationships populated
        return await self.get(db, id=db_obj.id) or db_obj


property_crud = CRUDProperty(Property)
