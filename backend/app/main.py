
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401 - register models with SQLAlchemy metadata

from app.routers import auth
from app.routers import resume
from app.routers import analysis
from app.routers import jobs


# =========================================================
# DATABASE STARTUP
# =========================================================

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure all tables exist before serving requests.
    Base.metadata.create_all(bind=engine)
    yield


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="AI Resume Analyzer API",
    description="AI-powered Resume Analysis and Job Matching Platform",
    version="1.0.0",
    lifespan=lifespan,
)


# =========================================================
# CORS CONFIGURATION
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://YOUR-VERCEL-DOMAIN.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(analysis.router)
app.include_router(jobs.router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "AI Resume Analyzer API is running",
        "status": "success",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {"status": "ok"}
