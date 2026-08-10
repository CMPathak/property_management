from fastapi import APIRouter
from app.modules.auth.router import router as auth_router
from app.modules.properties.router import router as properties_router
from app.modules.floors.router import router as floors_router
from app.modules.rooms.router import router as rooms_router
from app.modules.beds.router import router as beds_router
from app.modules.tenant.router import router as tenant_router
from app.modules.billing.router import router as billing_router
from app.modules.complaint.router import router as complaint_router
from app.modules.users.router import router as users_router
from app.modules.staff.router import router as staff_router
from app.modules.notification.router import router as notification_router
from app.modules.expense.router import router as expense_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(properties_router, prefix="/properties", tags=["properties"])
api_router.include_router(floors_router, prefix="/floors", tags=["floors"])
api_router.include_router(rooms_router, prefix="/rooms", tags=["rooms"])
api_router.include_router(beds_router, prefix="/beds", tags=["beds"])
api_router.include_router(tenant_router, prefix="/tenants", tags=["tenants"])
api_router.include_router(billing_router, prefix="/rent", tags=["rent"])
api_router.include_router(complaint_router, prefix="/complaints", tags=["complaints"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(users_router, prefix="/staff", tags=["staff"])
api_router.include_router(staff_router, prefix="/attendance", tags=["attendance"])
api_router.include_router(notification_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(expense_router, prefix="/expenses", tags=["expenses"])

