from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

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


def create_google_oauth_state(user_id: int, expires_minutes: int = 15) -> str:
    # Callback cannot rely on Authorization headers; this signed state must be verifiable
    # with the same SECRET_KEY to recover the initiating user.
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": user_id, "exp": expire, "aud": "google_oauth_state"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_google_oauth_state(state: str) -> Optional[int]:
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM], audience="google_oauth_state")
        sub = payload.get("sub")
        if isinstance(sub, int):
            return sub
        # Allow strings that represent ints, though we expect int
        if isinstance(sub, str) and sub.isdigit():
            return int(sub)
    except JWTError:
        return None
    return None
