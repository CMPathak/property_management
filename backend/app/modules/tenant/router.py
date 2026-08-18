import uuid
from datetime import date
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.modules.tenant.repository import tenant_crud, agreement_crud
from app.modules.beds.repository import bed_crud
from app.utils.storage import storage_provider
from app.modules.users.model import User, UserRole
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.modules.tenant.schema import (
    TenantProfileCreate,
    TenantProfileUpdate,
    TenantProfileResponse,
    AgreementCreate,
    AgreementResponse,
    AgreementUpdate,
    TenantOnboard,
)
from sqlalchemy.orm import selectinload
from app.modules.tenant.model import TenantProfile, TenantStatus, AgreementStatus

router = APIRouter()


@router.post("/", response_model=TenantProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant_profile(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: TenantProfileCreate,
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.CREATE)),
) -> Any:
    """
    Create a new tenant profile or update if a profile for this user already exists.
    """
    from app.modules.beds.model import Bed, BedStatus
    from app.modules.users.repository import user_crud
    import random, string

    if not getattr(obj_in, "tenant_code", None):
        obj_in.tenant_code = "TEN-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    if obj_in.bed_id:
        bed_stmt = select(Bed).options(selectinload(Bed.room)).where(Bed.id == obj_in.bed_id)
        bed_res = await db.execute(bed_stmt)
        bed_obj = bed_res.scalar_one_or_none()
        if bed_obj and bed_obj.room:
            obj_in.room_id = bed_obj.room.id
            obj_in.property_id = bed_obj.room.property_id

    # Check if a tenant profile already exists for this user_id (active or soft-deleted)
    stmt = select(TenantProfile).where(TenantProfile.user_id == obj_in.user_id)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.deleted_at = None
        if obj_in.bed_id:
            existing.bed_id = obj_in.bed_id
        if obj_in.security_deposit is not None:
            existing.security_deposit = obj_in.security_deposit
        if obj_in.admission_date:
            existing.admission_date = obj_in.admission_date
        if obj_in.status:
            existing.status = obj_in.status
        if getattr(obj_in, "guardian_name", None) is not None:
            existing.guardian_name = obj_in.guardian_name
        if getattr(obj_in, "guardian_phone", None) is not None:
            existing.guardian_phone = obj_in.guardian_phone
        if getattr(obj_in, "guardian_relation", None) is not None:
            existing.guardian_relation = obj_in.guardian_relation
        if getattr(obj_in, "monthly_rent", None) is not None:
            existing.monthly_rent = obj_in.monthly_rent
        if getattr(obj_in, "room_id", None):
            existing.room_id = obj_in.room_id
        if getattr(obj_in, "property_id", None):
            existing.property_id = obj_in.property_id
        if getattr(obj_in, "tenant_code", None) and not existing.tenant_code:
            existing.tenant_code = obj_in.tenant_code

        if obj_in.bed_id:
            bed_stmt = select(Bed).where(Bed.id == obj_in.bed_id)
            bed_res = await db.execute(bed_stmt)
            bed_obj = bed_res.scalar_one_or_none()
            if bed_obj:
                bed_obj.status = BedStatus.OCCUPIED

        await db.commit()
        await db.refresh(existing)
        created = existing
    else:
        created = await tenant_crud.create(db, obj_in=obj_in, user_id=current_user.id)
        if created.bed_id:
            bed_stmt = select(Bed).where(Bed.id == created.bed_id)
            bed_res = await db.execute(bed_stmt)
            bed_obj = bed_res.scalar_one_or_none()
            if bed_obj:
                bed_obj.status = BedStatus.OCCUPIED
                await db.commit()
                await db.refresh(created)

    # Update User fields if provided
    user_fields = ["dob", "gender", "nationality", "occupation", "address"]
    user_needs_update = any(getattr(obj_in, field, None) is not None for field in user_fields)
    
    if user_needs_update:
        user_obj = await user_crud.get(db, id=created.user_id)
        if user_obj:
            if getattr(obj_in, "dob", None) is not None:
                user_obj.dob = obj_in.dob
            if getattr(obj_in, "gender", None) is not None:
                user_obj.gender = obj_in.gender
            if getattr(obj_in, "nationality", None) is not None:
                user_obj.nationality = obj_in.nationality
            if getattr(obj_in, "occupation", None) is not None:
                user_obj.occupation = obj_in.occupation
            if getattr(obj_in, "address", None) is not None:
                user_obj.address = obj_in.address
            db.add(user_obj)
            await db.commit()

    user_obj = await user_crud.get(db, id=created.user_id)

    room_bed_str = "Not Allocated"
    if created.bed_id:
        statement = select(Bed).options(selectinload(Bed.room)).where(Bed.id == created.bed_id)
        res = await db.execute(statement)
        bed_obj = res.scalar_one_or_none()
        if bed_obj:
            room_num = bed_obj.room.room_number if bed_obj.room else "Unknown"
            room_bed_str = f"Room {room_num} - Bed {bed_obj.bed_number}"
            
    # Build dictionary matching TenantProfileResponse schema exactly
    response_dict = {
        "id": created.id,
        "user_id": created.user_id,
        "bed_id": created.bed_id,
        "created_at": created.created_at,
        "updated_at": created.updated_at,
        "security_deposit": created.security_deposit,
        "admission_date": created.admission_date,
        "status": created.status,
        "full_name": user_obj.full_name if user_obj else None,
        "email": user_obj.email if user_obj else None,
        "phone": user_obj.phone if user_obj else None,
        "room_bed": room_bed_str
    }
    
    return response_dict


