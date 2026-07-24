import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.beds import BedStatus


class BedBase(BaseModel):
    bed_number: str
    status: BedStatus = BedStatus.VACANT


class BedCreate(BedBase):
    room_id: uuid.UUID


class BedUpdate(BaseModel):
    bed_number: str | None = None
    status: BedStatus | None = None


class BedResponse(BedBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
