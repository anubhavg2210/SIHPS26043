from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ChallengeInput(BaseModel):
    title: str
    description: str
    district: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    affected_people: Optional[int] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None


class ReportModel(BaseModel):
    raw_text: str
    language: str
    location: Dict[str, Any] = Field(default_factory=dict)
    provided_affected_people: Optional[int] = None
    provided_urgency: Optional[int] = None
    evidence: List[str] = Field(default_factory=list)


class ProblemModel(BaseModel):
    title: str
    summary: str
    domain: str
    subdomain: str
    problem_type: str
    reported_symptoms: List[str] = Field(default_factory=list)
    reported_impacts: List[str] = Field(default_factory=list)
    entities: List[str] = Field(default_factory=list)


class AssessmentModel(BaseModel):
    severity: int = Field(ge=1, le=10)
    urgency: str  # "Low" | "Medium" | "High" | "Critical"
    urgency_score: int = Field(ge=1, le=10)
    affected_population: Dict[str, Any] = Field(default_factory=dict)
    geographic_scope: str = "Local"
    evidence_quality: str = "Citizen Statement"


class CauseHypothesis(BaseModel):
    cause: str
    status: str = "hypothesis"  # Explicitly marked as hypothesis
    reason: str
    verification_needed: bool = True


class VerificationPlan(BaseModel):
    field_work_required: bool = True
    tasks: List[str] = Field(default_factory=list)
    required_evidence: List[str] = Field(default_factory=list)
    measurements: List[str] = Field(default_factory=list)
    documents_or_data: List[str] = Field(default_factory=list)


class DependencyItem(BaseModel):
    name: str
    type: str  # DATA | INFRASTRUCTURE | FACILITY | AUTHORITY | APPROVAL | PROCUREMENT | PARTNER | EXPERTISE | EXTERNAL_SERVICE | COMMUNITY | SAFETY | MEASUREMENT
    why_required: str
    work_package: Optional[str] = None
    status: str = "known"
    source: Optional[str] = None


class RequiredCapability(BaseModel):
    capability: str
    reason: str
    priority: str = "essential"  # essential | recommended


class WorkPackage(BaseModel):
    id: str
    name: str
    objective: str
    tasks: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    required_capabilities: List[str] = Field(default_factory=list)
    deliverables: List[str] = Field(default_factory=list)
    verification_status: str = "pending"


class SolutionApproach(BaseModel):
    name: str
    description: str
    why_it_may_fit: str
    required_capabilities: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    effort: str = "medium"  # low | medium | high | unknown
    evidence_needed: List[str] = Field(default_factory=list)


class ImplementationPlan(BaseModel):
    prerequisites: List[str] = Field(default_factory=list)
    approvals: List[str] = Field(default_factory=list)
    procurement_or_partner_dependencies: List[str] = Field(default_factory=list)
    deployment_steps: List[str] = Field(default_factory=list)


class ImpactPlan(BaseModel):
    baseline: List[str] = Field(default_factory=list)
    target: List[str] = Field(default_factory=list)
    kpis: List[str] = Field(default_factory=list)
    measurement_methods: List[str] = Field(default_factory=list)
    evidence_sources: List[str] = Field(default_factory=list)


class QualityModel(BaseModel):
    classification_confidence: float = 0.8
    cause_confidence: float = 0.7
    challenge_confidence: float = 0.8
    overall_confidence: float = 0.8
    requires_human_review: bool = False
    review_reasons: List[str] = Field(default_factory=list)


class ChallengeDossier(BaseModel):
    report: ReportModel
    problem: ProblemModel
    assessment: AssessmentModel
    causes: List[CauseHypothesis] = Field(default_factory=list)
    verification_plan: VerificationPlan
    dependencies: List[DependencyItem] = Field(default_factory=list)
    required_capabilities: List[RequiredCapability] = Field(default_factory=list)
    work_packages: List[WorkPackage] = Field(default_factory=list)
    solution_approaches: List[SolutionApproach] = Field(default_factory=list)
    implementation_plan: ImplementationPlan
    impact_plan: ImpactPlan
    quality: QualityModel


# Expanded Response Model combining legacy fields and rich Dossier
class ChallengeAnalysis(BaseModel):
    # PRESERVED LEGACY FIELDS FOR BACKWARD COMPATIBILITY
    domain: str
    subdomain: str
    problem_type: str
    summary: str
    severity: int = Field(ge=1, le=10)
    urgency: int = Field(ge=1, le=10)
    required_expertise: List[str]
    keywords: List[str]
    confidence: float = Field(ge=0, le=1)

    # RICH ACTIONABLE CHALLENGE DOSSIER
    dossier: ChallengeDossier