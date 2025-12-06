from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import re

from .core.config import settings
from .api.v1.routes import api_router


app = FastAPI(title=settings.APP_NAME)

# CORS configuration
if settings.APP_ENV == "dev" or settings.APP_ENV == "docker":
    # In development, allow any localhost port for flexibility
    allowed_origins = ["*"]  # Permissive for development
else:
    # In production, use strict origins
    allowed_origins = [
        f"http://localhost:{settings.FRONTEND_PORT}",
        f"http://127.0.0.1:{settings.FRONTEND_PORT}",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "Content-Type"],
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
