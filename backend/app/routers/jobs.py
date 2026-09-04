from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Resume, User
from app.dependencies import get_current_user

from app.services.ai_service import (
    recommend_jobs_from_resume,
)


router = APIRouter(
    prefix="/jobs",
    tags=["Job Recommendations"]
)


# ============================================================
# RESOLVE USER RESUME
# ============================================================

def resolve_user_resume(
    resume_id: Optional[int],
    current_user: User,
    db: Session,
) -> Resume:
    """
    Get a resume belonging to the currently logged-in user.

    If resume_id is provided:
        Return that specific resume.

    If resume_id is not provided:
        Return the user's latest resume.
    """

    query = db.query(Resume).filter(
        Resume.user_id == current_user.id
    )

    if resume_id is not None:
        resume = query.filter(
            Resume.id == resume_id
        ).first()
    else:
        resume = query.order_by(
            Resume.id.desc()
        ).first()

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Resume not found. Please upload a resume first."
        )

    return resume


# ============================================================
# RECOMMEND JOBS
# ============================================================

@router.post("/recommend")
def recommend_jobs(
    resume_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI-powered job recommendations
    based on the user's resume.
    """

    # --------------------------------------------------------
    # GET RESUME
    # --------------------------------------------------------

    resume = resolve_user_resume(
        resume_id,
        current_user,
        db,
    )

    # --------------------------------------------------------
    # VALIDATE RESUME TEXT
    # --------------------------------------------------------

    if not resume.text or not resume.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Resume text is empty."
        )

    # --------------------------------------------------------
    # GENERATE JOB RECOMMENDATIONS
    # --------------------------------------------------------

    try:
        result = recommend_jobs_from_resume(
            resume.text
        )

        # ====================================================
        # IMPORTANT
        # ====================================================
        #
        # recommend_jobs_from_resume() already returns:
        #
        # [
        #     {
        #         "title": "...",
        #         "description": "...",
        #         "skills": [...],
        #         "match_score": 85
        #     }
        # ]
        #
        # Therefore DO NOT use json.loads(result).
        # ====================================================

        if not isinstance(result, list):
            result = []

        # ----------------------------------------------------
        # NORMALIZE JOBS FOR FRONTEND
        # ----------------------------------------------------

        normalized_jobs = []

        for job in result:

            if not isinstance(job, dict):
                continue

            title = (
                job.get("title")
                or job.get("job_title")
                or job.get("role")
                or "Job Opportunity"
            )

            description = (
                job.get("description")
                or job.get("reason")
                or ""
            )

            skills = job.get(
                "skills",
                []
            )

            if not isinstance(skills, list):
                skills = []

            match_score = (
                job.get("match_score")
                if job.get("match_score") is not None
                else job.get("score", 0)
            )

            try:
                match_score = float(match_score)

                # Keep score between 0 and 100
                match_score = max(
                    0,
                    min(
                        100,
                        match_score
                    )
                )

                # Convert 85.0 -> 85
                if match_score.is_integer():
                    match_score = int(match_score)

            except (
                TypeError,
                ValueError
            ):
                match_score = 0

            normalized_jobs.append({
                "title": str(title).strip(),
                "job_title": str(title).strip(),

                "description": str(
                    description
                ).strip(),

                "skills": [
                    str(skill).strip()
                    for skill in skills
                    if skill is not None
                    and str(skill).strip()
                ],

                "match_score": match_score,
                "score": match_score,

                # Frontend compatibility
                "company": job.get(
                    "company",
                    "Suggested Role"
                ),

                "location": job.get(
                    "location",
                    "India / Remote"
                ),

                "type": job.get(
                    "type",
                    job.get(
                        "job_type",
                        "Full Time"
                    )
                ),

                "url": job.get(
                    "url",
                    ""
                ),

                "job_links": (
                    job.get("job_links")
                    if isinstance(
                        job.get("job_links"),
                        list
                    )
                    else []
                ),
            })

        # ----------------------------------------------------
        # SORT BY MATCH SCORE
        # ----------------------------------------------------

        normalized_jobs.sort(
            key=lambda job: job.get(
                "match_score",
                0
            ),
            reverse=True,
        )

        # ----------------------------------------------------
        # TOP MATCH
        # ----------------------------------------------------

        top_match = (
            normalized_jobs[0]
            if normalized_jobs
            else {}
        )

        # ----------------------------------------------------
        # CAREER RECOMMENDATION
        # ----------------------------------------------------

        career_recommendation = ""

        if top_match:
            career_recommendation = (
                f"Based on your resume, "
                f"{top_match['title']} appears to be "
                f"one of your strongest career matches."
            )

        # ----------------------------------------------------
        # SKILLS TO LEARN
        # ----------------------------------------------------

        skills_to_learn = []

        # Collect commonly recommended skills
        # from job recommendations.
        all_skills = []

        for job in normalized_jobs:
            for skill in job.get(
                "skills",
                []
            ):
                if skill not in all_skills:
                    all_skills.append(skill)

        # We don't want to claim these are missing skills.
        # They are simply useful skills appearing
        # across the recommended roles.
        skills_to_learn = all_skills[:10]

        # ----------------------------------------------------
        # RETURN RESPONSE
        # ----------------------------------------------------

        return {
            "resume_id": resume.id,

            "filename": resume.filename,

            "candidate_profile": {},

            "job_matches": normalized_jobs,

            "jobs": normalized_jobs,

            "recommendations": normalized_jobs,

            "top_match": top_match,

            "career_recommendation": career_recommendation,

            "skills_to_learn": skills_to_learn,

            "total_matches": len(
                normalized_jobs
            ),
        }

    # --------------------------------------------------------
    # FASTAPI ERRORS
    # --------------------------------------------------------

    except HTTPException:
        raise

    # --------------------------------------------------------
    # GENERAL ERRORS
    # --------------------------------------------------------

    except Exception as e:

        print(
            "Job recommendation failed:",
            type(e).__name__,
            str(e),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Job recommendation failed: "
                f"{str(e)}"
            ),
        )