@router.post("/onboard", response_model=TenantProfileResponse, status_code=status.HTTP_201_CREATED)
async def onboard_tenant(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: TenantOnboard,
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.CREATE)),
) -> Any:
    """
    Onboard a new tenant from the frontend form.
    Creates or updates the User and TenantProfile.
    """
    from app.modules.beds.model import Bed, BedStatus
    from app.modules.users.repository import user_crud
    from app.modules.users.schema import UserCreate
    
    # 1. Handle User
    user_obj = await user_crud.get_by_email(db, email=obj_in.email)
    user_by_phone = await user_crud.get_by_phone(db, phone=obj_in.phone_number)

    if user_by_phone and (not user_obj or user_obj.id != user_by_phone.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this phone number already exists under a different email."
        )

    if not user_obj:
        import string
        import random
        # Generate random password for the new user
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        user_create = UserCreate(
            email=obj_in.email,
            password=password,
            full_name=obj_in.full_name,
            phone=obj_in.phone_number,
            role=UserRole.TENANT,
            dob=obj_in.dob,
            gender=obj_in.gender,
            address=obj_in.address,
            nationality=obj_in.nationality,
            occupation=obj_in.occupation,
        )
        user_obj = await user_crud.create(db, obj_in=user_create)
    else:
        # Update existing user if needed
        user_obj.full_name = obj_in.full_name
        user_obj.phone = obj_in.phone_number
        if obj_in.dob:
            user_obj.dob = obj_in.dob
        if obj_in.gender:
            user_obj.gender = obj_in.gender
        if obj_in.address:
            user_obj.address = obj_in.address
        db.add(user_obj)
        await db.commit()
        await db.refresh(user_obj)

    # 2. Handle TenantProfile
    stmt = select(TenantProfile).where(TenantProfile.user_id == user_obj.id)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.deleted_at = None
        existing.bed_id = obj_in.bed_id
        existing.security_deposit = obj_in.security_deposit
        existing.admission_date = obj_in.check_in_date
        existing.check_out_date = obj_in.check_out_date
        existing.status = TenantStatus.ACTIVE
        existing.guardian_name = obj_in.guardian_name
        existing.guardian_phone = obj_in.guardian_phone
        existing.guardian_relation = obj_in.guardian_relation
        existing.monthly_rent = obj_in.monthly_rent
        await db.commit()
        await db.refresh(existing)
        created = existing
    else:
        profile_create = TenantProfileCreate(
            user_id=user_obj.id,
            bed_id=obj_in.bed_id,
            security_deposit=obj_in.security_deposit,
            admission_date=obj_in.check_in_date,
            status=TenantStatus.ACTIVE,
            guardian_name=obj_in.guardian_name,
            guardian_phone=obj_in.guardian_phone,
            guardian_relation=obj_in.guardian_relation,
            monthly_rent=obj_in.monthly_rent,
        )
        created = await tenant_crud.create(db, obj_in=profile_create, user_id=current_user.id)
        created.check_out_date = obj_in.check_out_date
        db.add(created)
        await db.commit()
        await db.refresh(created)

    # 3. Handle Bed Status
    room_bed_str = "Not Allocated"
    if created.bed_id:
        bed_stmt = select(Bed).options(selectinload(Bed.room)).where(Bed.id == created.bed_id)
        bed_res = await db.execute(bed_stmt)
        bed_obj = bed_res.scalar_one_or_none()
        if bed_obj:
            bed_obj.status = BedStatus.OCCUPIED
            db.add(bed_obj)
            await db.commit()
            
            room_num = bed_obj.room.room_number if bed_obj.room else "Unknown"
            room_bed_str = f"Room {room_num} - Bed {bed_obj.bed_number}"

    # Build response dict
    response_dict = {
        "id": created.id,
        "user_id": created.user_id,
        "bed_id": created.bed_id,
        "created_at": created.created_at,
        "updated_at": created.updated_at,
        "security_deposit": created.security_deposit,
        "admission_date": created.admission_date,
        "check_out_date": created.check_out_date,
        "status": created.status,
        "full_name": user_obj.full_name,
        "email": user_obj.email,
        "phone": user_obj.phone,
        "room_bed": room_bed_str
    }
    
    return response_dict

