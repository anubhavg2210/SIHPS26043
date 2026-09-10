import { useState, useEffect } from "react";
import { problemApi, reputationApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { PriorityBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";

const RESEARCH_CATEGORIES = ["ENVIRONMENTAL", "INFRASTRUCTURE", "TECHNICAL", "BIOLOGICAL_HEALTH"];

export function ResearcherSection() {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [researchProblems, setResearchProblems] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setError("");
      try {
        const [probRes, repRes] = await Promise.allSettled([
          problemApi.getProblems({ limit: 30 }),
          reputationApi.getMyReputation(),
        ]);

        if (!ignore) {
          if (repRes.status === "fulfilled") setReputation(repRes.value);
          if (probRes.status === "fulfilled") {
            const all = probRes.value?.problems || [];
            // Filter research-relevant problems
            const relevant = all.filter((p) =>
              RESEARCH_CATEGORIES.includes((p.category || "").toUpperCase()) ||
              (p.required_expertise && p.required_expertise.length > 0)
            );
            setResearchProblems(relevant);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load researcher opportunities");
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Researcher Metrics */}
      <div className="cs-grid-4">
        <StatCard
          title="Research Challenges"
          value={loading ? "..." : String(researchProblems.length)}
          subtitle="Empirical problems seeking investigation"
          icon="microscope"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title="Reputation Score"
          value={loading ? "..." : String(reputation?.score || 0)}
          subtitle={`Tier: ${reputation?.tier || "BRONZE"}`}
          icon="award"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title="Target Disciplines"
          value={String(RESEARCH_CATEGORIES.length)}
          subtitle="Environmental, Hydro, Biological"
          icon="book-open"
          iconColor="var(--color-secondary)"
        />
        <StatCard
          title="Peer Credentials"
          value={String(reputation?.badges?.length || 0)}
          subtitle="Validated research contributions"
          icon="shield-check"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Researcher Value Proposition Card */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-primary-subtle)",
          border: "1px solid var(--color-primary-border)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-primary)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="microscope" size={22} />
        </div>
        <div>
          <h4 style={{ margin: "0 0 0.2rem", fontSize: "1rem", color: "var(--color-primary)" }}>
            Apply Research Expertise to Real Societal Problems
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Conduct Root Cause Analysis (RCA), attach lab reports and geo-surveys to empirical ledgers, and author peer-evaluated solutions.
          </p>
        </div>
      </div>

      {/* Research-Relevant Societal Problems */}
      <Card
        title="Active Scientific & Empirical Challenges"
        subtitle="Societal problems requiring domain analysis, hydrological testing, or technical solutions"
        actions={
          <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
            Explore All Problems
          </Button>
        }
      >
        {loading ? (
          <LoadingSkeleton lines={4} />
        ) : error ? (
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : researchProblems.length === 0 ? (
          <EmptyState
            icon="microscope"
            title="No research problems found"
            description="All active cases are currently assigned or in non-technical categories."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {researchProblems.slice(0, 6).map((prob) => {
              const prio = prob.priority_score ?? ((prob.severity || 0) * 5 + (prob.urgency || 0) * 5);
              const skills = Array.isArray(prob.required_expertise) ? prob.required_expertise : [];

              return (
                <div
                  key={prob.id}
                  onClick={() => navigate(`/problems/${prob.id}`)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    padding: "0.85rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--color-primary-subtle)",
                          color: "var(--color-primary)",
                        }}
                      >
                        {prob.category}
                      </span>
                      <PriorityBadge priority={prio} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{prob.id} &bull; 📍 {prob.district || "District"}
                      </span>
                    </div>

                    <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem", fontWeight: 700 }}>
                      {prob.title}
                    </h4>

                    {skills.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {skills.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "#ffffff",
                              border: "1px solid var(--border-color)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button variant="outline" size="sm" icon="layers">
                      Inspect RCA
                    </Button>
                    <Button variant="primary" size="sm" icon="arrow-right">
                      View Challenge
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
