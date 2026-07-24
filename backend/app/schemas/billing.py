import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.billing import (
    InvoiceStatus,
    PaymentMethod,
    PaymentStatus,
    ReminderType,
    ReminderStatus,
)


# --- Payment ---
class PaymentBase(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod
    transaction_id: str | None = None


class PaymentCreate(PaymentBase):
    invoice_id: uuid.UUID
    status: PaymentStatus = PaymentStatus.PENDING


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
    sent_at: datetime | None
    status: ReminderStatus
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


# --- Invoice ---
class InvoiceBase(BaseModel):
    billing_period_start: date
    billing_period_end: date
    rent_amount: float = Field(..., ge=0)
    utility_charges: float = Field(0.0, ge=0)
    late_fees: float = Field(0.0, ge=0)
    discount: float = Field(0.0, ge=0)
    total_amount: float = Field(..., ge=0)
    paid_amount: float = Field(0.0, ge=0)
    due_date: date
    status: InvoiceStatus = InvoiceStatus.UNPAID
    pdf_url: str | None = None


class InvoiceCreate(InvoiceBase):
    tenant_profile_id: uuid.UUID
    agreement_id: uuid.UUID


class InvoiceUpdate(BaseModel):
    rent_amount: float | None = Field(None, ge=0)
    utility_charges: float | None = Field(None, ge=0)
    late_fees: float | None = Field(None, ge=0)
    discount: float | None = Field(None, ge=0)
    total_amount: float | None = Field(None, ge=0)
    paid_amount: float | None = Field(None, ge=0)
    due_date: date | None = None
    status: InvoiceStatus | None = None
    pdf_url: str | None = None


class InvoiceResponse(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_profile_id: uuid.UUID
    agreement_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    payments: list[PaymentResponse] = []
    reminders: list[RentReminderResponse] = []
