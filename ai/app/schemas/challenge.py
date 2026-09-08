from pydantic import BaseModel, Field
from typing import List


class ChallengeInput(BaseModel):
    title: str
    description: str
    district: str | None = None
    affected_people: int | None = None


class ChallengeAnalysis(BaseModel):
    domain: str
    subdomain: str
    problem_type: str
    summary: str

    severity: int = Field(ge=1, le=10)
    urgency: int = Field(ge=1, le=10)

    required_expertise: List[str]
    keywords: List[str]

    confidence: float = Field(ge=0, le=1)