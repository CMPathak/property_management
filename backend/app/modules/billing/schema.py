import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from app.modules.billing.model import (
    InvoiceStatus,
    PaymentMode,
    PaymentStatus,
    ReminderType,
    ReminderStatus,
)


# --- Payment ---
class PaymentBase(BaseModel):
    amount: float = Field(..., gt=0)
    payment_mode: PaymentMode
    transaction_id: str | None = None
    payment_proof: str | None = None
    remarks: str | None = None


class PaymentCreate(PaymentBase):
    invoice_id: uuid.UUID
    status: PaymentStatus = PaymentStatus.PENDING_VERIFICATION


class PaymentResponse(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    payment_date: datetime
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


# --- RentReminder ---
class RentReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    reminder_type: ReminderType
    scheduled_date: date
    status: ReminderStatus
import uuid
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.modules.billing.model import (
    InvoiceStatus,
    PaymentMode,
    PaymentStatus,
    ReminderType,
    ReminderStatus,
)


# --- Payment ---
class PaymentBase(BaseModel):
    amount: float = Field(..., gt=0)
    payment_mode: PaymentMode
    transaction_id: str | None = None
    payment_proof: str | None = None
    remarks: str | None = None


class PaymentCreate(PaymentBase):
    invoice_id: uuid.UUID
    status: PaymentStatus = PaymentStatus.PENDING_VERIFICATION


class PaymentResponse(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    tenant_id: uuid.UUID | None = None
    payment_date: datetime
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    tenant_name: str | None = None
    room_number: str | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_tenant_details(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        
        res = {
            "id": data.id,
            "invoice_id": data.invoice_id,
            "tenant_id": getattr(data, "tenant_id", None),
            "amount": float(data.amount or 0.0),
            "payment_mode": data.payment_mode,
            "transaction_id": data.transaction_id,
            "payment_proof": data.payment_proof,
            "remarks": data.remarks,
            "payment_date": data.payment_date,
            "status": data.status,
            "created_at": getattr(data, "created_at", None),
            "updated_at": getattr(data, "updated_at", None),
            "created_by": getattr(data, "created_by", None),
            "updated_by": getattr(data, "updated_by", None),
            "tenant_name": "Tenant",
            "room_number": "N/A",
        }
        try:
            from sqlalchemy import inspect as sa_inspect
            state = sa_inspect(data)
            if "tenant" not in state.unloaded and data.tenant:
                tp = data.tenant
                if tp.user:
                    res["tenant_name"] = tp.user.full_name or tp.user.email
                if tp.bed:
                    room_num = tp.bed.room.room_number if tp.bed.room else "Unknown"
                    res["room_number"] = f"Room {room_num} - Bed {tp.bed.bed_number}"
        except Exception:
            pass
        return res


# --- RentReminder ---
class RentReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    reminder_type: ReminderType
    scheduled_date: date
    status: ReminderStatus
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


class InvoiceBase(BaseModel):
    invoice_no: str | None = None
    billing_start_date: date
    billing_end_date: date
    invoice_date: date
    total_amount: float = Field(..., ge=0)
    paid_amount: float = Field(0.0, ge=0)
    rent_amount: float = Field(0.0, ge=0)
    security_deposit: float = Field(0.0, ge=0)
    due_date: date
    status: InvoiceStatus = InvoiceStatus.PENDING
    tenant_name: str | None = None
    room_number: str | None = None


class InvoiceCreate(InvoiceBase):
    tenant_id: uuid.UUID


class InvoiceUpdate(BaseModel):
    invoice_no: str | None = None
    invoice_date: date | None = None
    total_amount: float | None = Field(None, ge=0)
    paid_amount: float | None = Field(None, ge=0)
    rent_amount: float | None = Field(None, ge=0)
    security_deposit: float | None = Field(None, ge=0)
    due_date: date | None = None
    status: InvoiceStatus | None = None
    tenant_name: str | None = None
    room_number: str | None = None


class InvoiceResponse(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    payments: list[PaymentResponse] = []
    reminders: list[RentReminderResponse] = []

    @model_validator(mode="before")
    @classmethod
    def populate_tenant_details(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        
        res = {
            "id": data.id,
            "tenant_id": data.tenant_id,
            "invoice_no": data.invoice_no,
            "billing_start_date": data.billing_start_date,
            "billing_end_date": data.billing_end_date,
            "invoice_date": data.invoice_date,
            "total_amount": float(data.total_amount or 0.0),
            "paid_amount": float(data.paid_amount or 0.0),
            "rent_amount": float(getattr(data, "rent_amount", 0.0) or 0.0),
            "security_deposit": float(getattr(data, "security_deposit", 0.0) or 0.0),
            "due_date": data.due_date,
            "status": data.status,
            "created_at": getattr(data, "created_at", None),
            "updated_at": getattr(data, "updated_at", None),
            "created_by": getattr(data, "created_by", None),
            "updated_by": getattr(data, "updated_by", None),
            "tenant_name": "Tenant",
            "room_number": "Unassigned",
        }
        try:
            from sqlalchemy import inspect as sa_inspect
            state = sa_inspect(data)
            if "tenant_profile" not in state.unloaded and data.tenant_profile:
                tp = data.tenant_profile
                if tp.user:
                    res["tenant_name"] = tp.user.full_name or tp.user.email
                if tp.bed:
                    room_num = tp.bed.room.room_number if tp.bed.room else "Unknown"
                    res["room_number"] = f"Room {room_num} - Bed {tp.bed.bed_number}"
        except Exception:
            pass
        return res

class PaymentSettingsResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID | None = None
    upi_id: str
    account_holder: str
    qr_code_image: str | None = None
    payment_instruction: str | None = None
    is_active: bool

