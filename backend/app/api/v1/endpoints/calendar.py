from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
import traceback

from app.api import deps
from app.models.user import User
from app.models.google_credential import GoogleCredential

router = APIRouter()

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_credential_record(db: Session, user_id: int):
    return db.query(GoogleCredential).filter(GoogleCredential.user_id == user_id).first()

@router.get("/auth-url")
def get_auth_url(redirect_uri: str = Query(...)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id:
        raise HTTPException(500, "Faltan credenciales")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    auth_url, _ = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
    return {"auth_url": auth_url}

@router.get("/callback")
def exchange_code(code: str, redirect_uri: str, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=redirect_uri,
        )
        flow.fetch_token(code=code)
        creds = flow.credentials

        cred = get_credential_record(db, current_user.id)
        if not cred:
            cred = GoogleCredential(user_id=current_user.id)
            db.add(cred)

        cred.access_token = creds.token
        if creds.refresh_token:
            cred.refresh_token = creds.refresh_token

        db.commit()
        return {"msg": "Conectado"}
    except Exception as e:
        print(f"Callback error: {e}")
        raise HTTPException(400, f"Error Google: {e}")

@router.get("/calendars")
def list_calendars(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    cred = get_credential_record(db, current_user.id)
    if not cred:
        raise HTTPException(401, "No conectado")

    try:
        creds = Credentials(
            token=cred.access_token,
            refresh_token=cred.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        )
        service = build('calendar', 'v3', credentials=creds)
        items = service.calendarList().list(minAccessRole='reader').execute().get('items', [])
        return {"calendars": [{'id': c['id'], 'summary': c['summary'], 'primary': c.get('primary', False)} for c in items]}
    except Exception as e:
        raise HTTPException(401, str(e))

@router.put("/settings")
def update_settings(calendar_id: str, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    cred = get_credential_record(db, current_user.id)
    if not cred:
        raise HTTPException(404, "No conectado")
    cred.calendar_id = calendar_id
    db.commit()
    return {"msg": "Calendario actualizado"}

@router.delete("/connection")
def disconnect_google(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    """Borra las credenciales de la base de datos."""
    cred = get_credential_record(db, current_user.id)
    if cred:
        db.delete(cred)
        db.commit()
    return {"msg": "Desconectado"}

@router.get("/events")
def list_events(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_user)):
    cred = get_credential_record(db, current_user.id)
    if not cred:
        return {"count": 0, "events": []}

    try:
        creds = Credentials(
            token=cred.access_token,
            refresh_token=cred.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        )
        service = build('calendar', 'v3', credentials=creds)

        target_calendar = cred.calendar_id or 'primary'

        events_result = service.events().list(
            calendarId=target_calendar,
            timeMin='2025-01-01T00:00:00Z',
            maxResults=20,
            singleEvents=True,
            orderBy='startTime',
        ).execute()
        events = events_result.get('items', [])
        return {"count": len(events), "events": events}
    except Exception as e:
        print(f"Event fetch error: {e}")
        return {"count": 0, "events": []}
