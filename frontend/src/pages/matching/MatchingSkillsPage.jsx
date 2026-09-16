import { useState, useEffect } from "react";
import { studentApi } from "../../services/api";
import { useAuth } from "../../context/useAuth";
import { useRouter } from "../../context/useRouter";
import { Card } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { StatusBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";

const SKILL_SUGGESTIONS = [
  "Python",
  "IoT",
  "Machine Learning",
  "Data Analytics",
  "Civil Engineering",
  "Road Construction",
  "Structural Engineering",
  "Water Quality",
  "Water Treatment",
  "Groundwater",
  "Environmental Engineering",
  "GIS",
  "Electrical Engineering",
  "Solar Pumping",
  "Solid Waste Management",
];

export function MatchingSkillsPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [matchedProblems, setMatchedProblems] = useState([]);
  const [sortBy, setSortBy] = useState("best_match");
  const [error, setError] = useState("");

  // Skill editing state
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [editingSkillsList, setEditingSkillsList] = useState([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);

  // Detail Modal state
  const [detailModalProblem, setDetailModalProblem] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setError("");
      try {
        const profRes = await studentApi.getProfile();
        if (ignore) return;
        const currentProfile = profRes.profile;
        setProfile(currentProfile);
        const studentSkills = currentProfile?.skills || [];
        setSkills(studentSkills);
        setEditingSkillsList(studentSkills);

        if (studentSkills.length > 0) {
          const matchRes = await studentApi.getMatchedProblems({ sort: sortBy });
          if (ignore) return;
          setMatchedProblems(matchRes.matches || []);
        } else {
          setMatchedProblems([]);
        }
        setLoading(false);
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load matching skills data");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [sortBy]);

  // Handle saving updated skills
  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      const res = await studentApi.updateSkills(editingSkillsList);
      setSkills(res.skills || editingSkillsList);
      setIsEditingSkills(false);
      setSavingSkills(false);
      // Immediately re-fetch matches with updated skills
      setMatchingLoading(true);
      const matchRes = await studentApi.getMatchedProblems({ sort: sortBy });
      setMatchedProblems(matchRes.matches || []);
      setMatchingLoading(false);
    } catch (err) {
      console.error("Save skills error:", err);
      alert("Failed to save skills: " + (err.message || "Unknown error"));
      setSavingSkills(false);
    }
  };

  const addSkillToEditing = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (!editingSkillsList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setEditingSkillsList([...editingSkillsList, trimmed]);
    }
    setCustomSkillInput("");
  };

  const removeSkillFromEditing = (skillToRemove) => {
    setEditingSkillsList(editingSkillsList.filter((s) => s !== skillToRemove));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "1100px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Problems Matching Your Skills
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Explainable matching engine connecting your technical competencies with active civic challenges
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
            Explore All Problems
          </Button>
          <Button variant="ghost" size="sm" icon="award" onClick={() => navigate("/reputation")}>
            Your Reputation
          </Button>
        </div>
      </div>

      {/* Top Card: Student Skills Profile */}
      <Card
        title="Your Skills Profile"
        subtitle={profile ? `${profile.name || user?.name} • ${profile.course || "Student Contributor"} (${profile.institution_name || "Institution"})` : "Student Competencies"}
        actions={
          !isEditingSkills && (
            <Button
              variant="outline"
              size="sm"
              icon="plus-circle"
              onClick={() => {
                setEditingSkillsList(skills);
                setIsEditingSkills(true);
              }}
            >
              {skills.length > 0 ? "Edit Skills" : "Add Skills"}
            </Button>
          )
        }
      >
        {loading ? (
          <LoadingSkeleton lines={2} />
        ) : isEditingSkills ? (
          /* Interactive Skills Editor */
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Add or remove your technical competencies to discover problems where your skills can make a measurable difference:
            </div>

            {/* Currently selected skills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", minHeight: "36px", padding: "0.5rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-color)" }}>
              {editingSkillsList.length === 0 ? (
                <span style={{ fontSize: "0.825rem", color: "var(--text-muted)", fontStyle: "italic", alignSelf: "center" }}>
                  No skills selected yet. Click from suggestions below or type your own.
                </span>
              ) : (
                editingSkillsList.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.825rem",
                      fontWeight: 600,
                      padding: "0.25rem 0.6rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--color-primary-subtle)",
                      color: "var(--color-primary)",
                      border: "1px solid var(--color-primary-border)",
                    }}
                  >
                    ✓ {skill}
                    <button
                      type="button"
                      onClick={() => removeSkillFromEditing(skill)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-primary)",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        lineHeight: 1,
                        padding: 0,
                      }}
                      title={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Custom skill input */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                placeholder="Type a skill (e.g. 'IoT', 'Python', 'Civil Engineering') and press Add..."
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkillToEditing(customSkillInput);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.85rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  outline: "none",
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addSkillToEditing(customSkillInput)}
                disabled={!customSkillInput.trim()}
              >
                Add Skill
              </Button>
            </div>

            {/* Quick Suggestions Chips */}
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                Suggested Competencies:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {SKILL_SUGGESTIONS.filter((s) => !editingSkillsList.includes(s)).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addSkillToEditing(suggestion)}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px dashed var(--border-color)",
                      backgroundColor: "#ffffff",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-primary)";
                      e.currentTarget.style.color = "var(--color-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingSkillsList(skills);
                  setIsEditingSkills(false);
                }}
                disabled={savingSkills}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="check"
                onClick={handleSaveSkills}
                disabled={savingSkills}
              >
                {savingSkills ? "Saving..." : "Save Skills & Find Matches"}
              </Button>
            </div>
          </div>
        ) : skills.length === 0 ? (
          <div style={{ padding: "1rem 0", textAlign: "center" }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              No skills registered yet. Add your competencies to discover societal challenges you can help solve.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon="plus-circle"
              onClick={() => {
                setEditingSkillsList([]);
                setIsEditingSkills(true);
              }}
            >
              Add Skills
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            {skills.map((skill) => (
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
        )}
      </Card>

      {/* Matched Problems Section Header & Sort */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
            Problems You Can Help Solve
          </h2>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              padding: "0.15rem 0.6rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-primary-subtle)",
              color: "var(--color-primary)",
            }}
          >
            {matchedProblems.length}
          </span>
        </div>

        {/* Sort controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              backgroundColor: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <option value="best_match">Best Skill Match</option>
            <option value="newest">Newest</option>
            <option value="recently_updated">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* Matched Problems Cards Feed */}
      {loading || matchingLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Card><LoadingSkeleton lines={4} /></Card>
          <Card><LoadingSkeleton lines={4} /></Card>
        </div>
      ) : error ? (
        <p style={{ color: "var(--color-danger)" }}>{error}</p>
      ) : matchedProblems.length === 0 ? (
        <EmptyState
          icon="target"
          title="No problems currently match your skills"
          description="Add more skills to your profile to discover more opportunities, or explore the general catalog."
          actionLabel="Update Skills"
          onAction={() => {
            setEditingSkillsList(skills);
            setIsEditingSkills(true);
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {matchedProblems.map((prob) => {
            const isStrong = prob.match_tier === "Strong Match";
            const tierColor = isStrong ? "var(--color-success)" : "var(--color-primary)";

            return (
              <div
                key={prob.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-color)",
                  padding: "1.5rem",
                  boxShadow: "var(--shadow-xs)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                }}
              >
                {/* Header Row: Category, Status, Match Tier */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                      <StatusBadge status={prob.status || "OPEN"} />
                      {prob.category && (
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
                          {prob.category} {prob.subcategory ? `• ${prob.subcategory}` : ""}
                        </span>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{prob.id} &bull; 📍 {prob.district || "District"} {prob.city ? `(${prob.city})` : ""}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {prob.title}
                    </h3>
                  </div>

                  {/* Match Score Indicator Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: isStrong ? "var(--color-success-subtle)" : "var(--color-primary-subtle)",
                      border: `1px solid ${isStrong ? "var(--color-success-border)" : "var(--color-primary-border)"}`,
                      color: tierColor,
                    }}
                  >
                    <Icon name="check-circle" size={15} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>
                      {prob.match_tier} ({prob.match_score}%)
                    </span>
                  </div>
                </div>

                {/* Short Description */}
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {prob.ai_summary || prob.description}
                </p>

                {/* Explainable Matching Breakdown Box */}
                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                    {/* Matched Skills */}
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                        ✓ Matched Skills ({prob.matched_skills?.length || 0}):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        {prob.matched_skills?.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--color-success-subtle)",
                              color: "var(--color-success)",
                              border: "1px solid var(--color-success-border)",
                            }}
                          >
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing / Additional Required Skills */}
                    {prob.missing_skills && prob.missing_skills.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                          Missing / Other Required Skills ({prob.missing_skills.length}):
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                          {prob.missing_skills.map((skill) => (
                            <span
                              key={skill}
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "#ffffff",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Explainable Match Reason */}
                  <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>💡 Match Reason:</span>
                    <span>{prob.match_reason}</span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", paddingTop: "0.5rem" }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="info"
                    onClick={() => setDetailModalProblem(prob)}
                  >
                    View Matching Details
                  </Button>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="arrow-right"
                      onClick={() => navigate(`/problems/${prob.id}`)}
                    >
                      View Problem
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="cpu"
                      onClick={() => navigate(`/problems/${prob.id}?tab=solutions`)}
                    >
                      Contribute Solution
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explainable Matching Details Modal */}
      {detailModalProblem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setDetailModalProblem(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-lg)",
              maxWidth: "600px",
              width: "100%",
              padding: "1.75rem",
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  Explainable Match Analysis
                </div>
                <h3 style={{ margin: "0.25rem 0 0", fontSize: "1.25rem", fontWeight: 800 }}>
                  {detailModalProblem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalProblem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.25rem", fontWeight: 700 }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem" }}>
              {/* Problem Requirements */}
              <div>
                <strong>Problem Required Expertise:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.35rem" }}>
                  {detailModalProblem.required_expertise?.map((req) => (
                    <span key={req} style={{ padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              {/* Student Skills */}
              <div>
                <strong>Your Student Skills:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.35rem" }}>
                  {skills.map((sk) => (
                    <span key={sk} style={{ padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--color-primary-subtle)", color: "var(--color-primary)", fontSize: "0.8rem", fontWeight: 600 }}>
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Explainable Equation */}
              <div style={{ padding: "0.85rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-muted)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Matching Breakdown:
                </div>
                <div style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {detailModalProblem.matched_skills?.length > 0 ? (
                    <span>
                      Your skills overlap with the requirements for this problem in{" "}
                      <strong>{detailModalProblem.matched_skills.join(", ")}</strong> (
                      {detailModalProblem.matched_count} of {detailModalProblem.total_required} required areas matched).
                    </span>
                  ) : (
                    <span>No direct skill match found.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
              <Button variant="ghost" size="sm" onClick={() => setDetailModalProblem(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="arrow-right"
                onClick={() => {
                  setDetailModalProblem(null);
                  navigate(`/problems/${detailModalProblem.id}`);
                }}
              >
                Go to Problem
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
