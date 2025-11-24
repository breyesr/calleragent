import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

router = APIRouter()

# Scopes para leer eventos (MVP scope document)
SCOPES = ["https://www.googleapis.com/auth/calendar.events.readonly"]


@router.get("/auth-url")
def get_auth_url(redirect_uri: str = Query(..., description="URL de retorno registrada en Google Cloud")):
    """
    Genera la URL de autorización de Google.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Faltan credenciales GOOGLE_CLIENT_ID/SECRET en servidor")

    try:
        flow_config = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }

        flow = Flow.from_client_config(flow_config, scopes=SCOPES, redirect_uri=redirect_uri)

        auth_url, _ = flow.authorization_url(prompt="consent")
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/callback")
def exchange_code(code: str, redirect_uri: str):
    """
    Intercambia el 'code' por tokens (access_token, refresh_token).
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Faltan credenciales GOOGLE_CLIENT_ID/SECRET en servidor")

    try:
        flow_config = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }

        flow = Flow.from_client_config(flow_config, scopes=SCOPES, redirect_uri=redirect_uri)

        flow.fetch_token(code=code)
        creds = flow.credentials

        return {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expiry": creds.expiry.isoformat() if creds.expiry else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al intercambiar token: {str(e)}")


@router.get("/events")
def list_events(access_token: str):
    """
    Lista los próximos 10 eventos usando un token de acceso válido.
    """
    try:
        creds = Credentials(token=access_token)
        service = build("calendar", "v3", credentials=creds)

        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=f"{datetime.utcnow().isoformat()}Z",
                maxResults=10,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        events = events_result.get("items", [])
        return {"count": len(events), "events": events}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error consultando calendario: {str(e)}")
