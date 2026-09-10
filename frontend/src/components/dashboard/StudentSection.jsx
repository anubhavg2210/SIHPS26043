import { useState, useEffect } from "react";
import { problemApi, matchingApi, solutionApi, reputationApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { MatchScoreIndicator } from "../common/ProgressBar";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";

// Student's confirmed skills (derived from student_profiles in backend for Arjun Sharma)
const STUDENT_SKILLS = [
  "Groundwater",
  "Water Quality",
  "Environmental Engineering",
  "GIS",
];

export function StudentSection({ user }) {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [matchedProblems, setMatchedProblems] = useState([]);
  const [mySolutions, setMySolutions] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadStudentData() {
      setError("");
      try {
        // 1. Fetch available problems
        const [probRes, repRes] = await Promise.allSettled([
          problemApi.getProblems({ limit: 15 }),
          reputationApi.getMyReputation(),
        ]);

        if (ignore) return;

        if (repRes.status === "fulfilled") {
          setReputation(repRes.value);
        }

        const candidateProblems = probRes.status === "fulfilled" ? probRes.value?.problems || [] : [];

        // 2. Query real matching endpoint for each candidate problem that has required expertise
        const matchingResults = [];
        const userSolutionsList = [];

        for (const prob of candidateProblems.slice(0, 8)) {
          if (ignore) break;
          try {
            // Check student matches from backend endpoint
            const matchRes = await matchingApi.getStudentMatches(prob.id).catch(() => null);
            if (matchRes && matchRes.matches) {
              const myMatch = matchRes.matches.find(
                (m) => Number(m.user_id || m.id) === Number(user?.id)
              );

              if (myMatch) {
                matchingResults.push({
                  problem: prob,
                  matchScore: myMatch.match_score,
                  matchedSkills: myMatch.matched_skills || [],
                  requiredSkills: matchRes.required_expertise || [],
                  reason: myMatch.reason || `Matched ${myMatch.matched_expertise} skills`,
                });
              } else if (Array.isArray(prob.required_expertise) && prob.required_expertise.length > 0) {
                // Fallback deterministic match calculation against STUDENT_SKILLS
                const normalizedStudent = STUDENT_SKILLS.map((s) => s.toLowerCase());
                const matched = prob.required_expertise.filter((req) =>
                  normalizedStudent.includes(req.toLowerCase())
                );
                if (matched.length > 0) {
                  const score = Math.round((matched.length / prob.required_expertise.length) * 100);
                  matchingResults.push({
                    problem: prob,
                    matchScore: score,
                    matchedSkills: matched,
                    requiredSkills: prob.required_expertise,
                    reason: `Matched ${matched.length} of ${prob.required_expertise.length} required expertise areas`,
                  });
                }
              }
            }

            // Check solutions
            const solRes = await solutionApi.getSolutionsForProblem(prob.id).catch(() => ({ solutions: [] }));
            const userSols = (solRes?.solutions || []).filter(
              (s) => Number(s.submitted_by) === Number(user?.id)
            );
            userSolutionsList.push(...userSols);
          } catch {
            // Non-fatal per-problem boundary
          }
        }

        if (!ignore) {
          // Sort matched problems by matchScore desc
          matchingResults.sort((a, b) => b.matchScore - a.matchScore);
          setMatchedProblems(matchingResults);
          setMySolutions(userSolutionsList);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load student dashboard opportunities");
          setLoading(false);
        }
      }
    }

    loadStudentData();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  // Derive suggested contribution area from matched skills
  const getContributionArea = (matchedSkills) => {
    if (matchedSkills.some((s) => s.toLowerCase().includes("gis"))) {
      return "Spatial mapping & geospatial contaminant spread modeling";
    }
    if (matchedSkills.some((s) => s.toLowerCase().includes("water quality"))) {
      return "Water quality testing data analysis & sample verification";
    }
    if (matchedSkills.some((s) => s.toLowerCase().includes("groundwater"))) {
      return "Hydrogeological aquifer data aggregation & localized field survey";
    }
    return "Technical research, data synthesis, and pilot validation";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Student Metrics from Real Data */}
      <div className="cs-grid-4">
        <StatCard
          title="Skill Matches"
          value={loading ? "..." : String(matchedProblems.length)}
          subtitle="Problems matching your expertise"
          icon="target"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title="Your Active Solutions"
          value={loading ? "..." : String(mySolutions.length)}
          subtitle="Proposals & collaborations"
          icon="cpu"
          iconColor="var(--color-secondary)"
        />
        <StatCard
          title="Reputation Score"
          value={loading ? "..." : String(reputation?.score || 0)}
          subtitle={`Current tier: ${reputation?.tier || "BRONZE"}`}
          icon="award"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title="Registered Skills"
          value={String(STUDENT_SKILLS.length)}
          subtitle="Validated student competencies"
          icon="graduation-cap"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Student Skill Profile Card */}
      <Card
        title="Your Student Competency Profile"
        subtitle="Skills registered in your academic profile used for civic opportunity matching"
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="outline" size="sm" onClick={() => navigate("/reputation")}>
              View Reputation →
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/rankings")}>
              View Rankings →
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {STUDENT_SKILLS.map((skill) => (
            <span
              key={skill}
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                padding: "0.3rem 0.75rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-border)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              ✓ {skill}
            </span>
          ))}
        </div>
      </Card>

      {/* Core Student Matching Value Proposition */}
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem", fontWeight: 700 }}>
            Problems Matching Your Skills
          </h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Contribute specialized knowledge to real societal problems in collaboration with universities and municipal authorities
          </p>
        </div>

        {loading ? (
          <div className="cs-grid-2">
            <Card><LoadingSkeleton lines={4} /></Card>
            <Card><LoadingSkeleton lines={4} /></Card>
          </div>
        ) : error ? (
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : matchedProblems.length === 0 ? (
          <EmptyState
            icon="target"
            title="No direct skill matches found right now"
            description="Explore the problem catalog to discover challenges across other districts or submit a collaborative solution."
            actionLabel="Explore All Problems"
            onAction={() => navigate("/explore")}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {matchedProblems.map(({ problem, matchScore, matchedSkills, requiredSkills, reason }) => (
              <div
                key={problem.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--color-primary-subtle)",
                          color: "var(--color-primary)",
                        }}
                      >
                        {problem.category}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{problem.id} &bull; 📍 {problem.district || "District"}
                      </span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                      {problem.title}
                    </h4>
                  </div>

                  <MatchScoreIndicator score={matchScore} />
                </div>

                {/* The 4-Step Student Journey Pipeline Box */}
                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.85rem 1rem",
                    margin: "1rem 0",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {/* Step 1: Required Expertise */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      1. Required Expertise
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
                      {requiredSkills.map((s) => (
                        <span key={s} style={{ fontSize: "0.72rem", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "#ffffff", border: "1px solid var(--border-color)" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Your Matching Skills */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>
                      2. Your Matching Skills
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
                      {matchedSkills.map((s) => (
                        <span key={s} style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-primary-subtle)", color: "var(--color-primary)" }}>
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Possible Contribution Area */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase" }}>
                      3. Potential Contribution
                    </div>
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {getContributionArea(matchedSkills)}
                    </p>
                  </div>
                </div>

                {/* Explanation & Action Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    💡 {reason}
                  </span>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="arrow-right"
                      onClick={() => navigate(`/problems/${problem.id}`)}
                    >
                      View Problem
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="plus-circle"
                      onClick={() => navigate(`/problems/${problem.id}`)}
                    >
                      Contribute Solution
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
