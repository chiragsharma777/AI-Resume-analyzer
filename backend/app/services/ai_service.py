# backend/app/services/ai_service.py

import json
import re
import sys
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from app.config import GEMINI_API_KEY, MODEL_NAME


# ============================================================
# UTF-8 SAFE CONSOLE
# ============================================================

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


# ============================================================
# CONFIGURATION
# ============================================================

MAX_RESUME_LENGTH = 30000
MAX_JOB_DESCRIPTION_LENGTH = 20000

MAX_OUTPUT_TOKENS_ANALYSIS = 6000
MAX_OUTPUT_TOKENS_MATCH = 3500
MAX_OUTPUT_TOKENS_JOBS = 3500


# ============================================================
# GEMINI CLIENT
# ============================================================

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. "
        "Add GEMINI_API_KEY to your .env file."
    )

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ============================================================
# BASIC VALIDATION
# ============================================================

def validate_ai_setup() -> None:
    """Validate Gemini configuration."""

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "Gemini API key is not configured."
        )

    if not MODEL_NAME:
        raise RuntimeError(
            "Gemini model name is not configured."
        )


def validate_text(
    text: str,
    field_name: str = "Text"
) -> str:
    """Validate and clean text input."""

    if text is None:
        raise ValueError(
            f"{field_name} cannot be empty."
        )

    text = str(text).strip()

    if not text:
        raise ValueError(
            f"{field_name} cannot be empty."
        )

    return text


# ============================================================
# TEXT HELPERS
# ============================================================

def clean_text(text: Any) -> str:
    """Convert arbitrary value to clean text."""

    if text is None:
        return ""

    if isinstance(text, str):
        return text.strip()

    return str(text).strip()


def normalize_score(value: Any) -> int:
    """Convert score to integer between 0 and 100."""

    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0

    # Handle decimal scores such as 0.85
    if 0 <= score <= 1:
        score *= 100

    score = max(
        0,
        min(100, score)
    )

    return int(round(score))


def ensure_list(value: Any) -> List[Any]:
    """Convert values safely into a list."""

    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, tuple):
        return list(value)

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return []

        # Handle comma/newline separated values
        if "," in value:
            return [
                item.strip()
                for item in value.split(",")
                if item.strip()
            ]

        if "\n" in value:
            return [
                item.strip(" -•\t")
                for item in value.splitlines()
                if item.strip()
            ]

        return [value]

    return [value]


def clean_list(value: Any) -> List[str]:
    """Convert a value to a clean string list."""

    items = ensure_list(value)

    result = []

    for item in items:
        if isinstance(item, dict):
            # Try common fields
            text = (
                item.get("name")
                or item.get("title")
                or item.get("text")
                or item.get("description")
                or ""
            )
        else:
            text = item

        text = clean_text(text)

        if text:
            result.append(text)

    return result


# ============================================================
# JSON EXTRACTION
# ============================================================

def extract_json(text: str) -> Any:
    """
    Extract valid JSON from Gemini response.

    Handles:
    - plain JSON
    - markdown JSON blocks
    - JSON surrounded by explanatory text
    """

    if not text:
        raise ValueError(
            "AI returned an empty response."
        )

    text = text.strip()

    # --------------------------------------------------------
    # Remove markdown code fences
    # --------------------------------------------------------

    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    text = text.strip()

    # --------------------------------------------------------
    # Direct JSON
    # --------------------------------------------------------

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # --------------------------------------------------------
    # Scan for JSON object / array
    # --------------------------------------------------------

    decoder = json.JSONDecoder()

    for index, character in enumerate(text):

        if character not in "{[":
            continue

        try:
            result, _ = decoder.raw_decode(
                text[index:]
            )

            return result

        except json.JSONDecodeError:
            continue

    raise ValueError(
        "Could not find valid JSON in AI response."
    )


# ============================================================
# GEMINI REQUEST
# ============================================================

