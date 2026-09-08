async function analyzeChallenge(challenge) {

    const response = await fetch(
        "http://localhost:8000/api/v1/challenge/analyze",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                title: challenge.title,
                description: challenge.description,
                district: challenge.district,
                affected_people: challenge.affected_people
            })
        }
    );

    if (!response.ok) {

        const error = await response.text();

        throw new Error(
            `AI service error ${response.status}: ${error}`
        );
    }

    return await response.json();
}


module.exports = {
    analyzeChallenge
};