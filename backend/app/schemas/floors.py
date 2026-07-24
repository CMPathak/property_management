import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.rooms import RoomResponse


class FloorBase(BaseModel):
    floor_number: int


class FloorCreate(FloorBase):
    property_id: uuid.UUID


class FloorUpdate(BaseModel):
    floor_number: int | None = None


class FloorResponse(FloorBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    rooms: list[RoomResponse] = []
