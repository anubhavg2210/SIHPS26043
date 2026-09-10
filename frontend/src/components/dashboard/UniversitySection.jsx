import { useState, useEffect } from "react";
import { problemApi, reputationApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { PriorityBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";

export function UniversitySection() {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [universityRankings, setUniversityRankings] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setError("");
      try {
        const [probRes, rankRes, repRes] = await Promise.allSettled([
          problemApi.getProblems({ limit: 20 }),
          reputationApi.getUniversityRankings(),
          reputationApi.getMyReputation(),
        ]);

        if (!ignore) {
          if (probRes.status === "fulfilled") setProblems(probRes.value?.problems || []);
          if (rankRes.status === "fulfilled") setUniversityRankings(rankRes.value?.rankings || rankRes.value || []);
          if (repRes.status === "fulfilled") setReputation(repRes.value);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load university participation data");
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
      {/* Overview Stat Grid */}
      <div className="cs-grid-4">
        <StatCard
          title="Regional Challenges"
          value={loading ? "..." : String(problems.length)}
          subtitle="Problems in state catchment"
          icon="building"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title="Institutional Score"
          value={loading ? "..." : String(reputation?.score || 0)}
          subtitle={`Tier: ${reputation?.tier || "BRONZE"}`}
          icon="award"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title="Ranked Institutions"
          value={loading ? "..." : String(universityRankings.length || 1)}
          subtitle="In state civic leaderboard"
          icon="trending-up"
          iconColor="var(--color-secondary)"
        />
        <StatCard
          title="Collaboration Vectors"
          value="Faculty & Students"
          subtitle="Expertise-based team matching"
          icon="users"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Institutional Mission Banner */}
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
          <Icon name="graduation-cap" size={22} />
        </div>
        <div>
          <h4 style={{ margin: "0 0 0.2rem", fontSize: "1rem", color: "var(--color-primary)" }}>
            Academic Talent Mobilization for Societal Impact
          </h4>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Connect faculty research, PhD scholars, and engineering students to district-level civic problems through verifiable expertise matching.
          </p>
        </div>
      </div>

      {/* Regional Problems Seeking University Engagement */}
      <Card
        title="Regional Societal Challenges"
        subtitle="Problems in municipal districts where academic expertise can drive systemic root cause discovery"
        actions={
          <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
            View All Problems
          </Button>
        }
      >
        {loading ? (
          <LoadingSkeleton lines={4} />
        ) : error ? (
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : problems.length === 0 ? (
          <EmptyState
            icon="building"
            title="No regional challenges recorded"
            description="All active cases are currently assigned or under review."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {problems.slice(0, 5).map((prob) => {
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
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
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

                  <Button variant="primary" size="sm" icon="arrow-right">
                    Mobilize Department
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
