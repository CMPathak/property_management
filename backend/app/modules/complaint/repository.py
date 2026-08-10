import uuid
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.complaint.model import Complaint, ComplaintTimeline, ComplaintStatus
from app.repositories.base import BaseRepository
from app.modules.complaint.schema import (
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintTimelineCreate,
)


class CRUDComplaint(BaseRepository[Complaint, ComplaintCreate, ComplaintUpdate]):
    async def create(self, db: AsyncSession, *, obj_in: ComplaintCreate, user_id: uuid.UUID | None = None) -> Complaint:
        obj_in_data = obj_in.model_dump(exclude_unset=True)
        model_cols = {c.name for c in Complaint.__table__.columns}
        cleaned_data = {k: v for k, v in obj_in_data.items() if k in model_cols}
        if user_id and "created_by" in model_cols:
            cleaned_data["created_by"] = user_id

        db_obj = Complaint(**cleaned_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: Complaint, obj_in: ComplaintUpdate | dict, user_id: uuid.UUID | None = None
    ) -> Complaint:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        model_cols = {c.name for c in Complaint.__table__.columns}
        cleaned_data = {k: v for k, v in update_data.items() if k in model_cols}

        if user_id and "updated_by" in model_cols:
            cleaned_data["updated_by"] = user_id

        for field, value in cleaned_data.items():
            setattr(db_obj, field, value)

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_tenant(self, db: AsyncSession, tenant_profile_id: uuid.UUID) -> list[Complaint]:
        statement = select(Complaint).where(
            Complaint.tenant_id == tenant_profile_id,
            Complaint.deleted_at.is_(None)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_by_property(self, db: AsyncSession, property_id: uuid.UUID) -> list[Complaint]:
        statement = select(Complaint).where(
            Complaint.property_id == property_id,
            Complaint.deleted_at.is_(None)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def assign_staff(
        self, db: AsyncSession, *, complaint_id: uuid.UUID, staff_id: uuid.UUID, user_id: uuid.UUID
    ) -> Complaint | None:
        """
        Assign a staff member to the ticket and record timeline transition.
        """
        complaint = await self.get(db, complaint_id)
        if not complaint:
            return None

        old_status = complaint.status
        new_status = ComplaintStatus.ASSIGNED

        complaint.staff_id = staff_id
        complaint.status = new_status
        complaint.updated_by = user_id

        # Log to timeline
        timeline = ComplaintTimeline(
            complaint_id=complaint_id,
            from_status=old_status,
            to_status=new_status,
            changed_by=user_id,
            remarks=f"Assigned staff member ID: {staff_id}",
        )
        db.add(complaint)
        db.add(timeline)
        await db.commit()
        await db.refresh(complaint)
        return complaint

    async def update_status(
        self, db: AsyncSession, *, complaint_id: uuid.UUID, new_status: ComplaintStatus, user_id: uuid.UUID, remarks: str | None = None
    ) -> Complaint | None:
        """
        Update the complaint status and log details to the timeline audit.
        """
        complaint = await self.get(db, complaint_id)
        if not complaint:
            return None

        old_status = complaint.status
        complaint.status = new_status
        complaint.updated_by = user_id

        # Log to timeline
        timeline = ComplaintTimeline(
            complaint_id=complaint_id,
            from_status=old_status,
            to_status=new_status,
            changed_by=user_id,
            remarks=remarks or f"Status updated from {old_status.value} to {new_status.value}",
        )
        db.add(complaint)
        db.add(timeline)
        await db.commit()
        await db.refresh(complaint)
        return complaint


class CRUDComplaintTimeline(BaseRepository[ComplaintTimeline, ComplaintTimelineCreate, BaseModel]):
    pass


complaint_crud = CRUDComplaint(Complaint)
timeline_crud = CRUDComplaintTimeline(ComplaintTimeline)
