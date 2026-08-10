import uuid
from datetime import date
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.crud.crud_tenant import tenant_crud, agreement_crud
from app.crud.crud_beds import bed_crud
from app.utils.storage import storage_provider
from app.models.users import User, UserRole
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.schemas.tenant import (
    TenantProfileCreate,
    TenantProfileUpdate,
    TenantProfileResponse,
    AgreementCreate,
    AgreementResponse,
    AgreementUpdate,
)
from sqlalchemy.orm import selectinload
from app.models.tenant import TenantProfile, TenantStatus, AgreementStatus

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
    from app.models.beds import Bed, BedStatus
    from app.crud.crud_user import user_crud

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
        if obj_in.check_in_date:
            existing.check_in_date = obj_in.check_in_date
        if obj_in.check_out_date:
            existing.check_out_date = obj_in.check_out_date
        if obj_in.status:
            existing.status = obj_in.status
        if obj_in.emergency_contact:
            existing.emergency_contact = obj_in.emergency_contact
        if obj_in.guardian_name is not None:
            existing.guardian_name = obj_in.guardian_name
        if obj_in.guardian_phone is not None:
            existing.guardian_phone = obj_in.guardian_phone
        if obj_in.guardian_relation is not None:
            existing.guardian_relation = obj_in.guardian_relation
        if obj_in.monthly_rent is not None:
            existing.monthly_rent = obj_in.monthly_rent

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
        "photo_url": created.photo_url,
        "aadhaar_number": created.aadhaar_number,
        "pan_number": created.pan_number,
        "passport_number": created.passport_number,
        "driving_license": created.driving_license,
        "emergency_contact": created.emergency_contact,
        "security_deposit": created.security_deposit,
        "check_in_date": created.check_in_date,
        "check_out_date": created.check_out_date,
        "status": created.status,
        "full_name": user_obj.full_name if user_obj else None,
        "email": user_obj.email if user_obj else None,
        "phone": user_obj.phone if user_obj else None,
        "dob": user_obj.dob if user_obj else None,
        "gender": user_obj.gender if user_obj else None,
        "nationality": getattr(user_obj, "nationality", None) if user_obj else None,
        "occupation": getattr(user_obj, "occupation", None) if user_obj else None,
        "address": user_obj.address if user_obj else None,
        "guardian_name": created.guardian_name,
        "guardian_phone": created.guardian_phone,
        "guardian_relation": created.guardian_relation,
        "monthly_rent": created.monthly_rent,
        "tenant_code": created.tenant_code,
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
            selectinload(TenantProfile.bed).selectinload(bed_crud.model.room)
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
            selectinload(TenantProfile.bed).selectinload(bed_crud.model.room)
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
    if any(getattr(obj_in, field, None) is not None for field in [
        "full_name", "email", "phone", "dob", "gender", "nationality", "occupation", "address"
    ]):
        from app.crud.crud_user import user_crud
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
            
    if obj_in.guardian_name is not None:
        db_obj.guardian_name = obj_in.guardian_name
    if obj_in.guardian_phone is not None:
        db_obj.guardian_phone = obj_in.guardian_phone
    if obj_in.guardian_relation is not None:
        db_obj.guardian_relation = obj_in.guardian_relation
    if obj_in.check_out_date is not None:
        db_obj.check_out_date = obj_in.check_out_date
    if obj_in.monthly_rent is not None:
        db_obj.monthly_rent = obj_in.monthly_rent

    updated_tenant = await tenant_crud.update(db, db_obj=db_obj, obj_in=obj_in, user_id=current_user.id)
    if obj_in.bed_id:
        from app.models.beds import Bed, BedStatus
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


@router.post("/{id}/upload-photo")
async def upload_tenant_photo(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.UPDATE)),
) -> Any:
    """
    Upload a profile photo for a tenant.
    """
    tenant = await tenant_crud.get(db, id=id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    file_path = await storage_provider.save_file(file, "tenants/photos")
    tenant.photo_url = file_path
    
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return {"photo_url": file_path}


@router.post("/{id}/upload-document")
async def upload_tenant_document(
    id: uuid.UUID,
    doc_type: str,  # "aadhaar", "pan", "passport", "license"
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("tenant", PermissionAction.UPDATE)),
) -> Any:
    """
    Upload verification document.
    """
    tenant = await tenant_crud.get(db, id=id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    doc_type = doc_type.lower()
    if doc_type not in ["aadhaar", "pan", "passport", "license"]:
        raise HTTPException(status_code=400, detail="Invalid document type")

    file_path = await storage_provider.save_file(file, f"tenants/documents/{doc_type}")
    
    if doc_type == "aadhaar":
        tenant.aadhaar_number = file_path
    elif doc_type == "pan":
        tenant.pan_number = file_path
    elif doc_type == "passport":
        tenant.passport_number = file_path
    elif doc_type == "license":
        tenant.driving_license = file_path

    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return {"document_path": file_path}


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
    if id != obj_in.tenant_profile_id:
        raise HTTPException(status_code=400, detail="Tenant Profile ID mismatch")

    # Deactivate existing active agreement if any
    active_agreement = await agreement_crud.get_active_agreement(db, tenant_profile_id=id)
    if active_agreement:
        active_agreement.status = AgreementStatus.EXPIRED
        db.add(active_agreement)

    return await agreement_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.post("/agreements/{agreement_id}/upload-pdf")
async def upload_agreement_pdf(
    agreement_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("agreement", PermissionAction.UPDATE)),
) -> Any:
    """
    Upload digital lease agreement PDF document.
    """
    agreement = await agreement_crud.get(db, id=agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
        
    file_path = await storage_provider.save_file(file, "agreements/pdf")
    agreement.agreement_pdf_url = file_path
    
    db.add(agreement)
    await db.commit()
    await db.refresh(agreement)
    return {"pdf_url": file_path}


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
