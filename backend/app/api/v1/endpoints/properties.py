import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.crud.crud_properties import property_crud
from app.crud.crud_user import user_crud
from app.models.users import User, UserRole
from app.permissions.rbac import PermissionChecker, PermissionAction
from app.schemas.properties import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
)
from app.utils.storage import storage_provider

from sqlalchemy.orm import selectinload
from app.models.properties import Property

router = APIRouter()


@router.post("/", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: PropertyCreate,
    current_user: User = Depends(PermissionChecker("property", PermissionAction.CREATE)),
) -> Any:
    """
    Create a new property.
    """
    existing = await property_crud.get_by_name(db, name=obj_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A property with this name already exists."
        )
    return await property_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.get("/", response_model=list[PropertyResponse])
async def list_properties(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    current_user: User = Depends(PermissionChecker("property", PermissionAction.READ)),
) -> Any:
    """
    List properties (paginated).
    """
    if search:
        statement = (
            select(property_crud.model)
            .options(
                selectinload(Property.managers),
                selectinload(Property.floors)
            )
            .where(
                and_(
                    property_crud.model.name.ilike(f"%{search}%"),
                    property_crud.model.deleted_at.is_(None)
                )
            )
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    return await property_crud.get_multi(db, skip=skip, limit=limit)


@router.get("/{id}", response_model=PropertyResponse)
async def get_property(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("property", PermissionAction.READ)),
) -> Any:
    """
    Get a property by ID.
    """
    property_obj = await property_crud.get(db, id=id)
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    return property_obj


@router.put("/{id}", response_model=PropertyResponse)
async def update_property(
    id: uuid.UUID,
    obj_in: PropertyUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("property", PermissionAction.UPDATE)),
) -> Any:
    """
    Update a property.
    """
    db_obj = await property_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # If manager_ids is provided, update managers association
    if obj_in.manager_ids is not None:
        managers = []
        for manager_id in obj_in.manager_ids:
            mgr = await user_crud.get(db, id=manager_id)
            if not mgr or mgr.role not in [UserRole.MANAGER, UserRole.STAFF, UserRole.OWNER, UserRole.SUPER_ADMIN]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User ID {manager_id} is not a valid Manager or Staff"
                )
            managers.append(mgr)
        db_obj.managers = managers

    await property_crud.update(db, db_obj=db_obj, obj_in=obj_in, user_id=current_user.id)
    return await property_crud.get(db, id=id)


@router.delete("/{id}", response_model=PropertyResponse)
async def delete_property(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("property", PermissionAction.DELETE)),
) -> Any:
    """
    Soft delete a property.
    """
    db_obj = await property_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    return await property_crud.remove(db, id=id, user_id=current_user.id)


@router.post("/{id}/upload-image")
async def upload_property_image(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("property", PermissionAction.UPDATE)),
) -> Any:
    """
    Upload an image for a property.
    """
    property_obj = await property_crud.get(db, id=id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
        
    file_path = await storage_provider.save_file(file, "properties/images")
    
    images = property_obj.images or []
    images.append(file_path)
    property_obj.images = images
    
    db.add(property_obj)
    await db.commit()
    await db.refresh(property_obj)
    return {"image_path": file_path, "images": property_obj.images}


@router.post("/{id}/upload-document")
async def upload_property_document(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(PermissionChecker("property", PermissionAction.UPDATE)),
) -> Any:
    """
    Upload a document for a property.
    """
    property_obj = await property_crud.get(db, id=id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
        
    file_path = await storage_provider.save_file(file, "properties/documents")
    
    # Append path to documents list
    documents = property_obj.documents or []
    documents.append(file_path)
    property_obj.documents = documents
    
    db.add(property_obj)
    await db.commit()
    await db.refresh(property_obj)
    return {"document_path": file_path, "documents": property_obj.documents}
