import re

from app.schemas.challenge import (
    ChallengeInput,
    ChallengeAnalysis
)


DOMAIN_RULES = {

    "Water": {
        "keywords": [
            "water",
            "paani",
            "पानी",
            "borewell",
            "bore well",
            "groundwater",
            "underground water",
            "drinking water",
            "जल",
            "नल",
            "तालाब",
            "pond",
            "river",
            "नदी"
        ],

        "expertise": [
            "Water Quality",
            "Water Treatment",
            "Groundwater",
            "Environmental Engineering"
        ]
    },


    "Agriculture": {
        "keywords": [
            "agriculture",
            "agri",
            "farmer",
            "farmers",
            "kisan",
            "किसान",
            "farming",
            "crop",
            "crops",
            "fasal",
            "फसल",
            "irrigation",
            "sinchai",
            "सिंचाई",
            "soil",
            "मिट्टी",
            "fertilizer",
            "खाद"
        ],

        "expertise": [
            "Agriculture",
            "Irrigation",
            "Crop Management",
            "Remote Sensing and GIS"
        ]
    },


    "Healthcare": {
        "keywords": [
            "health",
            "healthcare",
            "hospital",
            "doctor",
            "medicine",
            "medical",
            "patient",
            "रोगी",
            "अस्पताल",
            "डॉक्टर",
            "दवाई",
            "स्वास्थ्य",
            "treatment",
            "ambulance"
        ],

        "expertise": [
            "Healthcare",
            "Medical Technology"
        ]
    },


    "Education": {
        "keywords": [
            "education",
            "school",
            "college",
            "student",
            "students",
            "teacher",
            "learning",
            "padhai",
            "पढ़ाई",
            "schooling",
            "शिक्षा",
            "विद्यालय",
            "छात्र"
        ],

        "expertise": [
            "Machine Learning",
            "Artificial Intelligence"
        ]
    },


    "Environment": {
        "keywords": [
            "pollution",
            "polluted",
            "environment",
            "waste",
            "garbage",
            "kachra",
            "कचरा",
            "air pollution",
            "water pollution",
            "solid waste",
            "plastic",
            "plastics",
            "पर्यावरण",
            "प्रदूषण"
        ],

        "expertise": [
            "Environmental Engineering",
            "Wastewater Treatment",
            "Water Quality"
        ]
    },


    "Energy": {
        "keywords": [
            "energy",
            "electricity",
            "solar",
            "solar panel",
            "power",
            "bijli",
            "बिजली",
            "renewable energy",
            "सौर"
        ],

        "expertise": [
            "Renewable Energy"
        ]
    },


    "Infrastructure": {
        "keywords": [
            "road",
            "roads",
            "bridge",
            "drainage",
            "street",
            "building",
            "infrastructure",
            "sadak",
            "सड़क",
            "नाली",
            "पुल"
        ],

        "expertise": [
            "Civil Engineering"
        ]
    }
}


def normalize_text(text: str) -> str:
    """
    Normalize English/Hinglish text while keeping
    Hindi Unicode characters intact.
    """

    text = text.lower()
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def calculate_priority(text: str):

    urgent_words = [
        "death",
        "dead",
        "danger",
        "dangerous",
        "emergency",
        "critical",
        "immediate",
        "urgent",
        "मर",
        "खतरा",
        "आपातकाल"
    ]

    severe_words = [
        "disease",
        "illness",
        "contamination",
        "pollution",
        "unsafe",
        "accident",
        "shortage",
        "no water",
        "no electricity",
        "पानी नहीं",
        "बिजली नहीं"
    ]

    severity = 5
    urgency = 5

    for word in urgent_words:

        if word in text:
            urgency += 2
            severity += 1

    for word in severe_words:

        if word in text:
            severity += 2
            urgency += 1

    return (
        min(severity, 10),
        min(urgency, 10)
    )


