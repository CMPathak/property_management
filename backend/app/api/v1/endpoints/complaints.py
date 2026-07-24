import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.api import deps
from app.crud.crud_complaint import complaint_crud
from app.crud.crud_tenant import tenant_crud
from app.crud.crud_user import user_crud
from app.models.users import User, UserRole
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse,
    ComplaintUpdate,
)
from app.models.complaint import ComplaintStatus
from app.utils.storage import storage_provider

from sqlalchemy.orm import selectinload
from app.models.complaint import Complaint
from app.models.tenant import TenantProfile
from app.models.properties import Property, property_managers

router = APIRouter()


async def format_complaint_response(db: AsyncSession, complaint_id: uuid.UUID) -> ComplaintResponse | None:
    statement = (
        select(Complaint)
        .options(
            selectinload(Complaint.tenant_profile).selectinload(TenantProfile.user),
            selectinload(Complaint.property),
            selectinload(Complaint.timelines)
        )
        .where(Complaint.id == complaint_id)
    )
    result = await db.execute(statement)
    complaint = result.scalar_one_or_none()
    if not complaint:
        return None

    resp = ComplaintResponse.model_validate(complaint)
    if complaint.tenant_profile and complaint.tenant_profile.user:
        resp.tenant_name = complaint.tenant_profile.user.full_name or complaint.tenant_profile.user.email
    elif complaint.created_by:
        creator = await user_crud.get(db, id=complaint.created_by)
        if creator:
            resp.tenant_name = creator.full_name or creator.email
    if complaint.property:
        resp.property_name = complaint.property.name
    return resp


@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: ComplaintCreate,
    current_user: User = Depends(PermissionChecker("complaint", PermissionAction.CREATE)),
) -> Any:
    """
    File a new complaint ticket.
    """
    # 1. Resolve tenant_profile_id
    if obj_in.tenant_profile_id:
        tenant = await tenant_crud.get(db, id=obj_in.tenant_profile_id)
        if not tenant:
            tenant = await tenant_crud.get_by_user_id(db, user_id=obj_in.tenant_profile_id)
            if tenant:
                obj_in.tenant_profile_id = tenant.id
            else:
                obj_in.tenant_profile_id = None

    if not obj_in.tenant_profile_id:
        tenant = await tenant_crud.get_by_user_id(db, user_id=current_user.id)
        if not tenant:
            # Auto-create TenantProfile for user if missing
            tenant = TenantProfile(
                user_id=current_user.id,
                status="ACTIVE",
                created_by=current_user.id
            )
            db.add(tenant)
            await db.commit()
            await db.refresh(tenant)
        obj_in.tenant_profile_id = tenant.id

    # 2. Resolve property_id
    if not obj_in.property_id:
        tenant = await tenant_crud.get(db, id=obj_in.tenant_profile_id)
        if tenant and tenant.bed_id:
            from app.models.beds import Bed
            from app.models.rooms import Room
            from app.models.floors import Floor
            stmt = (
                select(Floor.property_id)
                .join(Room, Room.floor_id == Floor.id)
                .join(Bed, Bed.room_id == Room.id)
                .where(Bed.id == tenant.bed_id)
            )
            prop_id = (await db.execute(stmt)).scalar_one_or_none()
            if prop_id:
                obj_in.property_id = prop_id

        if not obj_in.property_id:
            stmt = select(Property.id).where(Property.deleted_at.is_(None)).limit(1)
            prop_id = (await db.execute(stmt)).scalar_one_or_none()
            if prop_id:
                obj_in.property_id = prop_id

    created = await complaint_crud.create(db, obj_in=obj_in, user_id=current_user.id)
    response_data = await format_complaint_response(db, created.id)
    return response_data or created


