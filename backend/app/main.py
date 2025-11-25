from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .api.v1.routes import api_router


app = FastAPI(title=settings.APP_NAME)

# Orígenes permitidos en desarrollo
allowed_origins = {
    "http://localhost:3002",
    "http://127.0.0.1:3002",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "Content-Type"],
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
