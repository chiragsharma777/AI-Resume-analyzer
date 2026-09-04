from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401 - register models with SQLAlchemy metadata
from app.routers import auth
from app.routers import resume
from app.routers import analysis
from app.routers import jobs


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure all tables exist before serving requests.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AI Resume Analyzer API",
    description="AI-powered Resume Analysis and Job Matching Platform",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(analysis.router)
app.include_router(jobs.router)


@app.get("/")
def root():
    return {
        "message": "AI Resume Analyzer API is running",
        "status": "success"
    }


@app.get("/health")
def health():
    return {"status": "ok"}
