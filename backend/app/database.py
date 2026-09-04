from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import DATABASE_URL


# ==============================
# MySQL Engine
# ==============================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


# ==============================
# Database Session
# ==============================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ==============================
# Base Model
# ==============================

Base = declarative_base()


# ==============================
# Dependency
# ==============================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()