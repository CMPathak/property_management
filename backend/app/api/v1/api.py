from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    properties,
    floors,
    rooms,
    beds,
    tenants,
    rent,
    complaints,
    users,
    attendance,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(floors.router, prefix="/floors", tags=["floors"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(beds.router, prefix="/beds", tags=["beds"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(rent.router, prefix="/rent", tags=["rent"])
api_router.include_router(complaints.router, prefix="/complaints", tags=["complaints"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
