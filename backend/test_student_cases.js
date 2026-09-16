const pool = require("./src/config/db");
const { updateStudentSkills, findMatchingProblemsForStudent } = require("./src/services/studentMatchingService");

async function runTestCases() {
  try {
    // 1. Get or create two student users: Student A and Student B
    let studentARes = await pool.query("SELECT id, email FROM users WHERE email = 'student.a@test.com'");
    if (studentARes.rows.length === 0) {
      studentARes = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Student A (IoT & Data)', 'student.a@test.com', 'dummyhash', 'STUDENT') RETURNING id, email"
      );
    }
    const studentAId = studentARes.rows[0].id;

    let studentBRes = await pool.query("SELECT id, email FROM users WHERE email = 'student.b@test.com'");
    if (studentBRes.rows.length === 0) {
      studentBRes = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Student B (Civil & Roads)', 'student.b@test.com', 'dummyhash', 'STUDENT') RETURNING id, email"
      );
    }
    const studentBId = studentBRes.rows[0].id;

    // -------------------------------------------------------------
    // TEST CASE 1: Student A with Python, IoT, Machine Learning
    // -------------------------------------------------------------
    console.log("=== RUNNING TEST CASE 1: Student A ===");
    const skillsA = ["Python", "IoT", "Machine Learning"];
    await updateStudentSkills(studentAId, skillsA);
    const matchesA = await findMatchingProblemsForStudent(studentAId, { sort: "best_match" });

    console.log(`Student A skills:`, matchesA.student.skills);
    console.log(`Total matched problems for Student A: ${matchesA.total_matches}`);
    matchesA.matches.forEach((m, idx) => {
      console.log(`  ${idx + 1}. [${m.match_tier} - ${m.match_score}%] #${m.id} ${m.title}`);
      console.log(`     Matched: ${JSON.stringify(m.matched_skills)}`);
      console.log(`     Required: ${JSON.stringify(m.required_expertise)}`);
      console.log(`     Reason: ${m.match_reason}`);
    });

    // -------------------------------------------------------------
    // TEST CASE 2: Student B with Civil Engineering, Road Construction, Structural Engineering
    // -------------------------------------------------------------
    console.log("\n=== RUNNING TEST CASE 2: Student B ===");
    const skillsB = ["Civil Engineering", "Road Construction", "Structural Engineering"];
    await updateStudentSkills(studentBId, skillsB);
    const matchesB = await findMatchingProblemsForStudent(studentBId, { sort: "best_match" });

    console.log(`Student B skills:`, matchesB.student.skills);
    console.log(`Total matched problems for Student B: ${matchesB.total_matches}`);
    matchesB.matches.forEach((m, idx) => {
      console.log(`  ${idx + 1}. [${m.match_tier} - ${m.match_score}%] #${m.id} ${m.title}`);
      console.log(`     Matched: ${JSON.stringify(m.matched_skills)}`);
      console.log(`     Required: ${JSON.stringify(m.required_expertise)}`);
      console.log(`     Reason: ${m.match_reason}`);
    });

    console.log("\n=== VERIFICATION COMPLETE ===");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await pool.end();
  }
}

runTestCases();
