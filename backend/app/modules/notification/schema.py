import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.notification.model import NotificationType, NotificationStatus


class NotificationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    notification_type: NotificationType
    title: str
    message: str
    is_read: bool
    created_at: datetime
    updated_at: datetime | None = None
    created_by: uuid.UUID | None = None
    updated_by: uuid.UUID | None = None


class NotificationCreate(BaseModel):
    title: str
    body: str
    type: NotificationType = NotificationType.PUSH
