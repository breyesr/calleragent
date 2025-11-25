from datetime import datetime
import os

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from ..schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.models.appointment import Appointment
from app.models.client import Client
from app.models.user import User
from app.models.google_credential import GoogleCredential

router = APIRouter()
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar"


def _get_google_credential(db: Session, user_id: int) -> GoogleCredential | None:
    return db.query(GoogleCredential).filter(GoogleCredential.user_id == user_id).first()


def _build_user_credentials(db: Session, user_id: int) -> tuple[Credentials | None, GoogleCredential | None]:
    cred = _get_google_credential(db, user_id)
    if not cred or (not cred.access_token and not cred.refresh_token):
        return None, cred
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    return (
        Credentials(
            token=cred.access_token,
            refresh_token=cred.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=[GOOGLE_CALENDAR_SCOPE],
        ),
        cred,
    )


def _sync_google_event(db: Session, user: User, appointment: Appointment) -> None:
    creds, cred = _build_user_credentials(db, user.id)
    if not creds or not cred:
        return
    try:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            cred.access_token = creds.token
            db.add(cred)
            db.commit()
            db.refresh(cred)

        service = build("calendar", "v3", credentials=creds)
        client = db.get(Client, appointment.client_id)
        summary = f"Cita: {client.name}" if client else "Cita programada"
        event_body = {
            "summary": summary,
            "description": appointment.notes or "Agendado desde AgentCaller",
            "start": {"dateTime": appointment.starts_at.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": appointment.ends_at.isoformat(), "timeZone": "UTC"},
        }
        service.events().insert(calendarId=cred.calendar_id or "primary", body=event_body).execute()
        print("✅ Evento creado en Google Calendar")
    except Exception as exc:
        print(f"⚠️ Error sincronizando con Google: {exc}")


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    date_from: datetime | None = Query(default=None, description="Filter appointments starting after this datetime"),
    date_to: datetime | None = Query(default=None, description="Filter appointments starting before this datetime"),
    db: Session = Depends(get_db),
) -> list[AppointmentOut]:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="date_from must be before date_to")

    stmt = select(Appointment).order_by(Appointment.starts_at.asc(), Appointment.id.asc())
    if date_from:
        stmt = stmt.where(Appointment.starts_at >= date_from)
    if date_to:
        stmt = stmt.where(Appointment.starts_at <= date_to)
    appointments = db.execute(stmt).scalars().all()
    return appointments


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentOut:
    _ensure_client_exists(db, payload.client_id)
    _validate_time_range(payload.starts_at, payload.ends_at)

    appointment = Appointment(**payload.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    _sync_google_event(db, current_user, appointment)
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AppointmentOut:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    data = payload.model_dump(exclude_unset=True)
    client_id = data.get("client_id", appointment.client_id)
    _ensure_client_exists(db, client_id)

    starts_at = data.get("starts_at", appointment.starts_at)
    ends_at = data.get("ends_at", appointment.ends_at)
    _validate_time_range(starts_at, ends_at)

    for field, value in data.items():
        setattr(appointment, field, value)

    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    db.delete(appointment)
    db.commit()


def _ensure_client_exists(db: Session, client_id: int) -> None:
    if not db.get(Client, client_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")


def _validate_time_range(starts_at: datetime, ends_at: datetime) -> None:
    if ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ends_at must be after starts_at")