@router.get("/", response_model=list[TenantProfileResponse])
async def list_tenants(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    status_filter: TenantStatus | None = None,
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.READ)),
) -> Any:
    """
    List tenant profiles, optionally filtered by status.
    """
    conditions = [tenant_crud.model.deleted_at.is_(None)]
    if status_filter:
        conditions.append(tenant_crud.model.status == status_filter)

    statement = (
        select(tenant_crud.model)
        .options(
            selectinload(TenantProfile.user),
            selectinload(TenantProfile.bed).selectinload(bed_crud.model.room),
            selectinload(TenantProfile.agreements),
        )
        .where(and_(*conditions))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(statement)
    return list(result.scalars().all())


@router.get("/{id}", response_model=TenantProfileResponse)
async def get_tenant_profile(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.READ)),
) -> Any:
    """
    Get tenant profile by ID.
    """
    statement = (
        select(TenantProfile)
        .options(
            selectinload(TenantProfile.user),
            selectinload(TenantProfile.bed).selectinload(bed_crud.model.room),
            selectinload(TenantProfile.agreements),
        )
        .where(TenantProfile.id == id)
    )
    result = await db.execute(statement)
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
    return tenant


@router.put("/{id}", response_model=TenantProfileResponse)
async def update_tenant_profile(
    id: uuid.UUID,
    obj_in: TenantProfileUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.UPDATE)),
) -> Any:
    """
    Update tenant profile.
    """
    db_obj = await tenant_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    # Update related user fields if provided
    user_fields = ["full_name", "email", "phone", "dob", "gender", "nationality", "occupation", "address"]
    user_needs_update = any(getattr(obj_in, field, None) is not None for field in user_fields)
    
    if user_needs_update:
        from app.modules.users.repository import user_crud
        user_obj = await user_crud.get(db, id=db_obj.user_id)
        if user_obj:
            if obj_in.full_name is not None:
                user_obj.full_name = obj_in.full_name
            if obj_in.email is not None:
                # Check email uniqueness if email is changed
                if obj_in.email != user_obj.email:
                    existing_user = await user_crud.get_by_email(db, email=obj_in.email)
                    if existing_user:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="A user with this email already exists."
                        )
                user_obj.email = obj_in.email
            if obj_in.phone is not None:
                user_obj.phone = obj_in.phone
            if obj_in.dob is not None:
                user_obj.dob = obj_in.dob
            if obj_in.gender is not None:
                user_obj.gender = obj_in.gender
            if obj_in.nationality is not None:
                user_obj.nationality = obj_in.nationality
            if obj_in.occupation is not None:
                user_obj.occupation = obj_in.occupation
            if obj_in.address is not None:
                user_obj.address = obj_in.address
            db.add(user_obj)
            
    updated_tenant = await tenant_crud.update(db, db_obj=db_obj, obj_in=obj_in, user_id=current_user.id)
    if obj_in.bed_id:
        from app.modules.beds.model import Bed, BedStatus
        bed_stmt = select(Bed).where(Bed.id == obj_in.bed_id)
        bed_res = await db.execute(bed_stmt)
        bed_obj = bed_res.scalar_one_or_none()
        if bed_obj:
            bed_obj.status = BedStatus.OCCUPIED
            await db.commit()
    # Refresh to load updated User relationship values
    await db.refresh(updated_tenant)
    return updated_tenant


