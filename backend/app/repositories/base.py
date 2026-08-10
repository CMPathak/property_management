import uuid
from datetime import datetime, timezone
from typing import Any, Generic, Type, TypeVar
from pydantic import BaseModel
from sqlalchemy import select, update, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        Base Repository with default methods for Create, Read, Update, Delete (CRUD).
        """
        self.model = model

    async def get(self, db: AsyncSession, id: Any) -> ModelType | None:
        """
        Get record by ID, automatically filtering out soft-deleted records.
        """
        statement = select(self.model).where(
            and_(self.model.id == id, self.model.deleted_at.is_(None))
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> list[ModelType]:
        """
        Get multiple records with pagination, filtering out soft-deleted records.
        """
        statement = (
            select(self.model)
            .where(self.model.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def create(
        self, db: AsyncSession, *, obj_in: CreateSchemaType, user_id: uuid.UUID | None = None
    ) -> ModelType:
        """
        Insert a new record, setting created_by audit metadata.
        """
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)  # type: ignore
        
        # Populate audit fields if user is present
        if user_id:
            db_obj.created_by = user_id
            db_obj.updated_by = user_id
            
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType | dict[str, Any],
        user_id: uuid.UUID | None = None
    ) -> ModelType:
        """
        Update an existing record, handling updated_by audit metadata.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])

        if user_id:
            db_obj.updated_by = user_id
            
        db_obj.updated_at = datetime.now(timezone.utc)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(
        self, db: AsyncSession, *, id: Any, user_id: uuid.UUID | None = None
    ) -> ModelType | None:
        """
        Soft delete a record by setting deleted_at to current time.
        """
        db_obj = await self.get(db, id)
        if db_obj:
            db_obj.deleted_at = datetime.now(timezone.utc)
            if user_id:
                db_obj.updated_by = user_id
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
        return db_obj

    async def hard_remove(self, db: AsyncSession, *, id: Any) -> ModelType | None:
        """
        Physically delete a record from the database.
        """
        db_obj = await self.get(db, id)
        if db_obj:
            await db.delete(db_obj)
            await db.commit()
        return db_obj
