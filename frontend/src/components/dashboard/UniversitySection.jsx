import { useState, useEffect } from "react";
import { problemApi, reputationApi, universityApi } from "../../services/api";
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
  const [counts, setCounts] = useState({ facultyCount: 0, studentCount: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setError("");
      try {
        const [probRes, rankRes, repRes, countsRes] = await Promise.allSettled([
          problemApi.getProblems({ limit: 20 }),
          reputationApi.getUniversityRankings(),
          reputationApi.getMyReputation(),
          universityApi.getDashboardCounts().catch(() => ({ facultyCount: 0, studentCount: 0 }))
        ]);

        if (!ignore) {
          if (probRes.status === "fulfilled") setProblems(probRes.value?.problems || []);
          if (rankRes.status === "fulfilled") setUniversityRankings(rankRes.value?.rankings || rankRes.value || []);
          if (repRes.status === "fulfilled") setReputation(repRes.value);
          if (countsRes.status === "fulfilled" && countsRes.value) {
            setCounts(countsRes.value);
          }
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
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "minmax(0, 7fr) minmax(0, 3fr)", 
      gap: "1.5rem",
      alignItems: "start"
    }}>
      {/* Left Column: Hero, Metrics, Regional Challenges */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* HERO SECTION */}
        <div style={{
          padding: "2.5rem 3rem",
          backgroundColor: "#ffffff",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden",
          border: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          {/* Decorative background gradient element */}
          <div style={{
            position: "absolute",
            top: "-50%",
            right: "-10%",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, var(--color-primary-subtle) 0%, transparent 60%)",
            opacity: 0.8,
            zIndex: 0,
            pointerEvents: "none"
          }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: "500px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Welcome back,
            </div>
            <h1 style={{ margin: "0 0 1rem", fontSize: "2.75rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Your Institution.<br />
              <span style={{ color: "var(--color-primary)" }}>Real Impact.</span>
            </h1>
            <p style={{ margin: "0 0 2rem", fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Mobilize faculty and students to solve real societal challenges through verifiable expertise matching.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Button variant="primary" size="lg" onClick={() => navigate('/explore')}>
                Explore Problems
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/faculty-students')} style={{ backgroundColor: "#ffffff" }}>
                View Faculty &amp; Students
              </Button>
            </div>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="cs-grid-3">
          <StatCard
            title="Regional Challenges"
            value={loading ? "..." : String(problems.length)}
            subtitle="In your district"
            icon="building"
            iconColor="var(--color-info)"
          />
          <StatCard
            title="Collaboration Vectors"
            value={loading ? "..." : String(counts.facultyCount + counts.studentCount)}
            subtitle={`${counts.facultyCount} Faculty • ${counts.studentCount} Students`}
            icon="users"
            iconColor="var(--color-success)"
            onClick={() => navigate('/faculty-students')}
          />
          <StatCard
            title="Institutional Score"
            value={loading ? "..." : String(reputation?.score || 0)}
            subtitle={`Tier: ${reputation?.tier || "BRONZE"}`}
            icon="award"
            iconColor="var(--color-warning)"
          />
        </div>

        {/* REGIONAL CHALLENGES */}
        <Card
          title="Regional Challenges"
          subtitle="Latest societal problems from your region"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>
              View All &rarr;
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {problems.slice(0, 4).map((prob) => {
                const prio = prob.priority_score ?? ((prob.severity || 0) * 5 + (prob.urgency || 0) * 5);
                return (
                  <div
                    key={prob.id}
                    onClick={() => navigate(`/problems/${prob.id}`)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "1.25rem",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                      boxShadow: "var(--shadow-xs)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-primary-border)";
                      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                      e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ 
                          width: "32px", height: "32px", borderRadius: "var(--radius-md)", 
                          backgroundColor: "var(--color-primary-subtle)", color: "var(--color-primary)",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <Icon name="droplet" size={16} /> {/* Placeholder icon, could be mapped by category */}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{prob.category}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>#{prob.id} &bull; 📍 {prob.district || "District"}</div>
                        </div>
                      </div>
                      <PriorityBadge priority={prio} />
                    </div>

                    <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {prob.title}
                    </h4>
                    
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                       <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0.5rem", backgroundColor: "var(--color-primary-subtle)", color: "var(--color-primary)", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontWeight: 600 }}>
                          <Icon name="info" size={12} /> {prob.status.replace(/_/g, " ")}
                       </div>
                       <Icon name="arrow-right" size={16} color="var(--text-light)" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Right Column: AI Insight, Quick Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* AI INSIGHT */}
        <Card hover style={{ border: "1px solid var(--color-primary-border)", backgroundColor: "var(--color-primary-subtle)", boxShadow: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
             <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-primary)", fontWeight: 700 }}>
                <Icon name="sparkles" size={20} />
                AI Insight
             </div>
             <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Today</span>
          </div>
          
          <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
            5 new problems match your institution's expertise.
          </h4>
          <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Based on your faculty and student skills, we found new opportunities in Water, Agriculture, and Urban Development.
          </p>
          
          <Button variant="primary" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => navigate('/matches')}>
            View Matched Problems <Icon name="arrow-right" size={16} />
          </Button>
        </Card>

        {/* QUICK ACTIONS */}
        <Card title="Quick Actions">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Button 
              variant="outline" 
              icon="users" 
              style={{ justifyContent: "flex-start", border: "1px solid transparent", backgroundColor: "var(--bg-muted)", color: "var(--text-primary)" }}
              onClick={() => navigate('/faculty-students')}
            >
              View Faculty &amp; Students
            </Button>
            <Button 
              variant="outline" 
              icon="search" 
              style={{ justifyContent: "flex-start", border: "1px solid transparent", backgroundColor: "var(--bg-muted)", color: "var(--text-primary)" }}
              onClick={() => navigate('/matches')}
            >
              Explore Matched Problems
            </Button>
            <Button 
              variant="outline" 
              icon="cpu" 
              style={{ justifyContent: "flex-start", border: "1px solid transparent", backgroundColor: "var(--bg-muted)", color: "var(--text-primary)" }}
              onClick={() => navigate('/solutions')}
            >
              Submit a Solution
            </Button>
            <Button 
              variant="outline" 
              icon="activity" 
              style={{ justifyContent: "flex-start", border: "1px solid transparent", backgroundColor: "var(--bg-muted)", color: "var(--text-primary)" }}
              onClick={() => navigate('/impact')}
            >
              View Institutional Impact
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