@router.delete("/{id}", response_model=TenantProfileResponse)
async def delete_tenant_profile(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.DELETE)),
) -> Any:
    """
    Soft delete a tenant profile.
    """
    db_obj = await tenant_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
    return await tenant_crud.remove(db, id=id, user_id=current_user.id)


@router.post("/{id}/check-in", response_model=TenantProfileResponse)
async def check_in_tenant(
    id: uuid.UUID,
    bed_id: uuid.UUID,
    check_in_date: date,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.ASSIGN)),
) -> Any:
    """
    Check in a tenant and allocate a bed.
    """
    tenant = await tenant_crud.check_in(
        db, tenant_id=id, bed_id=bed_id, check_in_date=check_in_date, user_id=current_user.id
    )
    if not tenant:
        raise HTTPException(
            status_code=400,
            detail="Check-in failed. Tenant may not exist, or the bed is already occupied/not found."
        )
    return tenant


@router.post("/{id}/check-out", response_model=TenantProfileResponse)
async def check_out_tenant(
    id: uuid.UUID,
    check_out_date: date,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.ASSIGN)),
) -> Any:
    """
    Check out a tenant and release their bed.
    """
    tenant = await tenant_crud.check_out(
        db, tenant_id=id, check_out_date=check_out_date, user_id=current_user.id
    )
    if not tenant:
        raise HTTPException(
            status_code=400,
            detail="Check-out failed. Tenant may not exist or is already inactive."
        )
    return tenant



# --- Agreement Endpoints ---

