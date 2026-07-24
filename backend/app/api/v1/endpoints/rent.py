import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.crud.crud_billing import invoice_crud, payment_crud
from app.crud.crud_tenant import tenant_crud
from app.crud.crud_user import user_crud
from app.models.users import User
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.schemas.billing import (
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
    tenant = await tenant_crud.get(db, id=obj_in.tenant_profile_id)
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
        return await invoice_crud.get_by_tenant(db, tenant_profile_id=tenant_id)
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


@router.post("/invoices/{id}/pdf")
async def build_invoice_pdf(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("invoice", PermissionAction.PRINT)),
) -> Any:
    """
    Generate the ReportLab PDF for an invoice.
    """
    invoice = await invoice_crud.get(db, id=id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    tenant = await tenant_crud.get(db, id=invoice.tenant_profile_id)
    tenant_user = await user_crud.get(db, id=tenant.user_id) if tenant else None
    tenant_name = tenant_user.full_name if tenant_user else "Unknown Tenant"
    
    room_number = "N/A"
    if tenant and tenant.bed_id:
        from app.models.beds import Bed
        from app.models.rooms import Room
        statement = select(Room.room_number).join(Bed).where(Bed.id == tenant.bed_id)
        result = await db.execute(statement)
        room_number = result.scalar() or "N/A"

    billing_period = f"{invoice.billing_period_start} to {invoice.billing_period_end}"
    invoice_number = str(invoice.id)[:8].upper()

    pdf_path = generate_invoice_pdf(
        invoice_id=str(invoice.id),
        invoice_number=invoice_number,
        billing_period=billing_period,
        due_date=str(invoice.due_date),
        tenant_name=tenant_name,
        room_number=room_number,
        rent_amount=float(invoice.rent_amount),
        utility_charges=float(invoice.utility_charges),
        late_fees=float(invoice.late_fees),
        discount=float(invoice.discount),
        total_amount=float(invoice.total_amount),
        status=invoice.status.value,
    )

    # Save PDF path on the invoice record
    invoice.pdf_url = pdf_path
    db.add(invoice)
    await db.commit()

    return {"pdf_url": pdf_path}


@router.get("/invoices/{id}/download-pdf")
async def download_invoice_pdf(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("invoice", PermissionAction.PRINT)),
) -> Any:
    """
    Download the generated PDF invoice file.
    """
    invoice = await invoice_crud.get(db, id=id)
    if not invoice or not invoice.pdf_url:
        raise HTTPException(status_code=404, detail="Invoice PDF not found. Generate it first.")
        
    return FileResponse(
        path=invoice.pdf_url,
        media_type="application/pdf",
        filename=f"invoice_{str(invoice.id)[:8].upper()}.pdf"
    )


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
