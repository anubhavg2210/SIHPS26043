from fastapi import APIRouter

from app.schemas.challenge import (
    ChallengeInput,
    ChallengeAnalysis
)
from app.services.dossier_engine import (
    generate_challenge_dossier
)

router = APIRouter()


@router.post(
    "/analyze",
    response_model=ChallengeAnalysis
)
async def analyze(
    challenge: ChallengeInput
):
    """
    Transforms a natural-language citizen challenge into an Actionable Challenge Dossier.
    """
    return generate_challenge_dossier(challenge)