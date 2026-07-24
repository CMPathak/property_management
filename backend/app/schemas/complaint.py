import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.complaint import ComplaintCategory, ComplaintPriority, ComplaintStatus


# --- ComplaintTimeline ---
class ComplaintTimelineBase(BaseModel):
    from_status: ComplaintStatus | None = None
    to_status: ComplaintStatus
    remarks: str | None = None


class ComplaintTimelineCreate(ComplaintTimelineBase):
    complaint_id: uuid.UUID
    changed_by: uuid.UUID


class ComplaintTimelineResponse(ComplaintTimelineBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: uuid.UUID
    changed_by: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


# --- Complaint ---
class ComplaintBase(BaseModel):
    category: ComplaintCategory = ComplaintCategory.OTHER
    title: str
    description: str
    priority: ComplaintPriority = ComplaintPriority.MEDIUM
    status: ComplaintStatus = ComplaintStatus.OPEN
    images: list[str] | None = None


class ComplaintCreate(ComplaintBase):
    tenant_profile_id: uuid.UUID | None = None
    property_id: uuid.UUID | None = None


class ComplaintUpdate(BaseModel):
    category: ComplaintCategory | None = None
    title: str | None = None
    description: str | None = None
    priority: ComplaintPriority | None = None
    status: ComplaintStatus | None = None
    assigned_staff_id: uuid.UUID | None = None
    images: list[str] | None = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_profile_id: uuid.UUID | None = None
    property_id: uuid.UUID | None = None
    tenant_name: str | None = None
    property_name: str | None = None
    assigned_staff_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    timelines: list[ComplaintTimelineResponse] = []
