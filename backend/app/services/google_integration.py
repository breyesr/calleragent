from __future__ import annotations

import logging
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.google_integration import GoogleIntegration
from app.services.secret_box import secret_box

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"


def google_oauth_ready() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and settings.GOOGLE_REDIRECT_URI)


def get_or_create_integration(db: Session, user_id: int) -> GoogleIntegration:
    integration = db.query(GoogleIntegration).filter(GoogleIntegration.user_id == user_id).one_or_none()
    if integration:
        return integration
    integration = GoogleIntegration(user_id=user_id)
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration


def build_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "scope": " ".join(settings.google_scopes),
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def initiate_oauth(db: Session, user_id: int) -> tuple[str, str]:
    integration = get_or_create_integration(db, user_id)
    state = secrets.token_urlsafe(32)
    integration.state_token = state
    integration.status = "pending"
    integration.provider = "google"
    db.add(integration)
    db.commit()
    return state, build_authorization_url(state)


def _request_token(data: dict[str, Any]) -> dict[str, Any]:
    response = httpx.post(GOOGLE_TOKEN_URL, data=data, timeout=15)
    response.raise_for_status()
    return response.json()


def _decode_account_email(id_token: Optional[str]) -> Optional[str]:
    if not id_token:
        return None
    try:
        payload = jwt.get_unverified_claims(id_token)
        email = payload.get("email")
        if isinstance(email, str):
            return email
    except Exception:  # pylint: disable=broad-except
        logger.exception("Failed to decode Google ID token")
    return None


def _store_tokens(integration: GoogleIntegration, payload: dict[str, Any]) -> None:
    access_token = payload.get("access_token")
    refresh_token = payload.get("refresh_token") or payload.get("refreshToken")
    expires_in = int(payload.get("expires_in", 3600))

    if access_token:
        integration.access_token_encrypted = secret_box.encrypt(access_token)
    if refresh_token:
        integration.refresh_token_encrypted = secret_box.encrypt(refresh_token)
    integration.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    integration.account_email = _decode_account_email(payload.get("id_token")) or integration.account_email
    integration.status = "connected"
    integration.provider = "google"
    integration.last_synced_at = None
    integration.state_token = None


def complete_oauth(db: Session, state: str, code: str) -> Optional[int]:
    integration = db.query(GoogleIntegration).filter(GoogleIntegration.state_token == state).one_or_none()
    if not integration or not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        return None

    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }
    try:
        token_payload = _request_token(data)
    except httpx.HTTPError as exc:
        logger.exception("Failed to exchange Google auth code: %s", exc)
        integration.status = "error"
        integration.state_token = None
        db.add(integration)
        db.commit()
        return integration.user_id

    _store_tokens(integration, token_payload)
    db.add(integration)
    db.commit()
    return integration.user_id


def _decrypt(token: Optional[str]) -> Optional[str]:
    return secret_box.decrypt(token)


def _refresh_access_token(integration: GoogleIntegration, db: Session) -> Optional[str]:
    refresh_token = _decrypt(integration.refresh_token_encrypted)
    if not refresh_token or not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return None
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    try:
        payload = _request_token(data)
    except httpx.HTTPError as exc:
        logger.exception("Failed to refresh Google token: %s", exc)
        integration.status = "error"
        db.add(integration)
        db.commit()
        return None

    _store_tokens(integration, payload)
    db.add(integration)
    db.commit()
    return _decrypt(integration.access_token_encrypted)


def fetch_google_events(db: Session, user_id: int, max_results: int) -> Optional[list[dict[str, Any]]]:
    integration = db.query(GoogleIntegration).filter(GoogleIntegration.user_id == user_id).one_or_none()
    if not integration or integration.status != "connected":
        return None

    token = _decrypt(integration.access_token_encrypted)
    if not token:
        return None

    now = datetime.now(timezone.utc)
    if integration.token_expiry and integration.token_expiry <= now:
        token = _refresh_access_token(integration, db)
        if not token:
            return None

    params = {
        "maxResults": max_results,
        "singleEvents": "true",
        "orderBy": "startTime",
        "timeMin": now.isoformat(),
    }
    headers = {"Authorization": f"Bearer {token}"}
    calendar_id = urllib.parse.quote(settings.GOOGLE_CALENDAR_ID or "primary", safe="")
    url = GOOGLE_EVENTS_URL.format(calendar_id=calendar_id)

    try:
        response = httpx.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("Google Calendar HTTP error (%s): %s", exc.response.status_code, exc.response.text)
        if exc.response.status_code == 401:
            token = _refresh_access_token(integration, db)
            if token:
                return fetch_google_events(db, user_id, max_results)
        return None
    except httpx.HTTPError as exc:
        logger.exception("Failed to contact Google Calendar: %s", exc)
        return None

    payload = response.json()
    items = payload.get("items", [])

    normalized: list[dict[str, Any]] = []
    for item in items:
        start = item.get("start", {})
        end = item.get("end", {})
        start_iso = start.get("dateTime") or start.get("date")
        end_iso = end.get("dateTime") or end.get("date")
        if not start_iso or not end_iso:
            continue
        normalized.append(
            {
                "id": item.get("id", f"gcal_{len(normalized)}"),
                "summary": item.get("summary") or "Google Calendar event",
                "start": _parse_iso(start_iso),
                "end": _parse_iso(end_iso),
                "location": item.get("location") or "Google Calendar",
            }
        )

    integration.last_synced_at = datetime.now(timezone.utc)
    db.add(integration)
    db.commit()
    return normalized


def _parse_iso(value: str) -> datetime:
    clean = value.replace("Z", "+00:00") if value.endswith("Z") else value
    return datetime.fromisoformat(clean)


def reset_integration(integration: GoogleIntegration, db: Session) -> None:
    integration.access_token_encrypted = None
    integration.refresh_token_encrypted = None
    integration.account_email = None
    integration.token_expiry = None
    integration.last_synced_at = None
    integration.status = "disconnected"
    integration.provider = "stub"
    integration.state_token = None
    db.add(integration)
    db.commit()
