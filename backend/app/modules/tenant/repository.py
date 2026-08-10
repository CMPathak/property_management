import uuid
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tenant.model import TenantProfile, Agreement, TenantStatus, AgreementStatus
from app.modules.beds.model import Bed, BedStatus
from app.repositories.base import BaseRepository
from app.modules.tenant.schema import (
    TenantProfileCreate,
    TenantProfileUpdate,
    AgreementCreate,
    AgreementUpdate,
)


from sqlalchemy.orm import selectinload
from sqlalchemy import and_

class CRUDTenantProfile(BaseRepository[TenantProfile, TenantProfileCreate, TenantProfileUpdate]):
    async def get(self, db: AsyncSession, id: uuid.UUID) -> TenantProfile | None:
        statement = select(self.model).options(
            selectinload(TenantProfile.user),
            selectinload(TenantProfile.bed).selectinload(Bed.room)
        ).where(
            and_(self.model.id == id, self.model.deleted_at.is_(None))
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> list[TenantProfile]:
        statement = (
            select(self.model)
            .options(
                selectinload(TenantProfile.user),
                selectinload(TenantProfile.bed).selectinload(Bed.room)
            )
            .where(self.model.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_by_user_id(self, db: AsyncSession, user_id: uuid.UUID) -> TenantProfile | None:
        statement = select(TenantProfile).options(
            selectinload(TenantProfile.user),
            selectinload(TenantProfile.bed).selectinload(Bed.room)
        ).where(
            TenantProfile.user_id == user_id, TenantProfile.deleted_at.is_(None)
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def check_in(
        self, db: AsyncSession, *, tenant_id: uuid.UUID, bed_id: uuid.UUID, check_in_date: date, user_id: uuid.UUID | None = None
    ) -> TenantProfile | None:
        """
        Check in a tenant. Allocates a bed, changes bed status to OCCUPIED,
        sets tenant status to ACTIVE, and registers admission date.
        """
        tenant = await self.get(db, tenant_id)
        if not tenant:
            return None

        # Fetch Bed
        statement = select(Bed).where(Bed.id == bed_id)
        result = await db.execute(statement)
        bed = result.scalar_one_or_none()
        if not bed or bed.status != BedStatus.VACANT:
            return None

        # Update Bed status
        bed.status = BedStatus.OCCUPIED
        db.add(bed)

        # Update Tenant profile
        tenant.bed_id = bed_id
        tenant.admission_date = check_in_date
        tenant.status = TenantStatus.ACTIVE
        
        if user_id:
            tenant.updated_by = user_id

        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)
        return tenant

    async def check_out(
        self, db: AsyncSession, *, tenant_id: uuid.UUID, check_out_date: date, user_id: uuid.UUID | None = None
    ) -> TenantProfile | None:
        """
        Check out a tenant. Releases the assigned bed (sets status to VACANT),
        sets tenant status to INACTIVE.
        """
        tenant = await self.get(db, tenant_id)
        if not tenant or tenant.status != TenantStatus.ACTIVE:
            return None

        if tenant.bed_id:
            # Free up the bed
            statement = select(Bed).where(Bed.id == tenant.bed_id)
            result = await db.execute(statement)
            bed = result.scalar_one_or_none()
            if bed:
                bed.status = BedStatus.VACANT
                db.add(bed)

        # Update Tenant profile
        tenant.bed_id = None
        tenant.status = TenantStatus.INACTIVE
        
        if user_id:
            tenant.updated_by = user_id

        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)
        return tenant


class CRUDAgreement(BaseRepository[Agreement, AgreementCreate, AgreementUpdate]):
    async def get_active_agreement(self, db: AsyncSession, tenant_id: uuid.UUID) -> Agreement | None:
        statement = select(Agreement).where(
            Agreement.tenant_id == tenant_id,
            Agreement.status == AgreementStatus.ACTIVE,
            Agreement.deleted_at.is_(None)
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()


tenant_crud = CRUDTenantProfile(TenantProfile)
agreement_crud = CRUDAgreement(Agreement)
