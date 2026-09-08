from fastapi import APIRouter

from app.schemas.challenge import (
    ChallengeInput,
    ChallengeAnalysis
)

from app.services.classifier import (
    analyze_challenge
)


router = APIRouter()


@router.post(
    "/analyze",
    response_model=ChallengeAnalysis
)
async def analyze(
    challenge: ChallengeInput
):

    return analyze_challenge(challenge)