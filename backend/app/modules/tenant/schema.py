import uuid
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.modules.tenant.model import TenantStatus, AgreementStatus


# --- TenantProfile ---
class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: str


class TenantProfileBase(BaseModel):
    security_deposit: float = Field(0.0, ge=0)
    admission_date: date | None = None
    status: TenantStatus = TenantStatus.INACTIVE


class TenantProfileCreate(TenantProfileBase):
    user_id: uuid.UUID
    bed_id: uuid.UUID | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_relation: str | None = None
    monthly_rent: float | None = None


class TenantProfileUpdate(BaseModel):
    security_deposit: float | None = Field(None, ge=0)
    admission_date: date | None = None
    status: TenantStatus | None = None
    bed_id: uuid.UUID | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_relation: str | None = None
    dob: date | None = None
    gender: str | None = None
    nationality: str | None = None
    occupation: str | None = None
    address: str | None = None
    check_out_date: date | None = None
    monthly_rent: float | None = None


class TenantProfileResponse(TenantProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    bed_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None

    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    room_bed: str | None = None
    agreements: list["AgreementResponse"] | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_relation: str | None = None
    dob: date | None = None
    gender: str | None = None
    nationality: str | None = None
    occupation: str | None = None
    address: str | None = None
    check_out_date: date | None = None
    tenant_code: str | None = None
    monthly_rent: float | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_user_and_bed_details(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        
        # Build dictionary from model fields
        res = {
            "id": data.id,
            "user_id": data.user_id,
            "bed_id": data.bed_id,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
            "created_by": getattr(data, "created_by", None),
            "updated_by": getattr(data, "updated_by", None),
            "security_deposit": data.security_deposit,
            "admission_date": getattr(data, "admission_date", None),
            "status": data.status,
            "guardian_name": getattr(data, "guardian_name", None),
            "guardian_phone": getattr(data, "guardian_phone", None),
            "guardian_relation": getattr(data, "guardian_relation", None),
            "check_out_date": getattr(data, "check_out_date", None),
            "tenant_code": getattr(data, "tenant_code", None),
            "monthly_rent": getattr(data, "monthly_rent", None),
        }
        
        try:
            from sqlalchemy import inspect as sa_inspect
            state = sa_inspect(data)
            if "user" not in state.unloaded:
                user = data.user
                if user:
                    res["full_name"] = getattr(user, "full_name", None)
                    res["email"] = getattr(user, "email", None)
                    res["phone"] = getattr(user, "phone", None)
                    res["dob"] = getattr(user, "dob", None)
                    res["gender"] = getattr(user, "gender", None)
                    res["nationality"] = getattr(user, "nationality", None)
                    res["occupation"] = getattr(user, "occupation", None)
                    res["address"] = getattr(user, "address", None)

            if "bed" not in state.unloaded:
                bed = data.bed
                if bed:
                    room_num = "Unknown"
                    bed_state = sa_inspect(bed)
                    if "room" not in bed_state.unloaded:
                        room = bed.room
                        if room:
                            room_num = getattr(room, "room_number", "Unknown")
                    res["room_bed"] = f"Room {room_num} - Bed {getattr(bed, 'bed_number', '')}"

            if "agreements" not in state.unloaded:
                res["agreements"] = data.agreements
        except Exception:
            pass

        return res


# --- Agreement ---
class AgreementBase(BaseModel):
    agreement_no: str | None = None
    start_date: date
    end_date: date | None = None
    rent_amount: float = Field(..., gt=0)
    deposit_amount: float = Field(0.0, ge=0)
    status: AgreementStatus = AgreementStatus.ACTIVE

    @model_validator(mode="before")
    @classmethod
    def map_incoming_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            data = dict(data)
            if "security_deposit" in data and "deposit_amount" not in data:
                data["deposit_amount"] = data.pop("security_deposit")
            if "tenant_profile_id" in data and "tenant_id" not in data:
                data["tenant_id"] = data.pop("tenant_profile_id")
        return data


class AgreementCreate(AgreementBase):
    tenant_id: uuid.UUID


class AgreementUpdate(BaseModel):
    agreement_no: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    rent_amount: float | None = Field(None, gt=0)
    deposit_amount: float | None = Field(None, ge=0)
    status: AgreementStatus | None = None


class AgreementResponse(AgreementBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    security_deposit: float = Field(0.0, ge=0)

    @model_validator(mode="before")
    @classmethod
    def populate_security_deposit(cls, data: Any) -> Any:
        if isinstance(data, dict):
            res = dict(data)
            if "deposit_amount" in res and "security_deposit" not in res:
                res["security_deposit"] = res["deposit_amount"]
            return res
        
        return {
            "id": getattr(data, "id", None),
            "tenant_id": getattr(data, "tenant_id", None),
            "agreement_no": getattr(data, "agreement_no", None),
            "start_date": getattr(data, "start_date", None),
            "end_date": getattr(data, "end_date", None),
            "rent_amount": float(getattr(data, "rent_amount", 0.0) or 0.0),
            "deposit_amount": float(getattr(data, "deposit_amount", 0.0) or 0.0),
            "security_deposit": float(getattr(data, "deposit_amount", 0.0) or 0.0),
            "status": getattr(data, "status", AgreementStatus.ACTIVE),
            "created_at": getattr(data, "created_at", None),
            "updated_at": getattr(data, "updated_at", None),
            "created_by": getattr(data, "created_by", None),
            "updated_by": getattr(data, "updated_by", None),
        }


TenantProfileResponse.model_rebuild()

