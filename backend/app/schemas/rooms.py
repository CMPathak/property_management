import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.rooms import RoomType
from app.schemas.beds import BedResponse


class RoomBase(BaseModel):
    room_number: str
    room_type: RoomType = RoomType.SINGLE
    base_rent: float = Field(..., gt=0)


class RoomCreate(RoomBase):
    floor_id: uuid.UUID


class RoomUpdate(BaseModel):
    room_number: str | None = None
    room_type: RoomType | None = None
    base_rent: float | None = Field(None, gt=0)


class RoomResponse(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    floor_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    beds: list[BedResponse] = []