@router.post("/{id}/agreements", response_model=AgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_lease_agreement(
    id: uuid.UUID,
    obj_in: AgreementCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("agreement", PermissionAction.CREATE)),
) -> Any:
    """
    Create a new lease agreement for a tenant.
    """
    if id != obj_in.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant Profile ID mismatch")

    # Deactivate existing active agreement if any
    active_agreement = await agreement_crud.get_active_agreement(db, tenant_id=id)
    if active_agreement:
        active_agreement.status = AgreementStatus.EXPIRED
        db.add(active_agreement)

    # Auto-generate agreement_no if not provided
    if not obj_in.agreement_no:
        import random, datetime
        datestr = datetime.date.today().strftime("%Y%m%d")
        rand_digit = random.randint(1000, 9999)
        obj_in.agreement_no = f"AGR-{datestr}-{rand_digit}"

    agreement = await agreement_crud.create(db, obj_in=obj_in, user_id=current_user.id)

    try:
        from app.modules.billing.model import Invoice, InvoiceStatus
        import random, datetime
        start = obj_in.start_date
        due = start + datetime.timedelta(days=5)
        end = obj_in.end_date or (start + datetime.timedelta(days=365))
        datestr = datetime.date.today().strftime("%Y%m")
        
        # 1. Rent Invoice
        inv_no = f"INV-{datestr}-{random.randint(1000, 9999)}"
        rent_invoice = Invoice(
            tenant_id=id,
            invoice_no=inv_no,
            billing_start_date=start,
            billing_end_date=end,
            invoice_date=datetime.date.today(),
            due_date=due,
            rent_amount=float(obj_in.rent_amount),
            security_deposit=0.0,
            total_amount=float(obj_in.rent_amount),
            paid_amount=0.0,
            status=InvoiceStatus.PENDING
        )
        db.add(rent_invoice)
        
        # 2. Security Deposit Invoice (if applicable)
        if obj_in.security_deposit and float(obj_in.security_deposit) > 0:
            sec_inv_no = f"INV-{datestr}-SEC-{random.randint(1000, 9999)}"
            sec_invoice = Invoice(
                tenant_id=id,
                invoice_no=sec_inv_no,
                billing_start_date=start,
                billing_end_date=end,
                invoice_date=datetime.date.today(),
                due_date=due,
                rent_amount=0.0,
                security_deposit=float(obj_in.security_deposit),
                total_amount=float(obj_in.security_deposit),
                paid_amount=0.0,
                status=InvoiceStatus.PENDING
            )
            db.add(sec_invoice)
            
        await db.commit()
    except Exception as e:
        print(f"Auto invoice creation notice: {e}")

    return agreement



@router.put("/agreements/{agreement_id}/terminate", response_model=AgreementResponse)
async def terminate_agreement(
    agreement_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("agreement", PermissionAction.UPDATE)),
) -> Any:
    """
    Manually terminate a lease agreement.
    """
    agreement = await agreement_crud.get(db, id=agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
        
    agreement.status = AgreementStatus.TERMINATED
    db.add(agreement)
    await db.commit()
    await db.refresh(agreement)
    return agreement


@router.get("/agreements/{agreement_id}/download-pdf")
async def download_agreement_pdf(
    agreement_id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("agreement", PermissionAction.READ)),
) -> Any:
    """
    Generate and download PDF for a specific lease agreement.
    """
    from fastapi.responses import FileResponse
    from app.utils.pdf import generate_agreement_pdf

    agreement = await agreement_crud.get(db, id=agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    tenant = await tenant_crud.get(db, id=agreement.tenant_id)
    tenant_name = "Tenant"
    room_bed = "Allocated"
    if tenant:
        from app.modules.users.repository import user_crud
        user_obj = await user_crud.get(db, id=tenant.user_id)
        if user_obj:
            tenant_name = user_obj.full_name or user_obj.email
        if tenant.bed_id:
            from app.modules.beds.repository import bed_crud
            bed = await bed_crud.get(db, id=tenant.bed_id)
            if bed:
                room_bed = f"Bed {bed.bed_number}"

    pdf_path = generate_agreement_pdf(
        agreement_no=agreement.agreement_no or str(agreement.id)[:8],
        tenant_name=tenant_name,
        room_bed=room_bed,
        start_date=str(agreement.start_date),
        end_date=str(agreement.end_date) if agreement.end_date else "Open-ended",
        rent_amount=float(agreement.rent_amount or 0.0),
        security_deposit=float(agreement.deposit_amount or 0.0),
        status=str(agreement.status or "ACTIVE"),
    )

    filename = f"Agreement_{agreement.agreement_no or str(agreement.id)[:8]}.pdf"
    return FileResponse(pdf_path, filename=filename, media_type="application/pdf")

