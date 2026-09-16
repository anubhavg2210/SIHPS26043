"""
Semantic Consistency Validator for CivicSync Challenge Dossier Engine.
Ensures every field in a ChallengeDossier remains 100% semantically coherent
with the classified domain, subdomain, and problem type.
Prevents cross-domain contamination (e.g. pothole/asphalt items in street lighting).
"""

from typing import List, Dict, Any
from app.schemas.challenge import (
    ChallengeDossier,
    CauseHypothesis,
    VerificationPlan,
    DependencyItem,
    WorkPackage,
    SolutionApproach,
    ImpactPlan
)

FORBIDDEN_CONTAMINANTS: Dict[str, List[str]] = {
    "Street Lighting": [
        "pothole", "asphalt", "pavement", "roughness", "iri", "sub-grade", "cold mix",
        "soil", "crop", "water quality", "tds", "hospital", "drainage desilting", "sewage", "salinity"
    ],
    "Drinking Water Quality": [
        "street light", "pothole", "asphalt", "transformer", "crop", "pavement", "hospital queue", "pole"
    ],
    "Groundwater": [
        "street light", "pothole", "asphalt", "transformer", "hospital queue", "pole"
    ],
    "Roads & Potholes": [
        "street light", "water quality", "tds", "bacteriological", "hospital queue", "crop", "feeder pillar", "luminaire"
    ],
    "Public Drainage": [
        "street light", "asphalt patching", "drinking water test", "hospital queue", "pole"
    ],
    "School Infrastructure": [
        "pothole", "street light", "asphalt", "water quality test", "transformer"
    ],
    "Hospital Services": [
        "street light", "pothole", "asphalt", "drainage desilting", "soil test"
    ],
    "Medicine Availability": [
        "street light", "pothole", "asphalt", "water quality test"
    ],
    "Irrigation Systems": [
        "street light", "pothole", "asphalt", "hospital queue"
    ],
    "Soil Quality": [
        "street light", "pothole", "asphalt", "hospital queue"
    ],
    "Power Grid & Transformers": [
        "pothole", "asphalt", "water test", "hospital queue"
    ],
    "Solid Waste Management": [
        "street light", "pothole", "asphalt", "water test"
    ],
    "Air Pollution": [
        "street light", "pothole", "asphalt", "water test"
    ]
}


def is_contaminated(text: str, subdomain: str) -> bool:
    """Checks if a string contains forbidden cross-domain terms for the active subdomain."""
    if not text or subdomain not in FORBIDDEN_CONTAMINANTS:
        return False

    text_lower = text.lower()
    for forbidden in FORBIDDEN_CONTAMINANTS[subdomain]:
        if forbidden in text_lower:
            return True
    return False


def validate_and_sanitize_dossier(dossier: ChallengeDossier) -> ChallengeDossier:
    """
    Scans dossier fields and removes/replaces any items that violate semantic consistency.
    """
    subdomain = dossier.problem.subdomain

    # 1. Sanitize Cause Hypotheses
    clean_causes: List[CauseHypothesis] = []
    for c in dossier.causes:
        if not is_contaminated(c.cause, subdomain) and not is_contaminated(c.reason, subdomain):
            clean_causes.append(c)

    if not clean_causes and dossier.causes:
        # Fallback to a clean generic hypothesis for this subdomain
        clean_causes.append(
            CauseHypothesis(
                cause=f"{subdomain} operational failure",
                status="hypothesis",
                reason=f"Localized operational or structural failure in {subdomain.lower()} hardware",
                verification_needed=True
            )
        )
    dossier.causes = clean_causes

    # 2. Sanitize Verification Plan Tasks & Measurements
    clean_tasks = [t for t in dossier.verification_plan.tasks if not is_contaminated(t, subdomain)]
    clean_measurements = [m for m in dossier.verification_plan.measurements if not is_contaminated(m, subdomain)]
    dossier.verification_plan.tasks = clean_tasks
    dossier.verification_plan.measurements = clean_measurements

    # 3. Sanitize Dependencies
    clean_deps = [d for d in dossier.dependencies if not is_contaminated(d.name, subdomain) and not is_contaminated(d.why_required, subdomain)]
    dossier.dependencies = clean_deps

    # 4. Sanitize Solution Approaches
    clean_solutions = []
    for sol in dossier.solution_approaches:
        if not is_contaminated(sol.name, subdomain) and not is_contaminated(sol.description, subdomain) and not is_contaminated(sol.why_it_may_fit, subdomain):
            clean_solutions.append(sol)
    dossier.solution_approaches = clean_solutions

    # 5. Sanitize Impact KPIs & Evidence Sources
    clean_kpis = [k for k in dossier.impact_plan.kpis if not is_contaminated(k, subdomain)]
    clean_baselines = [b for b in dossier.impact_plan.baseline if not is_contaminated(b, subdomain)]
    clean_targets = [t for t in dossier.impact_plan.target if not is_contaminated(t, subdomain)]
    dossier.impact_plan.kpis = clean_kpis
    dossier.impact_plan.baseline = clean_baselines
    dossier.impact_plan.target = clean_targets

    return dossier
