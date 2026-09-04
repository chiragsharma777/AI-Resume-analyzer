from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)


# =========================
# Password Hashing
# =========================

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


# =========================
# JWT Token
# =========================

def create_access_token(data: dict) -> str:

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire
    })

    encoded_jwt = jwt.encode(
        to_encode,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

    return encoded_jwt


# =========================
# Decode JWT Token
# =========================

def decode_access_token(token: str) -> dict | None:

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        return payload

    except JWTError:
        return None