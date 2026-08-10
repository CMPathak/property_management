import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.modules.staff.model import ShiftType, StaffStatus, AttendanceStatus, SalaryStatus


# --- StaffAttendance ---
class StaffAttendanceBase(BaseModel):
    date: datetime.date
    check_in: datetime.time | None = None
    check_out: datetime.time | None = None
    status: AttendanceStatus = AttendanceStatus.PRESENT


class StaffAttendanceCreate(StaffAttendanceBase):
    staff_profile_id: uuid.UUID


class StaffAttendanceUpdate(BaseModel):
    date: datetime.date | None = None
    check_in: datetime.time | None = None
    check_out: datetime.time | None = None
    status: AttendanceStatus | None = None


class StaffAttendanceResponse(StaffAttendanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    staff_profile_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


# --- StaffSalary ---
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)
    basic_salary: float = Field(..., gt=0)
    allowances: float = Field(0.0, ge=0)
    deductions: float = Field(0.0, ge=0)
    total_salary: float = Field(..., ge=0)
    payment_date: datetime.date | None = None


class StaffSalaryCreate(StaffSalaryBase):
    staff_profile_id: uuid.UUID


    month: int | None = Field(None, ge=1, le=12)
    year: int | None = Field(None, ge=2020)
    basic_salary: float | None = Field(None, gt=0)
    allowances: float | None = Field(None, ge=0)
    deductions: float | None = Field(None, ge=0)
    total_salary: float | None = Field(None, ge=0)
    payment_date: datetime.date | None = None


class StaffSalaryResponse(StaffSalaryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    staff_profile_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


# --- StaffProfile ---
    salary: float = Field(0.0, ge=0)
    shift: ShiftType = ShiftType.MORNING
    status: StaffStatus = StaffStatus.ACTIVE
    blood_group: str | None = None
    id_card_number: str | None = None
    issue_date: datetime.date | None = None
    valid_till: datetime.date | None = None


class StaffProfileCreate(StaffProfileBase):
    user_id: uuid.UUID


    salary: float | None = Field(None, ge=0)
    shift: ShiftType | None = None
    status: StaffStatus | None = None
    blood_group: str | None = None
    id_card_number: str | None = None
    issue_date: datetime.date | None = None
    valid_till: datetime.date | None = None


class StaffProfileResponse(StaffProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
