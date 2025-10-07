from fastapi import APIRouter
from .endpoints.health import router as health_router
from .endpoints.clients import router as clients_router
from .endpoints.appointments import router as appointments_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(clients_router, prefix="/clients", tags=["clients"])
api_router.include_router(appointments_router, prefix="/appointments", tags=["appointments"])
