from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from ..schemas.client import ClientCreate, ClientOut, ClientUpdate
from app.models.client import Client
from app.models.user import User

router = APIRouter()


@router.get("", response_model=list[ClientOut])
def list_clients(
    q: str | None = Query(default=None, description="Optional search by name or phone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClientOut]:
    stmt = select(Client).where(Client.owner_id == current_user.id).order_by(Client.name.asc(), Client.id.asc()).limit(100)
    if q:
        pattern = f"%{q.lower()}%"
        stmt = stmt.where(or_(Client.name.ilike(pattern), Client.phone.ilike(pattern)))
    clients = db.execute(stmt).scalars().all()
    return clients


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientOut:
    client = Client(owner_id=current_user.id, **payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClientOut:
    client = db.execute(select(Client).where(Client.id == client_id, Client.owner_id == current_user.id)).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientOut:
    client = db.execute(select(Client).where(Client.id == client_id, Client.owner_id == current_user.id)).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client
