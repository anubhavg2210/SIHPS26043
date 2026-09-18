import json
import os
import re
from typing import Dict, Any, List, Tuple
from app.schemas.challenge import (
    ChallengeInput,
    ChallengeAnalysis,
    ChallengeDossier,
    ReportModel,
    ProblemModel,
    AssessmentModel,
    CauseHypothesis,
    VerificationPlan,
    DependencyItem,
    RequiredCapability,
    WorkPackage,
    SolutionApproach,
    ImplementationPlan,
    ImpactPlan,
    QualityModel
)
from app.services.dossier_validator import validate_and_sanitize_dossier

# Load Knowledge Base Directory
KNOWLEDGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge"))

def load_json_knowledge(filename: str) -> Dict[str, Any]:
    filepath = os.path.join(KNOWLEDGE_DIR, filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
    else:
        print(f"Knowledge file not found: {filepath}")
    return {}

TAXONOMY = load_json_knowledge("taxonomy.json").get("domains", {})
CAUSE_PATTERNS = load_json_knowledge("cause_patterns.json").get("cause_patterns", {})
VERIFICATION_PATTERNS = load_json_knowledge("verification_patterns.json").get("verification_patterns", {})
DEPENDENCY_PATTERNS = load_json_knowledge("dependency_patterns.json").get("dependency_patterns", {})
WORK_PACKAGES = load_json_knowledge("work_package_patterns.json").get("work_package_patterns", {}).get("default_packages", [])
SOLUTION_PATTERNS = load_json_knowledge("solution_patterns.json").get("solution_patterns", {})
IMPACT_PATTERNS = load_json_knowledge("impact_patterns.json").get("impact_patterns", {})


def normalize_text(text: str) -> str:
    """Lowercases text while keeping Hindi Devanagari Unicode intact."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def detect_language(text: str) -> str:
    """Detects if text contains Devanagari script, English, or Hinglish."""
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    hinglish_markers = ["hai", "ho", "rahe", "nahi", "par", "ko", "se", "aur", "ki", "ka", "ke", "mein", "gali", "paani", "sadak"]
    words = text.lower().split()
    if any(w in words for w in hinglish_markers):
        return "hinglish"
    return "en"


def classify_problem_domain(text: str) -> Tuple[str, str, str, float]:
    """
    Generalized domain & subdomain classifier using phrase-weighted scoring
    across English, Hindi Devanagari, and Hinglish.
    """
    text_norm = normalize_text(text)

    domain_taxonomy = {
        "Urban Infrastructure": {
            "general_kws": ["infrastructure", "public works", "ward", "colony", "mohalla", "सड़क", "लाइट", "नाली", "पुल"],
            "subdomains": {
                "Street Lighting": {
                    "phrases": ["street light", "street lights", "gali ki light", "gali light", "streetlamp", "light band", "light nahi", "dark road", "street lighting", "लाइट बंद", "बत्तियां बंद", "लाइटें", "streetlights", "light dim", "dim light", "pole hai but light dim", "strit lite", "street lite", "andhera"],
                    "keywords": ["lamp", "lighting", "unlit", "luminaire", "pole"]
                },
                "Roads & Potholes": {
                    "phrases": ["pothole", "potholes", "broken road", "damaged road", "road damage", "gaddha", "gaddhe", "asphalt", "pavement", "गड्ढा", "गड्ढे", "सड़क की खराबी", "slippery surface", "slippery road"],
                    "keywords": ["pothole", "potholes", "gaddha", "gaddhe", "pavement", "bitumen", "slippery"]
                },
                "Public Drainage": {
                    "phrases": ["drain overflow", "drainage overflow", "naali overflow", "ganda paani sadak", "waterlogging", "blocked drain", "नाली ओवरफ्लो", "जलभराव"],
                    "keywords": ["drain", "drainage", "naali", "sewerage", "culvert"]
                },
                "Building Maintenance": {
                    "phrases": ["anganwadi building", "ventilation", "roof leak", "roof damaged", "chhat damaged", "community centre roof", "building maintenance", "exhaust fan", "ceiling leak"],
                    "keywords": ["anganwadi", "ventilation", "roof", "ceiling", "chhat", "building"]
                },
                "Public Facilities": {
                    "phrases": ["public facility", "park maintenance", "public bench", "community hall"],
                    "keywords": ["facility", "park", "bench"]
                }
            }
        },
        "Water & Sanitation": {
            "general_kws": ["water", "paani", "pani", "पानी", "जल", "pipe"],
            "subdomains": {
                "Groundwater": {
                    "phrases": ["borewell", "groundwater", "handpump", "well water", "kuwa", "कुआं", "handpump metallic taste", "metallic taste"],
                    "keywords": ["borewell", "handpump", "well"]
                },
                "Drinking Water Quality": {
                    "phrases": ["dirty water", "yellow water", "bad smell", "smell in water", "water quality", "ganda paani", "peela paani", "badboo", "badbu", "दुर्गंध", "गंदा पानी", "drinking water", "school me drinking water", "water available nahi", "panhi", "peene layak nahi"],
                    "keywords": ["yellow", "turbid", "odor", "smell", "ganda", "metallic", "badbu"]
                },
                "Sanitation & Sewerage": {
                    "phrases": ["sewer ka paani", "sewer water", "public toilet", "sewer line", "shauchalay", "toilet block", "शौचालय", "sewage leak", "usable condition me nahi", "drain cover missing", "drain cover", "सीवर", "सीवर का पानी"],
                    "keywords": ["toilet", "shauchalay", "sewer", "cover", "सीवर"]
                }
            }
        },
        "Agriculture": {
            "general_kws": ["farmer", "kisan", "crop", "fasal", "किसान", "फसल"],
            "subdomains": {
                "Irrigation Systems": {
                    "phrases": ["irrigation", "sinchai", "canal water", "water canal", "pump for field", "सिंचाई", "khet tak canal", "canal ka paani"],
                    "keywords": ["irrigation", "sinchai", "canal"]
                },
                "Soil Quality": {
                    "phrases": ["soil quality", "soil salinity", "mitti", "saline soil", "fertility", "मिट्टी"],
                    "keywords": ["soil", "mitti", "saline"]
                },
                "Crop Health": {
                    "phrases": ["crop damage", "fasal", "pest attack", "diseased crop", "फसल"],
                    "keywords": ["crop", "crops", "fasal", "pest"]
                }
            }
        },
        "Healthcare": {
            "general_kws": ["health", "hospital", "doctor", "medicine", "अस्पताल"],
            "subdomains": {
                "Hospital Services": {
                    "phrases": ["hospital queue", "opd queue", "doctor not available", "hospital doctor", "doctor delay", "अस्पताल queue", "crowded hospital", "primary health centre", "waiting time bahut"],
                    "keywords": ["hospital", "doctor", "opd", "waiting"]
                },
                "Medicine Availability": {
                    "phrases": ["medicine shortage", "dawai nahi", "stockout", "pharmacy stock", "दवाई khatam", "medicine availability"],
                    "keywords": ["medicine", "medicines", "drug", "dawai"]
                }
            }
        },
        "Environment": {
            "general_kws": ["environment", "pollution", "kachra", "कचरा", "प्रदूषण"],
            "subdomains": {
                "Solid Waste Management": {
                    "phrases": ["garbage dump", "kachra dump", "waste dump", "uncollected garbage", "कचरा", "market me kachra", "jaanwar fail"],
                    "keywords": ["garbage", "kachra", "waste", "jaanwar"]
                },
                "Air Pollution": {
                    "phrases": ["chemical smell", "air pollution", "dust pollution", "smoke", "saans lene me", "प्रदूषण", "factory ke paas se dhuan", "factory smoke", "dhuan आता hai"],
                    "keywords": ["smoke", "smell", "dust", "air", "dhuan"]
                }
            }
        },
        "Energy": {
            "general_kws": ["energy", "electricity", "power", "bijli", "बिजली"],
            "subdomains": {
                "Power Grid & Transformers": {
                    "phrases": ["transformer", "power outage", "bijli band", "short circuit", "voltage fluctuation", "बिजली बंद", "feeder failure", "transformer bar bar trip", "trip karta hai"],
                    "keywords": ["transformer", "voltage", "feeder", "wire", "trip"]
                }
            }
        },
        "Education": {
            "general_kws": ["school", "college", "student", "teacher", "स्कूल"],
            "subdomains": {
                "School Infrastructure": {
                    "phrases": ["school roof", "classroom roof", "roof leak", "chhat से paani", "school toilet", "स्कूल छत"],
                    "keywords": ["school", "roof", "classroom"]
                }
            }
        },
        "Governance & Public Services": {
            "general_kws": ["governance", "public service", "municipal", "traffic"],
            "subdomains": {
                "Traffic Management": {
                    "phrases": ["traffic signal", "crossing par traffic signal", "signal kaam nahi karta", "traffic light malfunction", "signal light", "ट्रैफ़िक सिग्नल", "ट्रैफ़िक"],
                    "keywords": ["signal", "traffic", "crossing", "ट्रैफ़िक"]
                },
                "Digital & Connectivity": {
                    "phrases": ["mobile network", "network weak", "mobile signal", "signal weak", "connectivity problem", "network problem"],
                    "keywords": ["network", "mobile", "connectivity", "signal"]
                },
                "Urban Accessibility": {
                    "phrases": ["bus stop wheelchair", "wheelchair ke liye", "ramp nahi hai", "wheelchair ramp", "handicap access"],
                    "keywords": ["wheelchair", "bus stop", "ramp", "accessibility"]
                }
            }
        }
    }

    subdomain_scores = {}
    domain_map = {}

    for dom, data in domain_taxonomy.items():
        for sub, sub_data in data["subdomains"].items():
            score = 0
            for phrase in sub_data.get("phrases", []):
                if normalize_text(phrase) in text_norm:
                    score += 10

            for kw in sub_data.get("keywords", []):
                if normalize_text(kw) in text_norm:
                    score += 3

            for gen_kw in data.get("general_kws", []):
                if normalize_text(gen_kw) in text_norm:
                    score += 1

            subdomain_scores[sub] = score
            domain_map[sub] = dom

    best_subdomain = max(subdomain_scores, key=subdomain_scores.get)
    best_score = subdomain_scores[best_subdomain]

    if best_score <= 2:
        return "Environment", "Air Pollution", "Unclassified Environmental Complaint", 0.45

    best_domain = domain_map[best_subdomain]
    problem_type = f"{best_subdomain} Maintenance / Service Challenge"
    confidence = min(0.65 + (best_score * 0.05), 0.95)

    return best_domain, best_subdomain, problem_type, round(confidence, 2)


def extract_facts_and_impacts(text: str) -> Tuple[List[str], List[str], List[str]]:
    """Extracts explicit reported facts, impacts, and symptoms from text."""
    text_norm = normalize_text(text)

    facts = []
    impacts = []
    symptoms = []

    # Street Light Patterns
    if any(w in text_norm for w in ["street light", "street lights", "light band", "not working", "lights nahi", "लाइट बंद", "बत्तियां बंद", "light dim"]):
        facts.append("Street lights reported non-functional or dim")
        symptoms.append("Non-functional or inadequate street lighting")

    if any(w in text_norm for w in ["dark", "andhera", "darkness", "अंधेरा"]):
        facts.append("Road reported dark at night")
        symptoms.append("Poor nighttime visibility")

    if any(w in text_norm for w in ["accident", "accidents", "crash", "दुर्घटना"]):
        facts.append("Road accidents reported")
        impacts.append("Road safety risk & accident exposure")

    # Water Quality Patterns
    if any(w in text_norm for w in ["yellow", "peela", "पीला"]):
        facts.append("Water reported yellow in color")
        symptoms.append("Discolored water (yellowish turbidity)")

    if any(w in text_norm for w in ["metallic taste", "taste"]):
        facts.append("Water reported to have metallic taste")
        symptoms.append("Unpalatable metallic taste in drinking water")

    if any(w in text_norm for w in ["smell", "bad smell", "odour", "दुर्गंध", "badboo"]):
        facts.append("Unusual odor reported in water/environment")
        symptoms.append("Foul odor")

    if any(w in text_norm for w in ["handpump", "borewell", "well"]):
        facts.append("Source reported as handpump/borewell")

    if any(w in text_norm for w in ["sewer", "sewerage", "shauchalay", "toilet"]):
        facts.append("Sewer line or public toilet issue reported")

    if any(w in text_norm for w in ["traffic signal", "crossing"]):
        facts.append("Traffic signal reported malfunctioning at intersection")

    if any(w in text_norm for w in ["wheelchair", "ramp"]):
        facts.append("Bus stop reported lacking wheelchair ramp access")

    if any(w in text_norm for w in ["illness", "disease", "bimari", "sick", "बीमारी"]):
        facts.append("Health symptoms reported by community")
        impacts.append("Public health exposure risk")

    # Generic Fallbacks
    if not facts:
        facts.append("Civic issue reported by citizen")
    if not symptoms:
        symptoms.append("Observed service disruption")
    if not impacts:
        impacts.append("Community inconvenience")

    return facts, symptoms, impacts


def calculate_severity_and_urgency(text: str, provided_urgency: int = None, affected_people: int = None) -> Tuple[int, str, int]:
    """Calculates severity (1-10) and urgency level."""
    text_norm = normalize_text(text)

    severity = 5
    urgency_score = 5

    urgent_words = ["death", "dead", "accident", "accidents", "danger", "critical", "emergency", "immediate", "khatra", "खतरा", "दुर्घटना", "trip"]
    severe_words = ["illness", "disease", "contamination", "overflow", "dark", "no water", "no power", "bimari", "पानी नहीं"]

    for w in urgent_words:
        if w in text_norm:
            urgency_score += 2
            severity += 1

    for w in severe_words:
        if w in text_norm:
            severity += 2
            urgency_score += 1

    if affected_people and affected_people > 500:
        severity += 1
        urgency_score += 1

    severity = max(1, min(severity, 10))
    urgency_score = max(1, min(urgency_score, 10))

    if urgency_score >= 8:
        urgency_label = "Critical"
    elif urgency_score >= 6:
        urgency_label = "High"
    elif urgency_score >= 4:
        urgency_label = "Medium"
    else:
        urgency_label = "Low"

    return severity, urgency_label, urgency_score


def generate_challenge_dossier(challenge: ChallengeInput) -> ChallengeAnalysis:
    """
    Main Generalized Decomposition Pipeline transforming raw text into an
    Actionable Challenge Dossier.
    """
    raw_text = f"{challenge.title or ''} {challenge.description or ''}".strip()
    if not raw_text:
        raw_text = "Unspecified civic complaint"

    lang = detect_language(raw_text)

    # Step 1: Domain Classification
    domain, subdomain, problem_type, confidence = classify_problem_domain(raw_text)

    # Step 2: Extract Facts, Symptoms, Impacts
    facts, symptoms, impacts = extract_facts_and_impacts(raw_text)

    # Step 3: Priority & Severity Assessment
    severity, urgency_label, urgency_score = calculate_severity_and_urgency(
        raw_text, getattr(challenge, 'provided_urgency', None), challenge.affected_people
    )

    # Step 4: Cause Hypotheses Generation (Strictly locked to Subdomain, status = "hypothesis")
    raw_causes = CAUSE_PATTERNS.get(subdomain, CAUSE_PATTERNS.get("Generic", []))
    causes = [
        CauseHypothesis(
            cause=c["cause"],
            status="hypothesis",
            reason=c["reason"],
            verification_needed=True
        )
        for c in raw_causes[:5]
    ]

    # Step 5: Verification & Field Work Plan (Strictly locked to Subdomain)
    raw_verif = VERIFICATION_PATTERNS.get(subdomain, VERIFICATION_PATTERNS.get("Generic", {}))
    verification_plan = VerificationPlan(
        field_work_required=raw_verif.get("field_work_required", True),
        tasks=raw_verif.get("tasks", ["Conduct physical site inspection", "Capture geotagged photos"]),
        required_evidence=raw_verif.get("required_evidence", ["Field inspection report", "Geotagged photos"]),
        measurements=raw_verif.get("measurements", ["Field observation log"]),
        documents_or_data=raw_verif.get("documents_or_data", ["Local maintenance log"])
    )

    # Step 6: Operational Dependencies (Strictly locked to Subdomain)
    raw_deps = DEPENDENCY_PATTERNS.get(subdomain, DEPENDENCY_PATTERNS.get("Generic", []))
    dependencies = [
        DependencyItem(
            name=d["name"],
            type=d["type"],
            why_required=d["why_required"],
            status=d.get("status", "known"),
            source=d.get("source", "Municipal Records")
        )
        for d in raw_deps[:5]
    ]

    # Step 7: Required Capabilities (Strictly locked to Subdomain)
    subdomain_caps = TAXONOMY.get(domain, {}).get("subdomains", {}).get(subdomain, {}).get("capabilities", ["Civil Engineering", "Municipal Operations"])
    required_capabilities = [
        RequiredCapability(capability=cap, reason=f"Required for {subdomain} resolution", priority="essential" if idx < 2 else "recommended")
        for idx, cap in enumerate(subdomain_caps[:5])
    ]

    # Step 8: Work Package Decomposition
    work_packages = [
        WorkPackage(
            id=wp["id"],
            name=wp["name"],
            objective=wp["objective"],
            tasks=wp["tasks"],
            dependencies=wp["dependencies"],
            deliverables=wp["deliverables"],
            verification_status="pending"
        )
        for wp in WORK_PACKAGES
    ]

    # Step 9: Solution Approaches Generation (Strictly locked to Subdomain)
    raw_solutions = SOLUTION_PATTERNS.get(subdomain, SOLUTION_PATTERNS.get("Generic", []))
    solution_approaches = [
        SolutionApproach(
            name=s["name"],
            description=s["description"],
            why_it_may_fit=s["why_it_may_fit"],
            required_capabilities=s["required_capabilities"],
            dependencies=s["dependencies"],
            risks=s["risks"],
            effort=s["effort"],
            evidence_needed=s["evidence_needed"]
        )
        for s in raw_solutions[:4]
    ]

    # Step 10: Implementation Prerequisites
    implementation_plan = ImplementationPlan(
        prerequisites=["Field verification audit completion", "Technical cause confirmation"],
        approvals=["Municipal / Competent Authority sanction"],
        procurement_or_partner_dependencies=["Contractor / Institution assignment"],
        deployment_steps=["Deploy technical crew to site", "Execute work packages WP-01 to WP-04", "Commission restored infrastructure"]
    )

    # Step 11: Impact & KPI Plan (Strictly locked to Subdomain)
    raw_impact = IMPACT_PATTERNS.get(subdomain, IMPACT_PATTERNS.get("Generic", {}))
    impact_plan = ImpactPlan(
        baseline=raw_impact.get("baseline", ["Verified pre-intervention symptom state"]),
        target=raw_impact.get("target", ["Full functional restoration of service"]),
        kpis=raw_impact.get("kpis", ["Service Uptime (%)", "Response Time (hours)"]),
        measurement_methods=raw_impact.get("measurement_methods", ["Post-repair audit"]),
        evidence_sources=raw_impact.get("evidence_sources", ["Completion Certificate", "Field Inspection Log"])
    )

    # Step 12: Quality & Confidence Assessment
    requires_human_review = confidence < 0.65 or lang == "unknown" or "dhund" in raw_text.lower()
    review_reasons = []
    if confidence < 0.65:
        review_reasons.append("Low automated classification confidence; human domain review recommended")
    if "dhund" in raw_text.lower():
        review_reasons.append("Ambiguous environmental complaint text; site inspection recommended")

    quality = QualityModel(
        classification_confidence=confidence,
        cause_confidence=round(confidence * 0.9, 2),
        challenge_confidence=confidence,
        overall_confidence=confidence,
        requires_human_review=requires_human_review,
        review_reasons=review_reasons
    )

    # Build Raw Dossier Object
    desc_clean = challenge.description.strip() if challenge.description else ""
    desc_snippet = (desc_clean[:197] + "...") if len(desc_clean) > 200 else desc_clean
    title_clean = challenge.title.strip() if challenge.title else "Civic Challenge"
    synthesized_summary = f"[{domain} - {subdomain}] {title_clean}: {desc_snippet}" if desc_snippet else f"Actionable societal challenge regarding {subdomain.lower()} in {challenge.district or 'the reported area'}."

    dossier = ChallengeDossier(
        report=ReportModel(
            raw_text=raw_text,
            language=lang,
            location={"district": challenge.district, "city": challenge.city, "address": challenge.address},
            provided_affected_people=challenge.affected_people,
            provided_urgency=urgency_score,
            evidence=facts
        ),
        problem=ProblemModel(
            title=challenge.title or "Societal Challenge",
            summary=synthesized_summary,
            domain=domain,
            subdomain=subdomain,
            problem_type=problem_type,
            reported_symptoms=symptoms,
            reported_impacts=impacts,
            entities=[e for e in [challenge.district, challenge.city] if e]
        ),
        assessment=AssessmentModel(
            severity=severity,
            urgency=urgency_label,
            urgency_score=urgency_score,
            affected_population={"value": challenge.affected_people, "basis": "user_input" if challenge.affected_people else "unknown"},
            geographic_scope="Local / Ward Level",
            evidence_quality="Citizen Statement (Needs Verification)"
        ),
        causes=causes,
        verification_plan=verification_plan,
        dependencies=dependencies,
        required_capabilities=required_capabilities,
        work_packages=work_packages,
        solution_approaches=solution_approaches,
        implementation_plan=implementation_plan,
        impact_plan=impact_plan,
        quality=quality
    )

    # Step 13: Cross-Consistency Semantic Validation & Sanitization
    dossier = validate_and_sanitize_dossier(dossier)

    # Return Combined Legacy + Dossier Object
    return ChallengeAnalysis(
        domain=domain,
        subdomain=subdomain,
        problem_type=problem_type,
        summary=dossier.problem.summary,
        severity=severity,
        urgency=urgency_score,
        required_expertise=[c.capability for c in required_capabilities],
        keywords=symptoms + facts,
        confidence=confidence,
        dossier=dossier
    )
