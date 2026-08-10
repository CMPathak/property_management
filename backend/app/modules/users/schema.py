import uuid
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from typing import Any
from app.modules.users.model import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    phone_number: str | None = None
    role: UserRole = UserRole.TENANT
    is_active: bool = True
    email_verified: bool = False
    employee_id: str | None = None
    designation: str | None = None
    department: str | None = None
    shift_timing: str | None = None
    blood_group: str | None = None
    issue_date: date | None = None
    valid_till: date | None = None
    gender: str | None = None
    dob: date | None = None
    address: str | None = None
    employment_type: str | None = None

    @model_validator(mode="before")
    @classmethod
    def map_phone_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            data = dict(data)
            if "phone_number" in data and not data.get("phone"):
                data["phone"] = data["phone_number"]
            elif "phone" in data and not data.get("phone_number"):
                data["phone_number"] = data["phone"]
        return data


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    phone: str | None = None
    phone_number: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    email_verified: bool | None = None
    password: str | None = Field(None, min_length=6)
    employee_id: str | None = None
    designation: str | None = None
    department: str | None = None
    shift_timing: str | None = None
    blood_group: str | None = None
    issue_date: date | None = None
    valid_till: date | None = None
    gender: str | None = None
    dob: date | None = None
    address: str | None = None
    employment_type: str | None = None

    @model_validator(mode="before")
    @classmethod
    def map_phone_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            data = dict(data)
            if "phone_number" in data and not data.get("phone"):
                data["phone"] = data["phone_number"]
            elif "phone" in data and not data.get("phone_number"):
                data["phone_number"] = data["phone"]
        return data


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_extra_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            res = dict(data)
            if "phone" in res and "phone_number" not in res:
                res["phone_number"] = res["phone"]
            return res
        
        ph = getattr(data, "phone", None)
        res = {
            "id": data.id,
            "email": data.email,
            "full_name": data.full_name,
            "phone": ph,
            "phone_number": ph,
            "role": data.role,
            "is_active": data.is_active,
            "email_verified": getattr(data, "email_verified", False),
            "employee_id": getattr(data, "employee_id", None) or f"EMP-{str(data.id)[:4].upper()}",
            "designation": getattr(data, "designation", None) or (data.role.capitalize() if data.role else "Staff"),
            "department": getattr(data, "department", None) or "Operations",
            "shift_timing": getattr(data, "shift_timing", None) or "DAY",
            "gender": getattr(data, "gender", None),
            "dob": getattr(data, "dob", None),
            "address": getattr(data, "address", None),
            "employment_type": getattr(data, "employment_type", None),
            "created_at": getattr(data, "created_at", None),
            "updated_at": getattr(data, "updated_at", None),
            "created_by": getattr(data, "created_by", None),
            "updated_by": getattr(data, "updated_by", None),
            "blood_group": getattr(data, "blood_group", None),
            "issue_date": getattr(data, "issue_date", None),
            "valid_till": getattr(data, "valid_till", None),
        }
        
        try:
            from sqlalchemy import inspect as sa_inspect
            state = sa_inspect(data)
            if "staff_profile" not in state.unloaded and data.staff_profile:
                sp = data.staff_profile
                if sp.employee_code:
                    res["employee_id"] = sp.employee_code
                if sp.designation:
                    res["designation"] = sp.designation
                if sp.department:
                    res["department"] = sp.department
                if sp.shift:
                    res["shift_timing"] = sp.shift.value
                if getattr(sp, "blood_group", None):
                    res["blood_group"] = sp.blood_group
                if getattr(sp, "issue_date", None):
                    res["issue_date"] = sp.issue_date
                if getattr(sp, "valid_till", None):
                    res["valid_till"] = sp.valid_till
                if getattr(sp, "address", None):
                    res["address"] = sp.address
                if getattr(sp, "gender", None):
                    res["gender"] = sp.gender
                if getattr(sp, "dob", None):
                    res["dob"] = sp.dob
                if getattr(sp, "employment_type", None):
                    res["employment_type"] = sp.employment_type
        except Exception:
            pass

        return res


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None
    exp: int | None = None


class LoginHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    ip_address: str | None
    user_agent: str | None
    device_info: str | None
    login_at: datetime
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
