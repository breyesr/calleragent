from fastapi import APIRouter
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.clients import router as clients_router
from app.api.v1.endpoints.appointments import router as appointments_router
from app.api.v1.endpoints.tasks import router as tasks_router
from app.api.v1.endpoints.calendar import router as calendar_router
from app.api.v1.endpoints.google_calendar import router as google_calendar_router
from app.api.v1.endpoints.auth import router as auth_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(clients_router, prefix="/clients", tags=["clients"])
api_router.include_router(appointments_router, prefix="/appointments", tags=["appointments"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(calendar_router, prefix="/calendar", tags=["calendar"])
api_router.include_router(
    google_calendar_router, prefix="/integrations/google/calendar", tags=["google-calendar"]
)
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
