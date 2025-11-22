from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import create_google_oauth_state, decode_google_oauth_state
from app.models.google_account import GoogleAccount
from app.models.user import User

router = APIRouter()


@router.get("/oauth/start")
async def google_oauth_start(current_user: User = Depends(get_current_user)) -> dict:
    state = create_google_oauth_state(current_user.id)

    params: dict[str, str] = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URL,
        "response_type": "code",
        "scope": settings.GOOGLE_API_SCOPES,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    params["state"] = state

    query = urlencode(params)
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    return {"auth_url": auth_url}


@router.get("/status")
async def google_oauth_status(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> dict:
    account = (
        db.query(GoogleAccount)
        .filter(GoogleAccount.user_id == current_user.id, GoogleAccount.provider == "google")
        .first()
    )
    if not account:
        return {"connected": False}
    return {"connected": True, "email": account.google_account_email}


@router.get("/oauth/callback")
async def google_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    request: Request | None = None,
    db: Session = Depends(get_db),
) -> dict:
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code")
    if not state:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_state")

    user_id = decode_google_oauth_state(state)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_state")

    current_user = db.get(User, user_id)
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_state")

    token_payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URL,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        token_response = await client.post("https://oauth2.googleapis.com/token", data=token_payload)

    if token_response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to exchange code with Google")

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    scope = token_data.get("scope")

    if not access_token or not refresh_token:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid token response from Google")

    async with httpx.AsyncClient() as client:
        userinfo_response = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch user info from Google")

    userinfo = userinfo_response.json()
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Missing email from Google user info")

    expires_at: Optional[datetime] = None
    if expires_in is not None:
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
        except (TypeError, ValueError):
            expires_at = None

    account = (
        db.query(GoogleAccount)
        .filter(GoogleAccount.user_id == current_user.id, GoogleAccount.provider == "google")
        .first()
    )
    if account:
        account.google_account_email = email
        account.access_token = access_token
        account.refresh_token = refresh_token
        account.scope = scope
        account.expires_at = expires_at
    else:
        account = GoogleAccount(
            user_id=current_user.id,
            provider="google",
            google_account_email=email,
            access_token=access_token,
            refresh_token=refresh_token,
            scope=scope,
            expires_at=expires_at,
        )
        db.add(account)

    db.commit()
    db.refresh(account)

    response_data = {"status": "connected", "email": email}
    redirect_url = f"{settings.FRONTEND_URL.rstrip('/')}/settings?google=connected"

    accept_header = request.headers.get("accept", "") if request else ""
    x_requested_with = request.headers.get("x-requested-with", "") if request else ""
    api_client_param = False
    if request and request.query_params.get("api_client") == "true":
        api_client_param = True

    is_api_client = (
        api_client_param
        or x_requested_with.lower() == "xmlhttprequest"
        or ("application/json" in accept_header and "text/html" not in accept_header)
    )

    if is_api_client:
        return response_data

    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    response.headers["X-Connected-Email"] = email
    return response
