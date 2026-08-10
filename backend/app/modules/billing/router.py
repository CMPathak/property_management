import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.modules.billing.repository import invoice_crud, payment_crud
from app.modules.tenant.repository import tenant_crud
from app.modules.users.repository import user_crud
from app.modules.users.model import User
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.modules.billing.schema import (
    InvoiceCreate,
    InvoiceResponse,
    PaymentCreate,
    PaymentResponse,
)
from app.utils.pdf import generate_invoice_pdf

router = APIRouter()


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: InvoiceCreate,
    current_user: User = Depends(PermissionChecker("invoice", PermissionAction.CREATE)),
) -> Any:
    """
    Create a new invoice.
    """
    tenant = await tenant_crud.get(db, id=obj_in.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    return await invoice_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    tenant_id: uuid.UUID | None = None,
    current_user: User = Depends(PermissionChecker("invoice", PermissionAction.READ)),
) -> Any:
    """
    List invoices (filtered by tenant if provided).
    """
    if tenant_id:
        return await invoice_crud.get_by_tenant(db, tenant_id=tenant_id)
    return await invoice_crud.get_multi(db, skip=skip, limit=limit)


@router.get("/pending", response_model=list[InvoiceResponse])
async def get_pending_rent(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("invoice", PermissionAction.READ)),
) -> Any:
    """
    Get all pending (unpaid or partially paid) rent invoices.
    """
    return await invoice_crud.get_unpaid(db)


@router.get("/invoices/{id}", response_model=InvoiceResponse)
async def get_invoice(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("invoice", PermissionAction.READ)),
) -> Any:
    """
    Get invoice details.
    """
    invoice = await invoice_crud.get(db, id=id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice




@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: PaymentCreate,
    current_user: User = Depends(PermissionChecker("payment", PermissionAction.CREATE)),
) -> Any:
    """
    Record a tenant payment transaction.
    """
    invoice = await invoice_crud.get(db, id=obj_in.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    return await payment_crud.create(db, obj_in=obj_in, user_id=current_user.id)

@router.get("/current-invoice", response_model=InvoiceResponse)
async def get_current_invoice(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current pending/unpaid invoice for the logged-in tenant.
    """
    tenant = await tenant_crud.get_by_user_id(db, user_id=current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    query = select(Invoice).where(
        Invoice.tenant_id == tenant.id,
        Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID])
    ).order_by(Invoice.due_date.asc()).limit(1)
    
    result = await db.execute(query)
    invoice = result.scalars().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="No pending invoices found")
    return invoice

@router.get("/payment-history", response_model=list[PaymentResponse])
async def get_payment_history(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get past payments for the logged-in tenant.
    """
    tenant = await tenant_crud.get_by_user_id(db, user_id=current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    query = select(Payment).where(Payment.tenant_id == tenant.id).order_by(Payment.payment_date.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/payments/submit", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def submit_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: PaymentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Record a tenant payment transaction and set it to PENDING_VERIFICATION.
    """
    invoice = await invoice_crud.get(db, id=obj_in.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    tenant = await tenant_crud.get_by_user_id(db, user_id=current_user.id)
    if not tenant or str(tenant.id) != str(invoice.tenant_id):
        raise HTTPException(status_code=403, detail="Not authorized to pay this invoice")
        
    # Payment status defaults to PENDING_VERIFICATION in the schema/model
    return await payment_crud.create(db, obj_in=obj_in, user_id=current_user.id)

@router.post("/payments/{payment_id}/approve")
async def approve_payment(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("payment", PermissionAction.UPDATE)),
) -> Any:
    """
    Owner approves payment -> updates invoice to PAID, triggers success email.
    """
    payment = await payment_crud.get(db, id=payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    payment.status = PaymentStatus.SUCCESS
    
    invoice = await invoice_crud.get(db, id=payment.invoice_id)
    if invoice:
        invoice.status = InvoiceStatus.PAID
        invoice.paid_amount += payment.amount
        
        # Load tenant for email
        tenant = await tenant_crud.get(db, id=invoice.tenant_id)
        if tenant:
            user = await user_crud.get(db, id=tenant.user_id)
            if user:
                from app.utils.email import send_payment_success_email
                await send_payment_success_email(
                    tenant_email=user.email,
                    tenant_name=user.full_name,
                    invoice_no=invoice.invoice_no,
                    amount=payment.amount
                )
                
    await db.commit()
    return {"status": "success", "message": "Payment approved successfully."}

@router.post("/payments/{payment_id}/reject")
async def reject_payment(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("payment", PermissionAction.UPDATE)),
) -> Any:
    """
    Owner rejects payment.
    """
    payment = await payment_crud.get(db, id=payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    payment.status = PaymentStatus.REJECTED
    await db.commit()
    return {"status": "success", "message": "Payment rejected."}

from app.modules.billing.model import PaymentSettings, Invoice, Payment, InvoiceStatus, PaymentStatus
from app.modules.billing.schema import PaymentSettingsResponse

@router.get("/payment-settings", response_model=PaymentSettingsResponse)
async def get_payment_settings(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Fetch payment settings (QR Code, UPI ID) for the tenant.
    """
    query = select(PaymentSettings).where(PaymentSettings.is_active == True).limit(1)
    result = await db.execute(query)
    settings = result.scalars().first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Payment settings not found")
        
    return settings

@router.get("/invoices/{invoice_id}/download")
async def download_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Download the generated PDF invoice.
    """
    invoice = await invoice_crud.get(db, id=invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    tenant = await tenant_crud.get(db, id=invoice.tenant_id)
    tenant_user = await user_crud.get(db, id=tenant.user_id) if tenant else None
    
    # We call our generator
    file_path = generate_invoice_pdf(
        invoice_id=str(invoice.id),
        invoice_number=invoice.invoice_no,
        billing_period=f"{invoice.billing_start_date} to {invoice.billing_end_date}",
        due_date=str(invoice.due_date),
        tenant_name=tenant_user.full_name if tenant_user else "Unknown Tenant",
        room_number="Room/Bed info",
        rent_amount=float(invoice.rent_amount),
        security_deposit=float(invoice.security_deposit),
        utility_charges=0.0,
        late_fees=0.0,
        discount=0.0,
        total_amount=float(invoice.total_amount),
        status=invoice.status.value
    )
    
    return FileResponse(file_path, filename=f"Invoice_{invoice.invoice_no}.pdf", media_type="application/pdf")


@router.get("/payments", response_model=list[PaymentResponse])
async def list_payments(
    db: AsyncSession = Depends(deps.get_db),
    status: PaymentStatus | None = None,
    current_user: User = Depends(PermissionChecker("payment", PermissionAction.READ)),
) -> Any:
    """
    List all payments.
    """
    from sqlalchemy.orm import selectinload
    from app.modules.tenant.model import TenantProfile
    query = (
        select(Payment)
        .options(
            selectinload(Payment.tenant).selectinload(TenantProfile.user),
            selectinload(Payment.tenant).selectinload(TenantProfile.bed)
        )
        .order_by(Payment.payment_date.desc())
    )
    if status:
        query = query.where(Payment.status == status)
    result = await db.execute(query)
    return result.scalars().all()

