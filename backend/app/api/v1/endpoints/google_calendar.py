from urllib.parse import urlencode

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/oauth/start")
def start_google_oauth(state: str | None = None) -> dict:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URL,
        "response_type": "code",
        "scope": settings.GOOGLE_API_SCOPES,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    if state is not None:
        params["state"] = state

    query = urlencode(params)
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    return {"auth_url": auth_url}
