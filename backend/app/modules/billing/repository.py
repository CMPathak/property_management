import uuid
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.billing.model import (
    Invoice,
    Payment,
    RentReminder,
    InvoiceStatus,
    PaymentStatus,
)
from app.repositories.base import BaseRepository
from app.modules.billing.schema import (
    InvoiceCreate,
    InvoiceUpdate,
    PaymentCreate,
    PaymentBase,
)


class CRUDInvoice(BaseRepository[Invoice, InvoiceCreate, InvoiceUpdate]):
    async def get_by_tenant(self, db: AsyncSession, tenant_id: uuid.UUID) -> list[Invoice]:
        from sqlalchemy.orm import selectinload
        from app.modules.tenant.model import TenantProfile
        statement = (
            select(Invoice)
            .options(
                selectinload(Invoice.tenant_profile).selectinload(TenantProfile.user),
                selectinload(Invoice.tenant_profile).selectinload(TenantProfile.bed)
            )
            .where(
                Invoice.tenant_id == tenant_id,
                Invoice.deleted_at.is_(None)
            )
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_unpaid(self, db: AsyncSession) -> list[Invoice]:
        from sqlalchemy.orm import selectinload
        from app.modules.tenant.model import TenantProfile
        statement = (
            select(Invoice)
            .options(
                selectinload(Invoice.tenant_profile).selectinload(TenantProfile.user),
                selectinload(Invoice.tenant_profile).selectinload(TenantProfile.bed)
            )
            .where(
                and_(
                    Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID]),
                    Invoice.deleted_at.is_(None)
                )
            )
        )
        result = await db.execute(statement)
        return list(result.scalars().all())


class CRUDPayment(BaseRepository[Payment, PaymentCreate, PaymentBase]):
    async def create(
        self, db: AsyncSession, *, obj_in: PaymentCreate, user_id: uuid.UUID | None = None
    ) -> Payment:
        """
        Record a payment and update the parent invoice status/ledger.
        """
        # Create payment record
        payment = Payment(
            invoice_id=obj_in.invoice_id,
            amount=obj_in.amount,
            payment_mode=obj_in.payment_mode,
            transaction_id=obj_in.transaction_id,
            status=obj_in.status,
        )
        if user_id:
            payment.created_by = user_id
            payment.updated_by = user_id
            
        db.add(payment)
        
        # If the payment is completed, update the invoice paid amount
        if obj_in.status == PaymentStatus.COMPLETED:
            # Fetch invoice
            statement = select(Invoice).where(Invoice.id == obj_in.invoice_id)
            result = await db.execute(statement)
            invoice = result.scalar_one_or_none()
            if invoice:
                invoice.paid_amount = float(invoice.paid_amount) + float(obj_in.amount)
                
                # Check status transitions
                if invoice.paid_amount >= invoice.total_amount:
                    invoice.status = InvoiceStatus.PAID
                elif invoice.paid_amount > 0:
                    invoice.status = InvoiceStatus.PARTIALLY_PAID
                    
                if user_id:
                    invoice.updated_by = user_id
                    
                db.add(invoice)

        await db.commit()
        await db.refresh(payment)
        return payment


class CRUDRentReminder(BaseRepository[RentReminder, BaseModel, BaseModel]):
    pass


invoice_crud = CRUDInvoice(Invoice)
payment_crud = CRUDPayment(Payment)
reminder_crud = CRUDRentReminder(RentReminder)
