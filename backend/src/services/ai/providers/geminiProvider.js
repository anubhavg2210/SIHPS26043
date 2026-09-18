const { normalizeAIResponse } = require("../aiSchema");

async function analyzeWithGemini(promptText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), parseInt(process.env.AI_TIMEOUT_MS) || 10000);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "You are a civic technology AI. Return ONLY a valid JSON object matching the requested schema. Do not include markdown formatting or text outside the JSON.\n\n" + promptText
                    }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;
        
        const rawJson = JSON.parse(content);
        return normalizeAIResponse(rawJson, "gemini", "AI");
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

async function explainMatchWithGemini(promptText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), parseInt(process.env.AI_TIMEOUT_MS) || 10000);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "You are a civic technology matching explainer. Return ONLY plain text, no markdown.\n\n" + promptText
                    }]
                }],
                generationConfig: {
                    temperature: 0.3
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

module.exports = {
    analyzeWithGemini,
    explainMatchWithGemini
};
