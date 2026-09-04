from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class ResumeResponse(BaseModel):
    id: int
    filename: str
    resume_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AnalysisResponse(BaseModel):
    id: int
    filename: str
    analysis: Optional[dict | str] = None
