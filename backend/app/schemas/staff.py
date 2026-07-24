import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.staff import ShiftType, StaffStatus, AttendanceStatus, SalaryStatus


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
class StaffSalaryBase(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)
    base_amount: float = Field(..., gt=0)
    bonus: float = Field(0.0, ge=0)
    deductions: float = Field(0.0, ge=0)
    net_paid: float = Field(..., ge=0)
    payment_date: datetime.date | None = None
    status: SalaryStatus = SalaryStatus.PENDING


class StaffSalaryCreate(StaffSalaryBase):
    staff_profile_id: uuid.UUID


class StaffSalaryUpdate(BaseModel):
    month: int | None = Field(None, ge=1, le=12)
    year: int | None = Field(None, ge=2020)
    base_amount: float | None = Field(None, gt=0)
    bonus: float | None = Field(None, ge=0)
    deductions: float | None = Field(None, ge=0)
    net_paid: float | None = Field(None, ge=0)
    payment_date: datetime.date | None = None
    status: SalaryStatus | None = None


class StaffSalaryResponse(StaffSalaryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    staff_profile_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


# --- StaffProfile ---
class StaffProfileBase(BaseModel):
    salary: float = Field(0.0, ge=0)
    shift: ShiftType = ShiftType.MORNING
    documents: list[str] | None = None
    status: StaffStatus = StaffStatus.ACTIVE


class StaffProfileCreate(StaffProfileBase):
    user_id: uuid.UUID


class StaffProfileUpdate(BaseModel):
    salary: float | None = Field(None, ge=0)
    shift: ShiftType | None = None
    documents: list[str] | None = None
    status: StaffStatus | None = None


class StaffProfileResponse(StaffProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
