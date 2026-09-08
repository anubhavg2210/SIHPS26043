const pool = require("../config/db");

async function findMatchingInstitutions(requiredExpertise) {
    const query = `
        WITH required_expertise AS (
            SELECT id, name
            FROM expertise
            WHERE name = ANY($1)
        )

        SELECT
            i.id AS institution_id,
            i.name AS institution,
            COUNT(re.id) AS matched_expertise,

            (SELECT COUNT(*) FROM required_expertise)
                AS required_expertise,

            ROUND(
                COUNT(re.id) * 100.0 /
                NULLIF(
                    (SELECT COUNT(*) FROM required_expertise),
                    0
                ),
                2
            ) AS match_score,

            COALESCE(
                STRING_AGG(re.name, ', '),
                ''
            ) AS matched_skills

        FROM institutions i

        LEFT JOIN institution_expertise ie
            ON ie.institution_id = i.id

        LEFT JOIN required_expertise re
            ON re.id = ie.expertise_id

        GROUP BY i.id, i.name

        ORDER BY match_score DESC;
    `;

    const result = await pool.query(query, [requiredExpertise]);

    return result.rows;
}

module.exports = {
    findMatchingInstitutions
};