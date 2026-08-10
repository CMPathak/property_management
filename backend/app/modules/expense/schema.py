import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.modules.expense.model import ExpenseCategory, PaymentMode


class ExpenseBase(BaseModel):
    title: str | None = None
    description: str | None = None
    category: ExpenseCategory = ExpenseCategory.OTHER
    amount: float = Field(..., gt=0)
    expense_date: datetime.date | None = None
    payment_mode: PaymentMode = PaymentMode.ONLINE
    property_id: uuid.UUID | None = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: ExpenseCategory | None = None
    amount: float | None = Field(None, gt=0)
    expense_date: datetime.date | None = None
    payment_mode: PaymentMode | None = None
    property_id: uuid.UUID | None = None


class ExpenseResponse(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None = None
    description: str | None = None
    category: ExpenseCategory
    amount: float
    expense_date: datetime.date
    payment_mode: PaymentMode | None = PaymentMode.ONLINE
    status: str = "PAID"
    property_id: uuid.UUID | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

