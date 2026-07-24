import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.floors import FloorResponse


class PropertyBase(BaseModel):
    name: str
    address: str
    description: str | None = None
    images: list[str] | None = None
    documents: list[str] | None = None


class PropertyCreate(PropertyBase):
    manager_ids: list[uuid.UUID] | None = None


class PropertyUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    description: str | None = None
    images: list[str] | None = None
    documents: list[str] | None = None
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