@router.get("/", response_model=list[ComplaintResponse])
async def list_complaints(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    property_id: uuid.UUID | None = None,
    tenant_id: uuid.UUID | None = None,
    status_filter: ComplaintStatus | None = None,
    current_user: User = Depends(PermissionChecker("complaint", PermissionAction.READ)),
) -> Any:
    """
    List complaints with optional filters.
    """
    conditions = [complaint_crud.model.deleted_at.is_(None)]

    if property_id:
        conditions.append(complaint_crud.model.property_id == property_id)
    if tenant_id:
        conditions.append(complaint_crud.model.tenant_profile_id == tenant_id)
    if status_filter:
        conditions.append(complaint_crud.model.status == status_filter)

    # 1. TENANT Role: Only see own complaints
    if current_user.role == UserRole.TENANT:
        tenant = await tenant_crud.get_by_user_id(db, user_id=current_user.id)
        if tenant:
            conditions.append(
                or_(
                    complaint_crud.model.tenant_profile_id == tenant.id,
                    complaint_crud.model.created_by == current_user.id
                )
            )
        else:
            conditions.append(complaint_crud.model.created_by == current_user.id)

    # 2. MANAGER Role: Only see complaints assigned to manager or for managed properties
    elif current_user.role in [UserRole.MANAGER, UserRole.STAFF]:
        stmt = select(property_managers.c.property_id).where(property_managers.c.user_id == current_user.id)
        managed_res = await db.execute(stmt)
        managed_prop_ids = list(managed_res.scalars().all())

        mgr_conditions = [
            complaint_crud.model.assigned_staff_id == current_user.id,
            complaint_crud.model.created_by == current_user.id
        ]
        if managed_prop_ids:
            mgr_conditions.append(complaint_crud.model.property_id.in_(managed_prop_ids))

        conditions.append(or_(*mgr_conditions))

    # 3. OWNER / SUPER_ADMIN Role: No restriction -> sees ALL complaints

    statement = (
        select(complaint_crud.model)
        .options(
            selectinload(Complaint.tenant_profile).selectinload(TenantProfile.user),
            selectinload(Complaint.property),
            selectinload(Complaint.timelines)
        )
        .where(and_(*conditions))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(statement)
    complaints = result.scalars().all()

    response_list = []
    for c in complaints:
        resp = ComplaintResponse.model_validate(c)
        if c.tenant_profile and c.tenant_profile.user:
            resp.tenant_name = c.tenant_profile.user.full_name or c.tenant_profile.user.email
        elif c.created_by:
            creator = await user_crud.get(db, id=c.created_by)
            if creator:
                resp.tenant_name = creator.full_name or creator.email
        if c.property:
            resp.property_name = c.property.name
        response_list.append(resp)
    return response_list


@router.get("/{id}", response_model=ComplaintResponse)
async def get_complaint(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("complaint", PermissionAction.READ)),
) -> Any:
    """
    Get detailed complaint history and timeline logs.
    """
    complaint = await format_complaint_response(db, id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.put("/{id}", response_model=ComplaintResponse)
async def update_complaint(
    id: uuid.UUID,
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: ComplaintUpdate,
    current_user: User = Depends(PermissionChecker("complaint", PermissionAction.UPDATE)),
) -> Any:
    """
    Update complaint fields.
    """
    complaint = await complaint_crud.get(db, id=id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = await complaint_crud.update(db, db_obj=complaint, obj_in=obj_in, user_id=current_user.id)
    response_data = await format_complaint_response(db, updated.id)
    return response_data or updated


@router.post("/{id}/status", response_model=ComplaintResponse)
async def update_complaint_status(
    id: uuid.UUID,
    new_status: ComplaintStatus,
    remarks: str | None = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("complaint", PermissionAction.UPDATE)),
) -> Any:
    """
    Update complaint status and record audit timeline.
    """
    updated = await complaint_crud.update_status(
        db, complaint_id=id, new_status=new_status, user_id=current_user.id, remarks=remarks
    )
    response_data = await format_complaint_response(db, updated.id)
    return response_data or updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_complaint(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("complaint", PermissionAction.DELETE)),
) -> None:
    """
    Soft delete complaint ticket.
    """
    complaint = await complaint_crud.get(db, id=id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    await complaint_crud.remove(db, id=id, user_id=current_user.id)
    return None
