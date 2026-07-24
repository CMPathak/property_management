import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.expense import ExpenseCategory


class ExpenseBase(BaseModel):
    category: ExpenseCategory = ExpenseCategory.OTHER
    amount: float = Field(..., gt=0)
    date: datetime.date
    description: str
    receipt_url: str | None = None


class ExpenseCreate(ExpenseBase):
    property_id: uuid.UUID


class ExpenseUpdate(BaseModel):
    category: ExpenseCategory | None = None
    amount: float | None = Field(None, gt=0)
    date: datetime.date | None = None
    description: str | None = None
    receipt_url: str | None = None
    property_id: uuid.UUID | None = None


class ExpenseResponse(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
