from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app.models import Resume, User
from app.dependencies import get_current_user
from app.services.parser import extract_text


router = APIRouter(
    prefix="/resumes",
    tags=["Resumes"]
)


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".doc"}
MAX_SIZE = 10 * 1024 * 1024


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filename = file.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOC, DOCX and TXT files are allowed"
        )

    file_content = await file.read()

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    if len(file_content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 10 MB"
        )

    try:
        resume_text = extract_text(file_content, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not extract resume text: {str(e)}"
        )

    if not resume_text or not resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from resume"
        )

    new_resume = Resume(
        user_id=current_user.id,
        filename=filename,
        text=resume_text
    )

    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    return {
        "message": "Resume uploaded successfully",
        "resume_id": new_resume.id,
        "id": new_resume.id,
        "filename": new_resume.filename,
        "user_id": current_user.id,
        "resume": {
            "id": new_resume.id,
            "filename": new_resume.filename,
            "user_id": current_user.id,
        },
    }


@router.get("/me/latest")
def get_latest_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.id.desc())
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="No resume uploaded yet"
        )

    return {
        "id": resume.id,
        "filename": resume.filename,
        "resume_text": resume.text,
        "analysis": resume.analysis,
        "created_at": resume.created_at,
    }


@router.get("/{resume_id}")
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    return {
        "id": resume.id,
        "filename": resume.filename,
        "resume_text": resume.text,
        "analysis": resume.analysis,
        "created_at": resume.created_at
    }
