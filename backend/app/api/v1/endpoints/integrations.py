from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.google_integration import GoogleAuthStartResponse, GoogleIntegrationStatus
from app.services.google_integration import complete_oauth, google_oauth_ready, initiate_oauth, get_or_create_integration

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/google/status", response_model=GoogleIntegrationStatus)
def google_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> GoogleIntegrationStatus:
    integration = get_or_create_integration(db, current_user.id)
    provider = integration.provider or "stub"
    return GoogleIntegrationStatus(
        connected=integration.status == "connected",
        account_email=integration.account_email,
        last_synced_at=integration.last_synced_at,
        provider=provider if provider in {"google", "stub"} else "stub",
    )


@router.post("/google/start", response_model=GoogleAuthStartResponse)
def start_google_oauth(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> GoogleAuthStartResponse:
    if not google_oauth_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured.",
        )
    state, url = initiate_oauth(db, current_user.id)
    return GoogleAuthStartResponse(authorization_url=url, state=state)


@router.get("/google/callback", include_in_schema=False)
def google_oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    redirect_base = settings.FRONTEND_URL.rstrip("/") + "/settings"
    if error:
        return RedirectResponse(f"{redirect_base}?google=error&message={error}", status_code=status.HTTP_302_FOUND)
    if not code or not state:
        return RedirectResponse(f"{redirect_base}?google=error&message=missing_code", status_code=status.HTTP_302_FOUND)

    user_id = complete_oauth(db, state, code)
    if user_id is None:
        return RedirectResponse(f"{redirect_base}?google=error&message=invalid_state", status_code=status.HTTP_302_FOUND)
    return RedirectResponse(f"{redirect_base}?google=success", status_code=status.HTTP_302_FOUND)
