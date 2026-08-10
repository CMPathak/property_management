import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.audit.model import AuditAction


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    action: AuditAction
    table_name: str
    record_id: uuid.UUID | None
    old_values: dict | None
    new_values: dict | None
    ip_address: str | None
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None
