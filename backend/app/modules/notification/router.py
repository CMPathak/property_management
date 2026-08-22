from fastapi import APIRouter, Depends
from typing import Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.modules.users.model import User
from app.modules.notification.model import NotificationLog
from app.modules.notification.schema import NotificationCreate

router = APIRouter()

@router.get("/")
async def get_notifications(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get notifications for the current user.
    """
    result = await db.execute(
        select(NotificationLog)
        .where(NotificationLog.user_id == current_user.id)
        .order_by(NotificationLog.created_at.desc())
    )
    notifications = result.scalars().all()
    
    return [
        {
            "id": str(n.id),
            "title": n.title,
            "body": n.message,
            "created_at": n.created_at,
            "is_read": n.is_read
        }
        for n in notifications
    ]

@router.post("/")
async def create_announcement(
    data: NotificationCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Create a new announcement for all users.
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    for user in users:
        new_notif = NotificationLog(
            user_id=user.id,
            notification_type=data.type,
            title=data.title,
            message=data.body,
            is_read=False,
            created_by=current_user.id
        )
        db.add(new_notif)
    
    await db.commit()
    return {"message": f"Announcement published to {len(users)} users"}
