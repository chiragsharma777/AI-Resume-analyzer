import os
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# AI CONFIGURATION
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MODEL_NAME = os.getenv(
    "MODEL_NAME",
    "gemini-3.5-flash"
)

# =========================================================
# DATABASE CONFIGURATION
# =========================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./resume_ai.db"
)

# =========================================================
# JWT AUTHENTICATION
# =========================================================

JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "change-this-secret-key-in-production"
)

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "60"
    )
)

# =========================================================
# APPLICATION CONFIGURATION
# =========================================================

APP_NAME = os.getenv(
    "APP_NAME",
    "ResumeAI"
)

DEBUG = os.getenv(
    "DEBUG",
    "True"
).lower() == "true"


# =========================================================
# STARTUP INFORMATION
# =========================================================

print("=" * 40)
print("AI PROVIDER: Google Gemini")
print(f"AI MODEL: {MODEL_NAME}")
print(f"API KEY FOUND: {bool(GEMINI_API_KEY)}")
print("=" * 40)