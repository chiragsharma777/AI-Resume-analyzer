from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime

from app.database import Base


# =====================================
# User Table
# =====================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# =====================================
# Resume Table
# =====================================

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    filename = Column(
        String(255),
        nullable=False
    )

    text = Column(
        Text,
        nullable=False
    )

    analysis = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )