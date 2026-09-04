from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Resume, User
from app.dependencies import get_current_user

from app.services.ai_service import (
    analyze_resume,
    match_resume_with_job,
)


router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"]
)


# ============================================================
# GET USER RESUME
# ============================================================

def get_user_resume(
    resume_id: int,
    current_user: User,
    db: Session
) -> Resume:

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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )

    return resume


# ============================================================
# ANALYZE RESUME
# ============================================================

@router.post("/{resume_id}")
def analyze_resume_endpoint(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze a user's resume using Google Gemini.
    """

    resume = get_user_resume(
        resume_id,
        current_user,
        db
    )

    resume_text = (
        getattr(resume, "parsed_text", None)
        or getattr(resume, "content", None)
        or getattr(resume, "text", None)
        or ""
    )

    if not resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is empty. Please upload a valid resume."
        )

    try:

        analysis = analyze_resume(
            resume_text
        )

        # ----------------------------------------------------
        # Save analysis if model has analysis field
        # ----------------------------------------------------

        if hasattr(resume, "analysis"):

            import json

            resume.analysis = json.dumps(
                analysis,
                ensure_ascii=False
            )

            db.commit()
            db.refresh(resume)

        return {
            "success": True,
            "message": "Resume analysis completed successfully.",
            "resume_id": resume.id,
            "analysis": analysis
        }

    except HTTPException:
        raise

    except Exception as exc:

        db.rollback()

        print(
            f"Resume analysis API error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to analyze the resume right now. "
                f"{str(exc)}"
            )
        )


# ============================================================
# GET SAVED ANALYSIS
# ============================================================

@router.get("/{resume_id}")
def get_resume_analysis(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return the previously generated resume analysis.
    """

    resume = get_user_resume(
        resume_id,
        current_user,
        db
    )

    if not hasattr(resume, "analysis"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis is not available for this resume."
        )

    saved_analysis = resume.analysis

    if not saved_analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis has not been generated yet."
        )

    try:

        import json

        if isinstance(
            saved_analysis,
            str
        ):
            analysis = json.loads(
                saved_analysis
            )
        else:
            analysis = saved_analysis

        return {
            "success": True,
            "message": "Resume analysis retrieved successfully.",
            "resume_id": resume.id,
            "analysis": analysis
        }

    except Exception as exc:

        print(
            f"Saved analysis parsing error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Saved resume analysis is corrupted."
        )


# ============================================================
# MATCH RESUME WITH JOB
# ============================================================

@router.post("/{resume_id}/match")
def match_resume_endpoint(
    resume_id: int,
    job_description: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Match a resume against a job description.
    """

    resume = get_user_resume(
        resume_id,
        current_user,
        db
    )

    resume_text = (
        getattr(resume, "parsed_text", None)
        or getattr(resume, "content", None)
        or getattr(resume, "text", None)
        or ""
    )

    if not resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is empty."
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty."
        )

    try:

        result = match_resume_with_job(
            resume_text,
            job_description
        )

        return {
            "success": True,
            "resume_id": resume.id,
            "match": result
        }

    except Exception as exc:

        print(
            f"Resume-job matching API error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to match resume with job. "
                f"{str(exc)}"
            )
        )