def generate_json_response(
    prompt: str,
    max_output_tokens: int = 4000,
    temperature: float = 0.1,
) -> Any:
    """
    Send request to Gemini and return parsed JSON.
    """

    validate_ai_setup()

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
                system_instruction=(
                    "You are a professional resume analysis and "
                    "career intelligence engine. "
                    "Return ONLY valid JSON. "
                    "Never use Markdown. "
                    "Never include explanations outside JSON."
                ),
            ),
        )

        raw_text = getattr(
            response,
            "text",
            None
        )

        if not raw_text:
            raise ValueError(
                "Gemini returned an empty response."
            )

        return extract_json(raw_text)

    except Exception as exc:

        print(
            f"Gemini request failed: "
            f"{type(exc).__name__}: {exc}"
        )

        raise


# ============================================================
# RESUME ANALYSIS NORMALIZATION
# ============================================================

def normalize_resume_analysis(
    data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Normalize Gemini's resume analysis response.

    This keeps the API response predictable for the frontend.
    """

    if not isinstance(data, dict):
        data = {}

    # --------------------------------------------------------
    # ATS SCORE
    # --------------------------------------------------------

    ats_score = normalize_score(
        data.get("ats_score")
        or data.get("resume_score")
        or data.get("score")
        or data.get("overall_score")
    )

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    summary = clean_text(
        data.get("summary")
        or data.get("professional_summary")
        or data.get("profile_summary")
        or data.get("executive_summary")
        or ""
    )

    # --------------------------------------------------------
    # SKILLS
    # --------------------------------------------------------

    detected_skills = data.get(
        "detected_skills",
        data.get(
            "skills",
            []
        )
    )

    technical_skills = data.get(
        "technical_skills",
        []
    )

    soft_skills = data.get(
        "soft_skills",
        []
    )

    # Support grouped technical skills
    if isinstance(technical_skills, dict):

        flattened_technical = []

        for category, values in technical_skills.items():

            values = clean_list(values)

            for value in values:
                flattened_technical.append(value)

        technical_skills = flattened_technical

    else:
        technical_skills = clean_list(
            technical_skills
        )

    detected_skills = clean_list(
        detected_skills
    )

    soft_skills = clean_list(
        soft_skills
    )

    # Combine skills without duplicates
    all_skills = []

    for skill in (
        detected_skills
        + technical_skills
        + soft_skills
    ):

        normalized = skill.lower()

        if not any(
            existing.lower() == normalized
            for existing in all_skills
        ):
            all_skills.append(skill)

    # --------------------------------------------------------
    # STRENGTHS
    # --------------------------------------------------------

    strengths = clean_list(
        data.get("strengths", [])
    )

    # --------------------------------------------------------
    # IMPROVEMENTS
    # --------------------------------------------------------

    improvements = clean_list(
        data.get("improvements", [])
    )

    # --------------------------------------------------------
    # RECOMMENDED ROLES
    # --------------------------------------------------------

    raw_roles = (
        data.get("recommended_job_roles")
        or data.get("recommended_roles")
        or data.get("job_roles")
        or []
    )

    recommended_roles = []

    for role in ensure_list(raw_roles):

        if isinstance(role, dict):

            recommended_roles.append({
                "role": clean_text(
                    role.get("role")
                    or role.get("title")
                    or role.get("job_title")
                    or "Recommended Role"
                ),
                "description": clean_text(
                    role.get("description")
                    or role.get("reason")
                    or role.get("why")
                    or ""
                ),
                "match_score": normalize_score(
                    role.get("match_score")
                    or role.get("score")
                    or role.get("fit_score")
                ),
            })

        else:

            role_text = clean_text(role)

            if role_text:
                recommended_roles.append({
                    "role": role_text,
                    "description": "",
                    "match_score": 0,
                })

    # --------------------------------------------------------
    # ATS BREAKDOWN
    # --------------------------------------------------------

    ats_breakdown = (
        data.get("ats_breakdown")
        or data.get("score_breakdown")
        or data.get("ats_score_breakdown")
        or {}
    )

    if not isinstance(ats_breakdown, dict):
        ats_breakdown = {}

    normalized_breakdown = {}

    for key, value in ats_breakdown.items():

        label = clean_text(
            str(key).replace("_", " ").title()
        )

        if isinstance(value, dict):

            score = normalize_score(
                value.get("score")
                or value.get("value")
                or value.get("rating")
            )

            explanation = clean_text(
                value.get("explanation")
                or value.get("reason")
                or value.get("feedback")
                or ""
            )

            normalized_breakdown[label] = {
                "score": score,
                "explanation": explanation,
            }

        else:

            normalized_breakdown[label] = {
                "score": normalize_score(value),
                "explanation": "",
            }

    # --------------------------------------------------------
    # KEYWORD ANALYSIS
    # --------------------------------------------------------

    keyword_analysis = (
        data.get("keyword_analysis")
        or data.get("keywords")
        or {}
    )

    if not isinstance(keyword_analysis, dict):
        keyword_analysis = {}

    missing_keywords = clean_list(
        keyword_analysis.get(
            "missing_keywords",
            data.get("missing_keywords", [])
        )
    )

    keywords_to_add = clean_list(
        keyword_analysis.get(
            "keywords_to_add",
            data.get("keywords_to_add", [])
        )
    )

    matched_keywords = clean_list(
        keyword_analysis.get(
            "matched_keywords",
            []
        )
    )

    keyword_score = normalize_score(
        keyword_analysis.get(
            "score",
            keyword_analysis.get(
                "keyword_score",
                0
            )
        )
    )

    # --------------------------------------------------------
    # EXPERIENCE ANALYSIS
    # --------------------------------------------------------

    experience_analysis = (
        data.get("experience_analysis")
        or data.get("experience")
        or {}
    )

    if not isinstance(
        experience_analysis,
        dict
    ):
        experience_analysis = {
            "summary": clean_text(
                experience_analysis
            )
        }

    # --------------------------------------------------------
    # EDUCATION ANALYSIS
    # --------------------------------------------------------

    education_analysis = (
        data.get("education_analysis")
        or data.get("education")
        or {}
    )

    if not isinstance(
        education_analysis,
        dict
    ):
        education_analysis = {
            "summary": clean_text(
                education_analysis
            )
        }

    # --------------------------------------------------------
    # PROJECT ANALYSIS
    # --------------------------------------------------------

    projects_analysis = (
        data.get("projects_analysis")
        or data.get("project_analysis")
        or data.get("projects")
        or []
    )

    normalized_projects = []

    for project in ensure_list(
        projects_analysis
    ):

        if isinstance(project, dict):

            normalized_projects.append({
                "name": clean_text(
                    project.get("name")
                    or project.get("title")
                    or "Project"
                ),
                "description": clean_text(
                    project.get("description")
                    or ""
                ),
                "technologies": clean_list(
                    project.get("technologies")
                    or project.get("tech_stack")
                    or project.get("skills")
                    or []
                ),
                "strengths": clean_list(
                    project.get("strengths")
                    or []
                ),
                "improvements": clean_list(
                    project.get("improvements")
                    or []
                ),
            })

        else:

            text = clean_text(project)

            if text:
                normalized_projects.append({
                    "name": "Project",
                    "description": text,
                    "technologies": [],
                    "strengths": [],
                    "improvements": [],
                })

    # --------------------------------------------------------
    # SECTION ANALYSIS
    # --------------------------------------------------------

    section_analysis = (
        data.get("section_analysis")
        or data.get("sections")
        or {}
    )

    if not isinstance(
        section_analysis,
        dict
    ):
        section_analysis = {}

    normalized_sections = {}

    for key, value in section_analysis.items():

        label = clean_text(
            str(key).replace("_", " ").title()
        )

        if isinstance(value, dict):

            normalized_sections[label] = {
                "present": bool(
                    value.get(
                        "present",
                        value.get(
                            "exists",
                            True
                        )
                    )
                ),
                "score": normalize_score(
                    value.get(
                        "score",
                        0
                    )
                ),
                "feedback": clean_text(
                    value.get(
                        "feedback",
                        value.get(
                            "suggestion",
                            ""
                        )
                    )
                ),
            }

        else:

            normalized_sections[label] = {
                "present": bool(value),
                "score": 0,
                "feedback": "",
            }

    # --------------------------------------------------------
    # FORMATTING
    # --------------------------------------------------------

    formatting = (
        data.get("formatting")
        or data.get("formatting_analysis")
        or {}
    )

    if isinstance(
        formatting,
        list
    ):
        formatting = {
            "suggestions": clean_list(
                formatting
            )
        }

    elif not isinstance(
        formatting,
        dict
    ):
        formatting = {
            "summary": clean_text(
                formatting
            )
        }

    # --------------------------------------------------------
    # IMPROVEMENT PLAN
    # --------------------------------------------------------

    improvement_plan = clean_list(
        data.get(
            "improvement_plan",
            data.get(
                "action_plan",
                data.get(
                    "action_items",
                    []
                )
            )
        )
    )

    # --------------------------------------------------------
    # SKILL GAPS
    # --------------------------------------------------------

    skill_gaps = clean_list(
        data.get(
            "skill_gaps",
            data.get(
                "missing_skills",
                []
            )
        )
    )

    # --------------------------------------------------------
    # ACHIEVEMENT SUGGESTIONS
    # --------------------------------------------------------

    achievement_suggestions = clean_list(
        data.get(
            "achievement_suggestions",
            data.get(
                "achievements",
                []
            )
        )
    )

    # --------------------------------------------------------
    # RED FLAGS
    # --------------------------------------------------------

    red_flags = clean_list(
        data.get(
            "red_flags",
            data.get(
                "concerns",
                []
            )
        )
    )

    # --------------------------------------------------------
    # GRAMMAR ISSUES
    # --------------------------------------------------------

    grammar_issues = clean_list(
        data.get(
            "grammar_issues",
            data.get(
                "grammar",
                []
            )
        )
    )

    # --------------------------------------------------------
    # CONTACT INFORMATION
    # --------------------------------------------------------

    contact_information = (
        data.get(
            "contact_information",
            data.get(
                "contact_info",
                {}
            )
        )
    )

    if not isinstance(
        contact_information,
        dict
    ):
        contact_information = {}

    # --------------------------------------------------------
    # CAREER RECOMMENDATION
    # --------------------------------------------------------

    career_recommendation = clean_text(
        data.get(
            "career_recommendation",
            data.get(
                "career_advice",
                ""
            )
        )
    )

    # --------------------------------------------------------
    # JOB READINESS
    # --------------------------------------------------------

    job_readiness = normalize_score(
        data.get(
            "job_readiness",
            data.get(
                "readiness_score",
                0
            )
        )
    )

    # --------------------------------------------------------
    # RESUME QUALITY
    # --------------------------------------------------------

    resume_quality = normalize_score(
        data.get(
            "resume_quality",
            data.get(
                "quality_score",
                0
            )
        )
    )

    # --------------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------------

    return {
        "ats_score": ats_score,
        "resume_score": ats_score,
        "score": ats_score,

        "summary": summary,

        "detected_skills": all_skills,
        "skills": all_skills,
        "technical_skills": technical_skills,
        "soft_skills": soft_skills,

        "strengths": strengths,
        "improvements": improvements,

        "recommended_job_roles": recommended_roles,

        "ats_breakdown": normalized_breakdown,

        "keyword_analysis": {
            "score": keyword_score,
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "keywords_to_add": keywords_to_add,
        },

        "missing_keywords": missing_keywords,
        "keywords_to_add": keywords_to_add,

        "experience_analysis": experience_analysis,
        "education_analysis": education_analysis,

        "projects_analysis": normalized_projects,

        "section_analysis": normalized_sections,

        "formatting": formatting,

        "improvement_plan": improvement_plan,

        "skill_gaps": skill_gaps,

        "achievement_suggestions": achievement_suggestions,

        "red_flags": red_flags,

        "grammar_issues": grammar_issues,

        "contact_information": contact_information,

        "career_recommendation": career_recommendation,

        "job_readiness": job_readiness,

        "resume_quality": resume_quality,
    }


# ============================================================
# ANALYZE RESUME
# ============================================================

def analyze_resume(
    resume_text: str
) -> Dict[str, Any]:
    """
    Perform detailed AI-powered resume analysis.
    """

    resume_text = validate_text(
        resume_text,
        "Resume text"
    )

    resume_text = resume_text[
        :MAX_RESUME_LENGTH
    ]

    prompt = f"""
You are an expert ATS resume evaluator,
technical recruiter, career coach, and hiring manager.

Analyze the following resume deeply.

RESUME:
{resume_text}

Your task is to produce a detailed, realistic,
actionable resume analysis.

IMPORTANT:
- Do not invent information.
- Do not assume experience that is not present.
- Identify weaknesses honestly.
- Treat internships and projects differently from
  professional work experience.
- Evaluate the resume for ATS systems and human recruiters.
- The candidate may be a student or fresher.
- Scores must be realistic.
- Return ONLY JSON.
- No Markdown.
- No text outside JSON.

Return this EXACT JSON structure:

{{
    "ats_score": 45,

    "summary": "Professional summary of the candidate and current resume quality.",

    "detected_skills": [
        "Python",
        "FastAPI",
        "React.js",
        "JavaScript",
        "SQL"
    ],

    "technical_skills": [
        "Python",
        "FastAPI",
        "React.js",
        "JavaScript",
        "HTML5",
        "CSS3",
        "SQL",
        "Git",
        "GitHub"
    ],

    "soft_skills": [
        "Problem Solving",
        "Communication"
    ],

    "ats_breakdown": {{
        "Keywords": {{
            "score": 55,
            "explanation": "Explain keyword quality."
        }},
        "Formatting": {{
            "score": 70,
            "explanation": "Explain ATS formatting."
        }},
        "Experience": {{
            "score": 35,
            "explanation": "Explain experience strength."
        }},
        "Projects": {{
            "score": 75,
            "explanation": "Explain project quality."
        }},
        "Education": {{
            "score": 80,
            "explanation": "Explain education."
        }},
        "Achievements": {{
            "score": 30,
            "explanation": "Explain measurable achievements."
        }}
    }},

    "keyword_analysis": {{
        "score": 60,
        "matched_keywords": [
            "Python",
            "FastAPI",
            "React"
        ],
        "missing_keywords": [
            "Docker",
            "REST API",
            "PostgreSQL"
        ],
        "keywords_to_add": [
            "RESTful APIs",
            "Unit Testing",
            "Docker"
        ]
    }},

    "strengths": [
        "Strong technical project portfolio",
        "Good frontend and backend foundation",
        "Relevant technologies for entry-level roles"
    ],

    "improvements": [
        "Add measurable achievements",
        "Improve professional summary",
        "Add relevant soft skills",
        "Strengthen project descriptions"
    ],

    "recommended_job_roles": [
        {{
            "role": "Full Stack Developer Intern",
            "description": "Explain why the candidate matches this role.",
            "match_score": 85
        }},
        {{
            "role": "Python Developer Intern",
            "description": "Explain the match.",
            "match_score": 82
        }},
        {{
            "role": "Frontend Developer Intern",
            "description": "Explain the match.",
            "match_score": 80
        }}
    ],

    "experience_analysis": {{
        "summary": "Analyze professional experience.",
        "experience_level": "Fresher",
        "professional_experience": false,
        "years_of_experience": 0,
        "feedback": [
            "Explain what should be improved."
        ]
    }},

    "education_analysis": {{
        "summary": "Analyze education section.",
        "strengths": [
            "Relevant degree"
        ],
        "improvements": [
            "Add expected graduation year if relevant."
        ]
    }},

    "projects_analysis": [
        {{
            "name": "Project name",
            "description": "Project evaluation.",
            "technologies": [
                "Python",
                "FastAPI"
            ],
            "strengths": [
                "Good technology selection"
            ],
            "improvements": [
                "Add measurable results"
            ]
        }}
    ],

    "section_analysis": {{
        "Professional Summary": {{
            "present": true,
            "score": 75,
            "feedback": "Evaluation."
        }},
        "Education": {{
            "present": true,
            "score": 80,
            "feedback": "Evaluation."
        }},
        "Skills": {{
            "present": true,
            "score": 85,
            "feedback": "Evaluation."
        }},
        "Experience": {{
            "present": false,
            "score": 30,
            "feedback": "Evaluation."
        }},
        "Projects": {{
            "present": true,
            "score": 80,
            "feedback": "Evaluation."
        }},
        "Certifications": {{
            "present": false,
            "score": 20,
            "feedback": "Evaluation."
        }}
    }},

    "formatting": {{
        "score": 75,
        "summary": "Overall formatting assessment.",
        "suggestions": [
            "Use consistent bullet formatting",
            "Keep section headings consistent"
        ]
    }},

    "skill_gaps": [
        "Docker",
        "Testing",
        "PostgreSQL"
    ],

    "achievement_suggestions": [
        "Add measurable impact to project descriptions",
        "Mention performance improvements where applicable"
    ],

    "red_flags": [
        "Limited professional experience",
        "Few measurable achievements"
    ],

    "grammar_issues": [
        "Review inconsistent capitalization"
    ],

    "contact_information": {{
        "email_present": true,
        "phone_present": true,
        "linkedin_present": true,
        "github_present": true,
        "portfolio_present": false
    }},

    "career_recommendation": "Detailed career recommendation for this candidate.",

    "job_readiness": 65,

    "resume_quality": 70,

    "improvement_plan": [
        "Add measurable achievements to projects",
        "Improve summary",
        "Add relevant keywords",
        "Add certifications",
        "Improve project descriptions"
    ]
}}

Scoring guidelines:

ATS SCORE:
0-30 = Very weak
31-50 = Needs major improvement
51-65 = Average
66-80 = Good
81-90 = Strong
91-100 = Excellent

Be realistic.

For a student/fresher:
- Do not penalize them excessively for lack of employment.
- Projects, technical skills, education and internships matter.
- Clearly distinguish projects from employment.

Analyze the actual resume instead of blindly following the example values.
"""

    try:

        data = generate_json_response(
            prompt,
            max_output_tokens=MAX_OUTPUT_TOKENS_ANALYSIS,
            temperature=0.1
        )

        if not isinstance(
            data,
            dict
        ):
            raise ValueError(
                "Resume analysis response is not an object."
            )

        return normalize_resume_analysis(
            data
        )

    except Exception as exc:

        print(
            f"Resume analysis failed: "
            f"{type(exc).__name__}: {exc}"
        )

        raise


# ============================================================
# MATCH RESUME WITH JOB
# ============================================================

def match_resume_with_job(
    resume_text: str,
    job_description: str
) -> Dict[str, Any]:
    """
    Match resume against a specific job description.
    """

    resume_text = validate_text(
        resume_text,
        "Resume text"
    )

    job_description = validate_text(
        job_description,
        "Job description"
    )

    resume_text = resume_text[
        :MAX_RESUME_LENGTH
    ]

    job_description = job_description[
        :MAX_JOB_DESCRIPTION_LENGTH
    ]

    prompt = f"""
You are an expert ATS recruiter.

Compare this resume with the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return ONLY valid JSON:

{{
    "match_score": 78,

    "summary": "Overall match explanation.",

    "matching_skills": [
        "Python",
        "FastAPI",
        "React"
    ],

    "missing_skills": [
        "Docker",
        "PostgreSQL"
    ],

    "matching_keywords": [
        "REST API",
        "Python"
    ],

    "missing_keywords": [
        "CI/CD"
    ],

    "strengths": [
        "Strong Python experience through projects"
    ],

    "gaps": [
        "No professional experience"
    ],

    "recommendations": [
        "Add Docker if genuinely known",
        "Highlight REST API work"
    ],

    "recommended": true
}}

Rules:
- Match score must be between 0 and 100.
- Do not invent skills.
- Do not claim professional experience if only projects exist.
- Return only JSON.
"""

    try:

        data = generate_json_response(
            prompt,
            max_output_tokens=MAX_OUTPUT_TOKENS_MATCH,
            temperature=0.1
        )

        if not isinstance(
            data,
            dict
        ):
            data = {}

        return {
            "match_score": normalize_score(
                data.get(
                    "match_score",
                    data.get(
                        "score",
                        0
                    )
                )
            ),

            "score": normalize_score(
                data.get(
                    "match_score",
                    data.get(
                        "score",
                        0
                    )
                )
            ),

            "summary": clean_text(
                data.get(
                    "summary",
                    ""
                )
            ),

            "matching_skills": clean_list(
                data.get(
                    "matching_skills",
                    []
                )
            ),

            "missing_skills": clean_list(
                data.get(
                    "missing_skills",
                    []
                )
            ),

            "matching_keywords": clean_list(
                data.get(
                    "matching_keywords",
                    []
                )
            ),

            "missing_keywords": clean_list(
                data.get(
                    "missing_keywords",
                    []
                )
            ),

            "strengths": clean_list(
                data.get(
                    "strengths",
                    []
                )
            ),

            "gaps": clean_list(
                data.get(
                    "gaps",
                    []
                )
            ),

            "recommendations": clean_list(
                data.get(
                    "recommendations",
                    []
                )
            ),

            "recommended": bool(
                data.get(
                    "recommended",
                    False
                )
            ),
        }

    except Exception as exc:

        print(
            f"Resume-job matching failed: "
            f"{type(exc).__name__}: {exc}"
        )

        raise


# ============================================================
# RECOMMEND JOBS FROM RESUME
# ============================================================

def recommend_jobs_from_resume(
    resume_text: str
) -> List[Dict[str, Any]]:
    """
    Generate suitable jobs from a resume.

    This function is required by:
        app.routers.jobs
    """

    resume_text = validate_text(
        resume_text,
        "Resume text"
    )

    resume_text = resume_text[
        :MAX_RESUME_LENGTH
    ]

    prompt = f"""
You are an expert technical recruiter.

Analyze this resume and recommend realistic
entry-level jobs and internships.

RESUME:
{resume_text}

Return ONLY valid JSON in this structure:

{{
    "jobs": [
        {{
            "title": "Full Stack Developer Intern",
            "description": "Explain why this role matches the resume.",
            "skills": [
                "Python",
                "FastAPI",
                "React"
            ],
            "match_score": 85
        }},
        {{
            "title": "Python Developer Intern",
            "description": "Explain why this role matches the resume.",
            "skills": [
                "Python",
                "FastAPI"
            ],
            "match_score": 82
        }},
        {{
            "title": "Frontend Developer Intern",
            "description": "Explain why this role matches the resume.",
            "skills": [
                "React",
                "JavaScript",
                "HTML",
                "CSS"
            ],
            "match_score": 80
        }}
    ]
}}

Rules:
- Recommend 5 suitable roles.
- Prefer internships and entry-level positions.
- Use skills actually found in the resume.
- Do not invent professional experience.
- match_score must be between 0 and 100.
- Return ONLY JSON.
"""

    try:

        data = generate_json_response(
            prompt,
            max_output_tokens=MAX_OUTPUT_TOKENS_JOBS,
            temperature=0.2
        )

        if not isinstance(
            data,
            dict
        ):
            return []

        raw_jobs = data.get(
            "jobs",
            []
        )

        if not isinstance(
            raw_jobs,
            list
        ):
            return []

        normalized_jobs = []

        for job in raw_jobs:

            if not isinstance(
                job,
                dict
            ):
                continue

            title = clean_text(
                job.get(
                    "title",
                    job.get(
                        "role",
                        "Recommended Job"
                    )
                )
            )

            description = clean_text(
                job.get(
                    "description",
                    job.get(
                        "reason",
                        ""
                    )
                )
            )

            skills = clean_list(
                job.get(
                    "skills",
                    []
                )
            )

            match_score = normalize_score(
                job.get(
                    "match_score",
                    job.get(
                        "score",
                        0
                    )
                )
            )

            if not title:
                continue

            normalized_jobs.append({
                "title": title,
                "description": description,
                "skills": skills,
                "match_score": match_score,
                "score": match_score,
            })

        return normalized_jobs

    except Exception as exc:

        print(
            f"Job recommendation failed: "
            f"{type(exc).__name__}: {exc}"
        )

        raise


# ============================================================
# OPTIONAL ALIAS
# ============================================================

def get_job_recommendations(
    resume_text: str
) -> List[Dict[str, Any]]:
    """
    Alias for compatibility with older code.
    """

    return recommend_jobs_from_resume(
        resume_text
    )


# ============================================================
# HEALTH CHECK
# ============================================================

def test_gemini_connection() -> Dict[str, Any]:
    """
    Simple Gemini connection test.
    """

    try:

        validate_ai_setup()

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents="Return only this JSON: {\"status\":\"ok\"}",
            config=types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=100,
                response_mime_type="application/json",
            ),
        )

        data = extract_json(
            response.text
        )

        return {
            "success": True,
            "model": MODEL_NAME,
            "response": data,
        }

    except Exception as exc:

        return {
            "success": False,
            "model": MODEL_NAME,
            "error": str(exc),
        }