import uuid
import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.modules.users.repository import user_crud
from app.modules.users.model import User, UserRole
from app.modules.staff.model import StaffProfile
from app.permissions.rbac import require_role
from app.modules.users.schema import UserCreate, UserUpdate, UserResponse
from app.utils.storage import storage_provider
from app.utils.id_card_generator import generate_staff_id_card_pdf

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    role: UserRole | None = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List users, optionally filtering by role.
    """
    # Only OWNER and SUPER_ADMIN can query users generally
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view users roster."
        )

    statement = select(User).where(User.deleted_at.is_(None))
    if role:
        statement = statement.where(User.role == role)
    
    statement = statement.offset(skip).limit(limit)
    result = await db.execute(statement)
    return list(result.scalars().all())


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: UserCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OWNER])),
) -> Any:
    """
    Create a new user/staff member.
    """
    existing_user = await user_crud.get_by_email(db, email=obj_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    return await user_crud.create(db, obj_in=obj_in, user_id=current_user.id)


@router.put("/{id}", response_model=UserResponse)
async def update_user(
    id: uuid.UUID,
    obj_in: UserUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a user's details.
    """
    # Users can update themselves, or OWNER/SUPER_ADMIN can update anyone
    if current_user.id != id and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this user."
        )

    # Restrict role assignment/modification to SUPER_ADMIN or OWNER only
    if obj_in.role is not None and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role assignment is restricted to Super Admin or Owner only."
        )

    db_obj = await user_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="User not found")
    return await user_crud.update(db, db_obj=db_obj, obj_in=obj_in, user_id=current_user.id)


@router.delete("/{id}", response_model=UserResponse)
async def delete_user(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OWNER])),
) -> Any:
    """
    Soft delete a user.
    """
    db_obj = await user_crud.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="User not found")
    return await user_crud.remove(db, id=id, user_id=current_user.id)


@router.get("/{id}/id-card")
async def get_user_id_card(
    id: uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Response:
    """
    Generate and return PDF ID card for a user/staff member.
    """
    user_obj = await user_crud.get(db, id=id)
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
        
    stmt = select(StaffProfile).where(StaffProfile.user_id == id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    
    id_card_number = profile.id_card_number if profile and profile.id_card_number else f"IDC-{str(user_obj.id)[:6].upper()}"
    issue_date = profile.id_card_issued_on.strftime("%d %b %Y") if profile and profile.id_card_issued_on else datetime.date.today().strftime("%d %b %Y")
    valid_till = (datetime.date.today() + datetime.timedelta(days=365)).strftime("%d %b %Y")
    
    dept = profile.department if profile and profile.department else "General"
    desig = profile.designation if profile and profile.designation else "Staff Member"
    emp_code = profile.employee_code if profile and profile.employee_code else str(user_obj.id)[:8].upper()
    blood = profile.blood_group if profile and profile.blood_group else "O+"
    
    staff_info = {
        "full_name": user_obj.full_name or user_obj.email.split("@")[0],
        "employee_id": emp_code,
        "designation": desig,
        "department": dept,
        "property": "Accoumaxx Portal",
        "phone_number": user_obj.phone or "—",
        "blood_group": blood,
        "photo_url": user_obj.profile_image,
        "id_card_number": id_card_number,
        "issue_date": issue_date,
        "valid_till": valid_till,
        "verification_url": f"https://accoumaxx.com/verify/{user_obj.id}"
    }
    
    pdf_bytes = generate_staff_id_card_pdf(staff_info)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=staff_id_card_{emp_code}.pdf"}
    )


@router.post("/{id}/upload-photo")
async def upload_user_photo(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Upload a profile photo for a user.
    """
    user_obj = await user_crud.get(db, id=id)
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
        
    file_path = await storage_provider.save_file(file, "users/photos")
    user_obj.profile_image = file_path
    
    db.add(user_obj)
    await db.commit()
    await db.refresh(user_obj)
    return {"photo_url": file_path}

