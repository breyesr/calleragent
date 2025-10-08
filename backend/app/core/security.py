from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_minutes: int | None = None) -> str:
    to_encode = data.copy()
    expire_delta = expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def validate_token(token: str) -> Dict[str, Any]:
    try:
        return decode_token(token)
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
