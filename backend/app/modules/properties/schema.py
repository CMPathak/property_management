import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.floors.schema import FloorResponse


class PropertyBase(BaseModel):
    name: str
    code: str | None = None
    address: str
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pin_code: str | None = None
    phone: str | None = None
    email: str | None = None
    property_type: str | None = None
    status: str = "ACTIVE"


class PropertyCreate(PropertyBase):
    manager_ids: list[uuid.UUID] | None = None


class PropertyUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pin_code: str | None = None
    phone: str | None = None
    email: str | None = None
    property_type: str | None = None
    status: str | None = None
    manager_ids: list[uuid.UUID] | None = None


class ManagerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str | None = None
    email: str
    role: str | None = None


class PropertyResponse(PropertyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    floors: list[FloorResponse] = []
    managers: list[ManagerResponse] = []
