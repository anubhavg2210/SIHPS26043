const { normalizeAIResponse } = require("../aiSchema");

async function analyzeWithNLP(challenge) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), parseInt(process.env.AI_TIMEOUT_MS) || 10000);

    try {
        const response = await fetch("http://localhost:8000/api/v1/challenge/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: challenge.title,
                description: challenge.description,
                district: challenge.district || null,
                city: challenge.city || null,
                address: challenge.address || null,
                affected_people: challenge.affected_people || null,
                available_from: challenge.available_from || null,
                available_until: challenge.available_until || null
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`NLP Fallback error ${response.status}: ${error}`);
        }

        const data = await response.json();
        
        // Ensure NLP format fits our schema
        const mapped = {
            domain: data.domain,
            subdomain: data.subdomain,
            severity: data.severity,
            urgency: data.urgency,
            keywords: data.keywords || [],
            required_expertise: data.required_expertise || [],
            root_causes: data.root_causes || [],
            summary: data.summary,
            confidence: data.confidence,
            explanation: data.explanation || "Analyzed by existing NLP rules",
            provider: "nlp",
            mode: "FALLBACK"
        };
        
        return normalizeAIResponse(mapped, "nlp", "FALLBACK");
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

// NLP fallback doesn't support natural language generation, so it just throws to allow the deterministic explanation to take over.
async function explainMatchWithNLP() {
    throw new Error("NLP fallback does not support natural language explanations.");
}

module.exports = {
    analyzeWithNLP,
    explainMatchWithNLP
};
