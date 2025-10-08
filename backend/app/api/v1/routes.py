from fastapi import APIRouter
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.clients import router as clients_router
from app.api.v1.endpoints.appointments import router as appointments_router
from app.api.v1.endpoints.auth import router as auth_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(clients_router, prefix="/clients", tags=["clients"])
api_router.include_router(appointments_router, prefix="/appointments", tags=["appointments"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
