import datetime
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api import deps
from app.models.users import User, UserRole
from app.models.staff import StaffAttendance, StaffProfile
from pydantic import BaseModel

router = APIRouter()

class AttendanceMarkRequest(BaseModel):
    staff_name: str | None = None
    staff_id: str | None = None  # user_id
    date: str | None = None
    check_in: str | None = None
    check_out: str | None = None
    status: str = "PRESENT"


async def get_or_create_staff_profile(db: AsyncSession, user_id: uuid.UUID) -> StaffProfile:
    statement = select(StaffProfile).where(StaffProfile.user_id == user_id)
    result = await db.execute(statement)
    profile = result.scalar_one_or_none()
    if not profile:
        profile = StaffProfile(user_id=user_id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


@router.get("/")
async def list_attendance(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List staff attendance records.
    Admin roles see everyone, standard users see only their own.
    """
    is_full_access = current_user.role in [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]
    
    statement = (
        select(StaffAttendance)
        .join(StaffProfile, StaffAttendance.staff_profile_id == StaffProfile.id)
        .join(User, StaffProfile.user_id == User.id)
        .options(
            joinedload(StaffAttendance.staff_profile).joinedload(StaffProfile.user)
        )
    )
    
    if not is_full_access:
        statement = statement.where(User.id == current_user.id)
        
    result = await db.execute(statement)
    attendances = result.scalars().all()
    
    formatted_records = []
    for att in attendances:
        user_obj = att.staff_profile.user if att.staff_profile else None
        if not user_obj:
            continue
            
        formatted_records.append({
            "id": str(att.id),
            "staff_name": user_obj.full_name or user_obj.email.split("@")[0],
            "role": user_obj.role,
            "employee_id": user_obj.employee_id or "—",
            "designation": user_obj.designation or "—",
            "department": user_obj.department or "—",
            "shift_timing": user_obj.shift_timing or "—",
            "date": att.date.isoformat() if att.date else "",
            "check_in": att.check_in.strftime("%I:%M %p") if att.check_in else "—",
            "check_out": att.check_out.strftime("%I:%M %p") if att.check_out else "—",
            "status": att.status.value if att.status else "PRESENT"
        })
        
    return formatted_records


@router.post("/", status_code=status.HTTP_201_CREATED)
async def mark_attendance(
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: AttendanceMarkRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Clock-in / Punch attendance record.
    """
    is_full_access = current_user.role in [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]
    target_user_id = current_user.id
    
    if is_full_access and obj_in.staff_id:
        try:
            target_user_id = uuid.UUID(obj_in.staff_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid staff_id UUID format.")
            
    profile = await get_or_create_staff_profile(db, target_user_id)
    
    check_in_time = None
    if obj_in.check_in and obj_in.check_in != "—" and obj_in.check_in != "Pending":
        try:
            check_in_time = datetime.datetime.strptime(obj_in.check_in, "%I:%M %p").time()
        except ValueError:
            try:
                check_in_time = datetime.time.fromisoformat(obj_in.check_in)
            except ValueError:
                pass
                
    check_out_time = None
    if obj_in.check_out and obj_in.check_out != "—" and obj_in.check_out != "Pending":
        try:
            check_out_time = datetime.datetime.strptime(obj_in.check_out, "%I:%M %p").time()
        except ValueError:
            try:
                check_out_time = datetime.time.fromisoformat(obj_in.check_out)
            except ValueError:
                pass

    att_date = datetime.date.today()
    if obj_in.date:
        try:
            att_date = datetime.date.fromisoformat(obj_in.date)
        except ValueError:
            pass
            
    att = StaffAttendance(
        staff_profile_id=profile.id,
        date=att_date,
        check_in=check_in_time,
        check_out=check_out_time,
        status=obj_in.status
    )
    
    db.add(att)
    await db.commit()
    await db.refresh(att)
    
    user_obj = await db.get(User, target_user_id)
    return {
        "id": str(att.id),
        "staff_name": user_obj.full_name or user_obj.email.split("@")[0],
        "role": user_obj.role,
        "employee_id": user_obj.employee_id or "—",
        "designation": user_obj.designation or "—",
        "department": user_obj.department or "—",
        "shift_timing": user_obj.shift_timing or "—",
        "date": att.date.isoformat(),
        "check_in": att.check_in.strftime("%I:%M %p") if att.check_in else "—",
        "check_out": att.check_out.strftime("%I:%M %p") if att.check_out else "—",
        "status": att.status.value
    }


@router.put("/{attendance_id}")
async def update_attendance(
    attendance_id: uuid.UUID,
    *,
    db: AsyncSession = Depends(deps.get_db),
    obj_in: AttendanceMarkRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Edit attendance details (restricted to admin roles).
    """
    statement = select(StaffAttendance).where(StaffAttendance.id == attendance_id)
    result = await db.execute(statement)
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found.")
        
    is_full_access = current_user.role in [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]
    if not is_full_access:
        raise HTTPException(status_code=403, detail="Not authorized to update attendance.")
        
    if obj_in.check_in and obj_in.check_in != "—" and obj_in.check_in != "Pending":
        try:
            att.check_in = datetime.datetime.strptime(obj_in.check_in, "%I:%M %p").time()
        except ValueError:
            try:
                att.check_in = datetime.time.fromisoformat(obj_in.check_in)
            except ValueError:
                pass
    else:
        att.check_in = None
        
    if obj_in.check_out and obj_in.check_out != "—" and obj_in.check_out != "Pending":
        try:
            att.check_out = datetime.datetime.strptime(obj_in.check_out, "%I:%M %p").time()
        except ValueError:
            try:
                att.check_out = datetime.time.fromisoformat(obj_in.check_out)
            except ValueError:
                pass
    else:
        att.check_out = None
        
    if obj_in.status:
        att.status = obj_in.status
        
    db.add(att)
    await db.commit()
    await db.refresh(att)
    
    profile_statement = select(StaffProfile).where(StaffProfile.id == att.staff_profile_id)
    profile_res = await db.execute(profile_statement)
    profile = profile_res.scalar_one_or_none()
    user_obj = None
    if profile:
        user_obj = await db.get(User, profile.user_id)
        
    name = user_obj.full_name or user_obj.email.split("@")[0] if user_obj else "—"
    role = user_obj.role if user_obj else "STAFF"
    
    return {
        "id": str(att.id),
        "staff_name": name,
        "role": role,
        "employee_id": user_obj.employee_id or "—" if user_obj else "—",
        "designation": user_obj.designation or "—" if user_obj else "—",
        "department": user_obj.department or "—" if user_obj else "—",
        "shift_timing": user_obj.shift_timing or "—" if user_obj else "—",
        "date": att.date.isoformat(),
        "check_in": att.check_in.strftime("%I:%M %p") if att.check_in else "—",
        "check_out": att.check_out.strftime("%I:%M %p") if att.check_out else "—",
        "status": att.status.value
    }
