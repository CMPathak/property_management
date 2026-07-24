import uuid
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.tenant import TenantStatus, AgreementStatus


# --- TenantProfile ---
class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: str


class TenantProfileBase(BaseModel):
    photo_url: str | None = None
    aadhaar_number: str | None = None
    pan_number: str | None = None
    passport_number: str | None = None
    driving_license: str | None = None
    emergency_contact: EmergencyContact | None = None
    security_deposit: float = Field(0.0, ge=0)
    check_in_date: date | None = None
    check_out_date: date | None = None
    status: TenantStatus = TenantStatus.INACTIVE


class TenantProfileCreate(TenantProfileBase):
    user_id: uuid.UUID
    bed_id: uuid.UUID | None = None


class TenantProfileUpdate(BaseModel):
    photo_url: str | None = None
    aadhaar_number: str | None = None
    pan_number: str | None = None
    passport_number: str | None = None
    driving_license: str | None = None
    emergency_contact: EmergencyContact | None = None
    security_deposit: float | None = Field(None, ge=0)
    check_in_date: date | None = None
    check_out_date: date | None = None
    status: TenantStatus | None = None
    bed_id: uuid.UUID | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None


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
            "photo_url": data.photo_url,
            "aadhaar_number": data.aadhaar_number,
            "pan_number": data.pan_number,
            "passport_number": data.passport_number,
            "driving_license": data.driving_license,
            "emergency_contact": data.emergency_contact,
            "security_deposit": data.security_deposit,
            "check_in_date": data.check_in_date,
            "check_out_date": data.check_out_date,
            "status": data.status,
        }
        
        try:
            from sqlalchemy import inspect as sa_inspect
            state = sa_inspect(data)
            if "user" not in state.unloaded:
                user = data.user
                if user:
                    res["full_name"] = getattr(user, "full_name", None)
                    res["email"] = getattr(user, "email", None)
                    res["phone"] = getattr(user, "phone_number", None)

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
        except Exception:
            pass

        return res


# --- Agreement ---
class AgreementBase(BaseModel):
    start_date: date
    end_date: date
    rent_amount: float = Field(..., gt=0)
    security_deposit: float = Field(0.0, ge=0)
    agreement_pdf_url: str | None = None
    status: AgreementStatus = AgreementStatus.ACTIVE


class AgreementCreate(AgreementBase):
    tenant_profile_id: uuid.UUID
    bed_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None


class AgreementUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    rent_amount: float | None = Field(None, gt=0)
    security_deposit: float | None = Field(None, ge=0)
    agreement_pdf_url: str | None = None
    status: AgreementStatus | None = None
    bed_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None


class AgreementResponse(AgreementBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_profile_id: uuid.UUID
    bed_id: uuid.UUID | None
    room_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
