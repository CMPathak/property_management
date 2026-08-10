import datetime
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api import deps
from app.modules.users.model import User, UserRole
from app.modules.staff.model import StaffAttendance, StaffProfile
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


def get_staff_details_dict(user_obj: User, profile: StaffProfile | None) -> dict:
    emp_id = (profile.employee_code if profile and profile.employee_code and profile.employee_code != "—" else None) or f"EMP-{str(user_obj.id)[:4].upper()}"
    designation = (profile.designation if profile and profile.designation and profile.designation != "—" else None) or (user_obj.role.capitalize() if user_obj.role else "Staff")
    department = (profile.department if profile and profile.department and profile.department != "—" else None) or "Operations"
    shift = (profile.shift.value if profile and profile.shift and str(profile.shift.value) != "—" else None) or "DAY"
    return {
        "employee_id": emp_id,
        "designation": designation,
        "department": department,
        "shift_timing": shift,
    }


def parse_time_str(time_str: str | None) -> datetime.time | None:
    if not time_str or str(time_str).strip() in ["—", "Pending", "", "None", "null"]:
        return None
    s = str(time_str).strip()
    import re
    s = re.sub(r'(AM|PM|am|pm)\s*(AM|PM|am|pm)', r'\1', s, flags=re.IGNORECASE).strip()
    for fmt in ["%I:%M %p", "%I:%M%p", "%I:%M:%S %p", "%H:%M", "%H:%M:%S", "%I:%M", "%H:%M:%S.%f"]:
        try:
            return datetime.datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    try:
        return datetime.time.fromisoformat(s)
    except Exception:
        pass
    return None


def calc_work_and_overtime(in_time: datetime.time | None, out_time: datetime.time | None) -> tuple[float, float]:
    if not in_time or not out_time:
        return (0.0, 0.0)
    in_mins = in_time.hour * 60 + in_time.minute
    out_mins = out_time.hour * 60 + out_time.minute
    diff_mins = out_mins - in_mins
    if diff_mins < 0:
        diff_mins += 24 * 60
    work_hrs = round(diff_mins / 60.0, 2)
    standard_mins = 9 * 60
    over_hrs = round(max(0, diff_mins - standard_mins) / 60.0, 2)
    return (work_hrs, over_hrs)


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
            **get_staff_details_dict(user_obj, att.staff_profile),
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
    
    check_in_time = parse_time_str(obj_in.check_in)
    check_out_time = parse_time_str(obj_in.check_out)

    att_date = datetime.date.today()
    if obj_in.date:
        try:
            att_date = datetime.date.fromisoformat(obj_in.date)
        except ValueError:
            pass
            
    work_hrs, over_hrs = calc_work_and_overtime(check_in_time, check_out_time)

    statement = select(StaffAttendance).where(
        StaffAttendance.staff_profile_id == profile.id,
        StaffAttendance.attendance_date == att_date
    )
    res_exist = await db.execute(statement)
    att = res_exist.scalar_one_or_none()
    if att:
        if check_in_time is not None:
            att.check_in = check_in_time
        if check_out_time is not None:
            att.check_out = check_out_time
        att.working_hours = work_hrs
        att.overtime = over_hrs
        if obj_in.status:
            att.status = obj_in.status
    else:
        att = StaffAttendance(
            staff_profile_id=profile.id,
            attendance_date=att_date,
            check_in=check_in_time,
            check_out=check_out_time,
            working_hours=work_hrs,
            overtime=over_hrs,
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
        **get_staff_details_dict(user_obj, profile),
        "date": att.attendance_date.isoformat() if att.attendance_date else "",
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
        att.check_in = parse_time_str(obj_in.check_in)
    else:
        att.check_in = None
        
    if obj_in.check_out and obj_in.check_out != "—" and obj_in.check_out != "Pending":
        att.check_out = parse_time_str(obj_in.check_out)
    else:
        att.check_out = None
        
    work_hrs, over_hrs = calc_work_and_overtime(att.check_in, att.check_out)
    att.working_hours = work_hrs
    att.overtime = over_hrs
        
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
        **(get_staff_details_dict(user_obj, profile) if user_obj else {"employee_id": "—", "designation": "—", "department": "—", "shift_timing": "—"}),
        "date": att.attendance_date.isoformat() if att.attendance_date else "",
        "check_in": att.check_in.strftime("%I:%M %p") if att.check_in else "—",
        "check_out": att.check_out.strftime("%I:%M %p") if att.check_out else "—",
        "status": att.status.value
    }
