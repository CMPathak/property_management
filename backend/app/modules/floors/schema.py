import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.rooms.schema import RoomResponse


class FloorBase(BaseModel):
    floor_number: int
    floor_name: str | None = None
    floor_type: str | None = None
    description: str | None = None
    status: str | None = "ACTIVE"


class FloorCreate(FloorBase):
    property_id: uuid.UUID


class FloorUpdate(BaseModel):
    floor_number: int | None = None
    property_id: uuid.UUID | None = None
    floor_name: str | None = None
    floor_type: str | None = None
    description: str | None = None
    status: str | None = None


class FloorResponse(FloorBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    rooms: list[RoomResponse] = []
