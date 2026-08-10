from fastapi import APIRouter
from typing import Any

router = APIRouter()

@router.get("/")
async def get_notifications() -> Any:
    """
    Dummy endpoint for notifications to prevent frontend 404 errors.
    """
    return []
