const { normalizeAIResponse } = require("../aiSchema");

async function analyzeWithOpenRouter(promptText) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), parseInt(process.env.AI_TIMEOUT_MS) || 10000);

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "http://localhost:3000", 
                "X-Title": "CivicSync"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini", // Configurable in prod
                messages: [
                    {
                        role: "system",
                        content: "You are a civic technology AI. Return ONLY a valid JSON object matching the requested schema. Do not include markdown formatting or text outside the JSON."
                    },
                    {
                        role: "user",
                        content: promptText
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        const rawJson = JSON.parse(content);
        return normalizeAIResponse(rawJson, "openrouter", "AI");
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

async function explainMatchWithOpenRouter(promptText) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), parseInt(process.env.AI_TIMEOUT_MS) || 10000);

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a civic technology matching explainer. Return ONLY plain text, no markdown."
                    },
                    {
                        role: "user",
                        content: promptText
                    }
                ],
                temperature: 0.3
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
        
        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

module.exports = {
    analyzeWithOpenRouter,
    explainMatchWithOpenRouter
};
