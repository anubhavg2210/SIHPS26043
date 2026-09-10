import { useState, useEffect } from "react";
import { Icon } from "../../components/common/Icons";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Cards";
import { StatusBadge } from "../../components/common/Badges";
import { LifecycleTimeline } from "../../components/problems/LifecycleTimeline";
import { RootCauseView } from "../../components/problems/RootCauseView";
import { DependencyGraphView } from "../../components/problems/DependencyGraphView";
import { SolutionsView } from "../../components/problems/SolutionsView";
import { ImplementationView } from "../../components/problems/ImplementationView";
import { ImpactView } from "../../components/problems/ImpactView";
import { ExpertiseMatchingView } from "../../components/problems/ExpertiseMatchingView";
import { AIAnalysisView } from "../../components/problems/AIAnalysisView";
import { problemApi, matchingApi, challengeApi } from "../../services/api";
import { useRouter } from "../../context/useRouter.js";

function ProblemMatchingTab({ problem, requiredExpertise }) {
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [startups, setStartups] = useState([]);
  const [msmes, setMsmes] = useState([]);

  useEffect(() => {
    let ignore = false;
    async function fetchMatches() {
      if (!problem?.id) return;
      try {
        const [facRes, stuRes, resRes, staRes, msmRes, chalRes] = await Promise.allSettled([
          matchingApi.getFacultyMatches(problem.id),
          matchingApi.getStudentMatches(problem.id),
          matchingApi.getResearcherMatches(problem.id),
          matchingApi.getStartupMatches(problem.id),
          matchingApi.getMsmeMatches(problem.id),
          challengeApi.createChallenge({
            title: problem.title,
            description: problem.description,
            district: problem.district,
            affected_people: problem.affected_people,
          }),
        ]);

        if (!ignore) {
          if (facRes.status === "fulfilled" && facRes.value?.matches) setFaculty(facRes.value.matches);
          if (stuRes.status === "fulfilled" && stuRes.value?.matches) setStudents(stuRes.value.matches);
          if (resRes.status === "fulfilled" && resRes.value?.matches) setResearchers(resRes.value.matches);
          if (staRes.status === "fulfilled" && staRes.value?.matches) setStartups(staRes.value.matches);
          if (msmRes.status === "fulfilled" && msmRes.value?.matches) setMsmes(msmRes.value.matches);
          if (chalRes.status === "fulfilled" && chalRes.value?.recommended_institutions) {
            setInstitutions(chalRes.value.recommended_institutions);
          }
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    }
    fetchMatches();
    return () => {
      ignore = true;
    };
  }, [problem]);

  return (
    <ExpertiseMatchingView
      institutions={institutions}
      faculty={faculty}
      students={students}
      researchers={researchers}
      startups={startups}
      msmes={msmes}
      loading={loading}
      requiredExpertise={requiredExpertise}
    />
  );
}

export function ProblemDetailPage({ id }) {
  const { navigate, query } = useRouter();

  const [problem, setProblem] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Default tab or query param tab (e.g. ?tab=solutions)
  const [activeTab, setActiveTab] = useState(query?.tab || "overview");

  const refreshProblem = async () => {
    if (!id) return;
    try {
      const [probRes, histRes] = await Promise.all([
        problemApi.getProblemById(id),
        problemApi.getProblemStatusHistory(id).catch(() => ({ history: [] })),
      ]);
      setProblem(probRes.problem);
      setStatusHistory(histRes.history || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load problem details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      if (!id) return;
      try {
        const [probRes, histRes] = await Promise.all([
          problemApi.getProblemById(id),
          problemApi.getProblemStatusHistory(id).catch(() => ({ history: [] })),
        ]);
        if (!ignore) {
          setProblem(probRes.problem);
          setStatusHistory(histRes.history || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load problem details");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <Icon name="spinner" size={36} color="var(--color-primary)" />
        <p style={{ margin: "1rem 0 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Loading problem lifecycle case...
        </p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <Card style={{ textAlign: "center", padding: "3rem 1.5rem", maxWidth: "600px", margin: "2rem auto" }}>
        <Icon name="alert-triangle" size={36} color="var(--color-danger)" />
        <h3 style={{ margin: "1rem 0 0.5rem", fontSize: "1.25rem" }}>Problem Not Found</h3>
        <p style={{ margin: "0 0 1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {error || "The requested problem ID does not exist or you do not have permission to view it."}
        </p>
        <Button variant="primary" onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </Button>
      </Card>
    );
  }

  // Parse required_expertise array
  let skills = [];
  if (Array.isArray(problem.required_expertise)) {
    skills = problem.required_expertise;
  } else if (typeof problem.required_expertise === "string") {
    try {
      skills = JSON.parse(problem.required_expertise);
    } catch {
      skills = problem.required_expertise.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Mock-aligned AI analysis object for AIAnalysisView re-use
  const aiAnalysisObj = {
    domain: problem.category,
    subdomain: problem.subcategory,
    summary: problem.ai_summary || problem.description,
    severity: problem.severity || 5,
    urgency: problem.urgency || 5,
    confidence: problem.confidence ? Number(problem.confidence) : 0.82,
    required_expertise: skills,
    keywords: Array.isArray(problem.keywords) ? problem.keywords : [],
  };

  const tabs = [
    { key: "overview", label: "Overview & Intelligence", icon: "cpu" },
    { key: "matching", label: "Expertise Matching", icon: "users" },
    { key: "root-causes", label: "Root Cause (RCA)", icon: "layers" },
    { key: "dependencies", label: "Dependencies", icon: "link" },
    { key: "solutions", label: "Solutions & Evaluation", icon: "check-circle" },
    { key: "implementation", label: "Implementation & Pilot", icon: "activity" },
    { key: "impact", label: "Impact & Verification", icon: "star" },
    { key: "history", label: "Status History", icon: "clock" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "3rem" }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <span
            style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: 600 }}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </span>
          <span>/</span>
          <span>Problems</span>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>#{problem.id}</span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="outline" size="sm" icon="arrow-left" onClick={() => navigate("/dashboard")}>
            Back
          </Button>
        </div>
      </div>

      {/* Hero Problem Case Header Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <StatusBadge status={problem.status} />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                }}
              >
                {problem.category} &bull; {problem.subcategory || "General"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ID: <strong>#{problem.id}</strong> &bull; Reported on {new Date(problem.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {problem.title}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span>
                📍 <strong>{problem.district || "District"}</strong>
                {problem.city && `, ${problem.city}`}
                {problem.address && ` (${problem.address})`}
              </span>
              {problem.affected_people && (
                <span>
                  👥 <strong>{Number(problem.affected_people).toLocaleString()}</strong> people affected
                </span>
              )}
            </div>
          </div>

          {/* Priority Score Widget */}
          <div
            style={{
              padding: "0.85rem 1.25rem",
              backgroundColor: "var(--bg-muted)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Civic Priority Score
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)", marginTop: "0.15rem" }}>
              {problem.priority_score || (problem.severity * 5 + problem.urgency * 5)}
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}> / 100</span>
            </div>
          </div>
        </div>

        {/* Required Expertise Chips */}
        {skills.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Required Expertise:
            </span>
            {skills.map((skill) => (
              <span
                key={skill}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-border)",
                }}
              >
                ✓ {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lifecycle Timeline */}
      <LifecycleTimeline problem={problem} onStatusUpdated={refreshProblem} />

      {/* Primary Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.35rem",
          overflowX: "auto",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.5rem",
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 0.95rem",
                fontSize: "0.85rem",
                fontWeight: isActive ? 700 : 500,
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all var(--transition-fast)",
              }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="cs-grid-2" style={{ alignItems: "start" }}>
            <Card title="Problem Description & Ground Context" subtitle="Citizen reported statement">
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {problem.description}
              </p>

              <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", fontSize: "0.85rem" }}>
                <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 700 }}>Geographic Details</h5>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", color: "var(--text-muted)" }}>
                  <div>District: <strong style={{ color: "var(--text-primary)" }}>{problem.district || "N/A"}</strong></div>
                  <div>City / Block: <strong style={{ color: "var(--text-primary)" }}>{problem.city || "N/A"}</strong></div>
                  <div>Address: <strong style={{ color: "var(--text-primary)" }}>{problem.address || "N/A"}</strong></div>
                  <div>Affected Population: <strong style={{ color: "var(--text-primary)" }}>{problem.affected_people || "N/A"}</strong></div>
                </div>
              </div>
            </Card>

            <AIAnalysisView aiAnalysis={aiAnalysisObj} priorityScore={problem.priority_score} />
          </div>
        )}

        {/* Tab 2: Expertise Matching */}
        {activeTab === "matching" && (
          <ProblemMatchingTab problem={problem} requiredExpertise={skills} />
        )}

        {/* Tab 3: Root Cause Analysis */}
        {activeTab === "root-causes" && (
          <RootCauseView problemId={problem.id} currentProblem={problem} />
        )}

        {/* Tab 4: Dependencies */}
        {activeTab === "dependencies" && (
          <DependencyGraphView problemId={problem.id} currentProblem={problem} />
        )}

        {/* Tab 5: Solutions & Evaluation */}
        {activeTab === "solutions" && (
          <SolutionsView problemId={problem.id} />
        )}

        {/* Tab 6: Implementation & Pilot */}
        {activeTab === "implementation" && (
          <ImplementationView problemId={problem.id} />
        )}

        {/* Tab 7: Impact & Verification */}
        {activeTab === "impact" && (
          <ImpactView problemId={problem.id} />
        )}

        {/* Tab 8: Status History / Audit Log */}
        {activeTab === "history" && (
          <Card title="Statutory Lifecycle Audit Trail" subtitle="Chronological record of status mutations">
            {statusHistory.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                No status transitions recorded yet. Problem is at initial <strong>{problem.status}</strong> stage.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {statusHistory.map((hist, i) => (
                  <div
                    key={hist.id || i}
                    style={{
                      padding: "0.85rem 1rem",
                      backgroundColor: "var(--bg-muted)",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "3px solid var(--color-primary)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {hist.old_status}
                        </span>
                        <span>&rarr;</span>
                        <StatusBadge status={hist.new_status} />
                      </div>
                      {hist.note && (
                        <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          &ldquo;{hist.note}&rdquo;
                        </p>
                      )}
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {hist.created_at ? new Date(hist.created_at).toLocaleString() : "Date recorded"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
