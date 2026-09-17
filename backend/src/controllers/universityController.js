const pool = require("../config/db");

exports.getDashboardCounts = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const profileQuery = await pool.query(
            "SELECT institution_id FROM university_profiles WHERE user_id = $1",
            [userId]
        );

        if (profileQuery.rows.length === 0) {
            return res.status(404).json({ error: "Institution profile not found for user" });
        }
        
        const institutionId = profileQuery.rows[0].institution_id;

        const facultyResult = await pool.query(
            `SELECT COUNT(*) FROM faculty f 
             JOIN departments d ON f.department_id = d.id 
             WHERE d.institution_id = $1`,
            [institutionId]
        );

        const studentsResult = await pool.query(
            "SELECT COUNT(*) FROM student_profiles WHERE institution_id = $1",
            [institutionId]
        );

        res.json({
            facultyCount: parseInt(facultyResult.rows[0].count),
            studentCount: parseInt(studentsResult.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getFacultyAndStudents = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const profileQuery = await pool.query(
            "SELECT institution_id FROM university_profiles WHERE user_id = $1",
            [userId]
        );

        if (profileQuery.rows.length === 0) {
            return res.status(404).json({ error: "Institution profile not found for user" });
        }
        
        const institutionId = profileQuery.rows[0].institution_id;

        // Fetch Faculty
        const facultyQuery = await pool.query(
            `SELECT f.id, f.name, f.designation, d.name as department, 
             COALESCE(array_agg(e.name) FILTER (WHERE e.name IS NOT NULL), '{}') as skills
             FROM faculty f
             JOIN departments d ON f.department_id = d.id
             LEFT JOIN faculty_expertise fe ON f.id = fe.faculty_id
             LEFT JOIN expertise e ON fe.expertise_id = e.id
             WHERE d.institution_id = $1
             GROUP BY f.id, d.name`,
            [institutionId]
        );

        // Fetch Students
        const studentQuery = await pool.query(
            `SELECT sp.id, u.name, d.name as department, sp.course, sp.graduation_year, sp.skills
             FROM student_profiles sp
             JOIN users u ON sp.user_id = u.id
             LEFT JOIN departments d ON sp.department_id = d.id
             WHERE sp.institution_id = $1`,
            [institutionId]
        );

        res.json({
            faculty: facultyQuery.rows,
            students: studentQuery.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
