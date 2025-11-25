from fastapi import APIRouter, HTTPException, Query
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
import traceback

router = APIRouter()

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

@router.get("/auth-url")
def get_auth_url(redirect_uri: str = Query(..., description="URL de retorno")):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        print("❌ ERROR: Faltan credenciales en .env")
        raise HTTPException(status_code=500, detail="Faltan credenciales")

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
        auth_url, _ = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
        return {"auth_url": auth_url}
    except Exception as e:
        print(f"❌ ERROR EN AUTH-URL: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/callback")
def exchange_code(code: str, redirect_uri: str):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    print(f"\n--- DEBUG CALLBACK ---")
    print(f"Code recibido (len): {len(code)}")
    print(f"Redirect URI recibida del frontend: '{redirect_uri}'")
    
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
        
        # Intentamos el canje
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        print("✅ ¡TOKEN OBTENIDO CON ÉXITO!")
        return {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expiry": creds.expiry.isoformat() if creds.expiry else None
        }
    except Exception as e:
        error_msg = str(e)
        print(f"❌ ERROR GOOGLE DETALLADO: {error_msg}")
        try:
            if hasattr(e, 'error_details'):
                print(f"❌ DATA EXTRA: {e.error_details}")
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Google Error: {error_msg}")

# Endpoints de lectura (simplificados para no ocupar espacio, ya funcionan si tenemos token)
@router.get("/calendars")
def list_calendars(access_token: str):
    try:
        creds = Credentials(token=access_token)
        service = build('calendar', 'v3', credentials=creds)
        calendar_list = service.calendarList().list(minAccessRole='reader').execute()
        items = calendar_list.get('items', [])
        return {"calendars": [{'id': c['id'], 'summary': c['summary'], 'primary': c.get('primary', False)} for c in items]}
    except Exception as e:
        print(f"❌ ERROR LISTANDO CALENDARIOS: {e}")
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/events")
def list_events(access_token: str, calendar_id: str = 'primary'):
    try:
        creds = Credentials(token=access_token)
        service = build('calendar', 'v3', credentials=creds)
        events_result = service.events().list(calendarId=calendar_id, timeMin='2025-01-01T00:00:00Z', maxResults=20, singleEvents=True, orderBy='startTime').execute()
        return {"count": len(events_result.get('items', [])), "events": events_result.get('items', [])}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
