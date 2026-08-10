import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.modules.complaint.model import ComplaintCategory, ComplaintPriority, ComplaintStatus


# --- ComplaintTimeline ---
class ComplaintTimelineBase(BaseModel):
    # New DB fields
    message: str | None = None
    status_update: ComplaintStatus | None = None
    
    # Legacy frontend fields
    from_status: ComplaintStatus | None = None
    to_status: ComplaintStatus | None = None
    remarks: str | None = None


class ComplaintTimelineCreate(ComplaintTimelineBase):
    complaint_id: uuid.UUID
    staff_id: uuid.UUID


class ComplaintTimelineResponse(ComplaintTimelineBase):
    model_config = ConfigDict(from_attributes=True)
    
    @model_validator(mode="before")
    @classmethod
    def map_legacy_timeline_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            try:
                if hasattr(data, "message"):
                    data.remarks = data.message
                if hasattr(data, "status_update"):
                    data.to_status = data.status_update
            except Exception:
                pass
        return data

    id: uuid.UUID
    complaint_id: uuid.UUID
    staff_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


# --- Complaint ---
class ComplaintBase(BaseModel):
    subject: str = Field(..., description="Subject of the complaint")
    description: str
    priority: ComplaintPriority = ComplaintPriority.MEDIUM
    status: ComplaintStatus = ComplaintStatus.OPEN
    title: str | None = None

    @model_validator(mode="before")
    @classmethod
    def map_incoming_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            data = dict(data)
            if "title" in data and not data.get("subject"):
                data["subject"] = data["title"]
            if "subject" in data and not data.get("title"):
                data["title"] = data["subject"]
            if "tenant_profile_id" in data and not data.get("tenant_id"):
                data["tenant_id"] = data["tenant_profile_id"]
            if not data.get("tenant_id") or data.get("tenant_id") == "":
                data["tenant_id"] = None
            if not data.get("property_id") or data.get("property_id") == "":
                data["property_id"] = None
            if data.get("status") in ["PENDING", "Pending", "pending"]:
                data["status"] = "OPEN"
        return data


class ComplaintCreate(ComplaintBase):
    tenant_id: uuid.UUID | None = None
    tenant_profile_id: uuid.UUID | None = None
    property_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None


class ComplaintUpdate(BaseModel):
    subject: str | None = None
    title: str | None = None
    description: str | None = None
    priority: ComplaintPriority | None = None
    status: ComplaintStatus | None = None
    staff_id: uuid.UUID | None = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)
    
    @model_validator(mode="before")
    @classmethod
    def map_legacy_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            try:
                if hasattr(data, "subject"):
                    data.title = data.subject
                if hasattr(data, "tenant_id"):
                    data.tenant_profile_id = data.tenant_id
                if hasattr(data, "staff_id"):
                    data.assigned_staff_id = data.staff_id
            except Exception:
                pass
        return data

    id: uuid.UUID
    tenant_id: uuid.UUID | None = None
    tenant_profile_id: uuid.UUID | None = None
    property_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None
    tenant_name: str | None = None
    property_name: str | None = None
    staff_id: uuid.UUID | None = None
    assigned_staff_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
    timelines: list[ComplaintTimelineResponse] = []