def analyze_challenge(
    challenge: ChallengeInput
) -> ChallengeAnalysis:

    # Combine title + description
    text = normalize_text(
        f"{challenge.title} {challenge.description}"
    )


    # --------------------------------
    # DOMAIN CLASSIFICATION
    # --------------------------------

    scores = {}

    for domain, data in DOMAIN_RULES.items():

        score = 0

        for keyword in data["keywords"]:

            keyword = normalize_text(keyword)

            if keyword in text:
                score += 1

        scores[domain] = score


    best_domain = max(
        scores,
        key=scores.get
    )

    best_score = scores[best_domain]


    # --------------------------------
    # UNKNOWN PROBLEM
    # --------------------------------

    if best_score == 0:

        return ChallengeAnalysis(

            domain="Other",

            subdomain="General Societal Challenge",

            problem_type="Unclassified Problem",

            summary=challenge.description[:300],

            severity=5,

            urgency=5,

            required_expertise=[],

            keywords=[],

            confidence=0.30
        )


    # --------------------------------
    # EXPERTISE
    # --------------------------------

    expertise = DOMAIN_RULES[
        best_domain
    ]["expertise"]


    # --------------------------------
    # MATCHED KEYWORDS
    # --------------------------------

    matched_keywords = []

    for keyword in DOMAIN_RULES[
        best_domain
    ]["keywords"]:

        normalized_keyword = normalize_text(keyword)

        if normalized_keyword in text:

            matched_keywords.append(keyword)


    # --------------------------------
    # PRIORITY
    # --------------------------------

    severity, urgency = calculate_priority(text)


    # --------------------------------
    # CONFIDENCE
    # --------------------------------

    confidence = min(
        0.60 + (best_score * 0.07),
        0.95
    )


    # --------------------------------
    # SUBDOMAIN
    # --------------------------------

    if best_domain == "Water":

        if any(
            word in text
            for word in [
                "borewell",
                "bore well",
                "groundwater",
                "underground",
                "कुआं",
                "well"
            ]
        ):

            subdomain = "Groundwater"

        elif any(
            word in text
            for word in [
                "river",
                "pond",
                "तालाब",
                "नदी"
            ]
        ):

            subdomain = "Surface Water"

        else:

            subdomain = "Water Management"


        problem_type = (
            "Water Quality / Water Management"
        )


    elif best_domain == "Agriculture":

        if (
            "irrigation" in text
            or "सिंचाई" in text
        ):

            subdomain = "Irrigation"

            problem_type = (
                "Irrigation Challenge"
            )

        elif (
            "soil" in text
            or "मिट्टी" in text
        ):

            subdomain = "Soil Management"

            problem_type = (
                "Soil / Crop Management"
            )

        else:

            subdomain = (
                "Agricultural Development"
            )

            problem_type = (
                "Agriculture Challenge"
            )


    elif best_domain == "Healthcare":

        subdomain = "Healthcare Access"

        problem_type = (
            "Healthcare Service Challenge"
        )


    elif best_domain == "Education":

        subdomain = "Education Access"

        problem_type = (
            "Education Challenge"
        )


    elif best_domain == "Environment":

        subdomain = (
            "Pollution and Waste Management"
        )

        problem_type = (
            "Environmental Challenge"
        )


    elif best_domain == "Energy":

        subdomain = "Energy Access"

        problem_type = (
            "Energy Challenge"
        )


    elif best_domain == "Infrastructure":

        subdomain = "Public Infrastructure"

        problem_type = (
            "Infrastructure Challenge"
        )


    else:

        subdomain = "General"

        problem_type = (
            "Societal Challenge"
        )


    # --------------------------------
    # SUMMARY
    # --------------------------------

    summary = (
        f"Reported societal challenge related to "
        f"{subdomain.lower()} in "
        f"{challenge.district or 'the reported area'}."
    )


    # --------------------------------
    # FINAL RESULT
    # --------------------------------

    return ChallengeAnalysis(

        domain=best_domain,

        subdomain=subdomain,

        problem_type=problem_type,

        summary=summary,

        severity=severity,

        urgency=urgency,

        required_expertise=expertise,

        keywords=matched_keywords[:10],

        confidence=round(
            confidence,
            2
        )
    )