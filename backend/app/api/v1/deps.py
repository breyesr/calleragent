from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.security import ALGORITHM
from ...db.session import SessionLocal
from ...models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise credentials_exception from exc

    subject = payload.get("sub")
    if subject is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == subject.lower()).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user
