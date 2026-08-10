import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.modules.rooms.model import RoomType, RoomStatus
from app.modules.beds.schema import BedResponse
from typing import Any, Optional


class RoomBase(BaseModel):
    room_number: str
    room_type: RoomType = RoomType.SINGLE
    monthly_rent: float = Field(..., ge=0)
    security_deposit: float = Field(0.00, ge=0)
    capacity: int | None = None
    description: str | None = None
    status: RoomStatus = RoomStatus.AVAILABLE


class RoomCreate(RoomBase):
    floor_id: uuid.UUID


class RoomUpdate(BaseModel):
    room_number: str | None = None
    room_type: RoomType | None = None
    monthly_rent: float | None = Field(None, ge=0)
    security_deposit: float | None = Field(None, ge=0)
    capacity: int | None = None
    description: str | None = None
    status: RoomStatus | None = None

class RoomResponse(RoomBase):
    model_config = ConfigDict(from_attributes=True)
    
    @model_validator(mode="before")
    @classmethod
    def map_base_rent_to_monthly_rent(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "monthly_rent" not in data and "base_rent" in data:
                data["monthly_rent"] = data.pop("base_rent")
        return data

    id: uuid.UUID
    floor_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    beds: list[BedResponse] = []
