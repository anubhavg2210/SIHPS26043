import { useState, useEffect } from "react";
import { problemApi, reputationApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { ProblemCard } from "../problems/ProblemCard";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";
import { useTranslation } from "../../context/useTranslation";
import { useAuth } from "../../context/useAuth";

export function CitizenSection() {
  const { navigate } = useRouter();
  const { t, language } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [myProblems, setMyProblems] = useState([]);
  const [priorityProblems, setPriorityProblems] = useState([]);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setError("");
      try {
        const [myRes, allRes, repRes] = await Promise.allSettled([
          problemApi.getMyProblems(),
          problemApi.getProblems({ limit: 30 }),
          reputationApi.getMyReputation(),
        ]);

        if (!ignore) {
          if (myRes.status === "fulfilled") {
            const list = myRes.value?.problems || [];
            // Strictly ensure only current user's submitted reports are shown
            const userOnly = user?.id ? list.filter((p) => p.reporter_id === user.id) : list;
            setMyProblems(userOnly);
          }
          if (allRes.status === "fulfilled") {
            const all = allRes.value?.problems || [];
            // Filter out technical test records
            const isTestRecord = (item) => {
              const text = `${item.title || ""} ${item.description || ""}`;
              return /^(M\d+|Test\s+M\d+|Passport\s+Problem|Cit\d+|Auth\d+)/i.test(item.title || "") ||
                     /\b(M\d+|test-runner|synthetic-test-suite)\b/i.test(text);
            };
            const cleanProblems = all.filter((p) => !isTestRecord(p));
            // Filter high priority problems
            const high = cleanProblems
              .filter((p) => (p.priority_score ?? ((p.severity || 0) * 5 + (p.urgency || 0) * 5)) >= 60)
              .slice(0, 4);
            setPriorityProblems(high);
          }
          if (repRes.status === "fulfilled") {
            setReputation(repRes.value);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load citizen records");
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  // Compute live metrics from actual retrieved data
  const totalCount = myProblems.length;
  const underReviewCount = myProblems.filter((p) => p.status === "UNDER_REVIEW").length;
  const inProgressCount = myProblems.filter((p) =>
    ["ASSIGNED", "ROOT_CAUSE_ANALYSIS", "SOLUTION_SEARCH", "SOLUTION_EVALUATION", "APPROVED", "PILOT", "IMPLEMENTING"].includes(p.status)
  ).length;
  const resolvedCount = myProblems.filter((p) => p.status === "RESOLVED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overview Stat Grid from Real Data */}
      <div className="cs-grid-4">
        <StatCard
          title={t("dashboard.stats.reported")}
          value={loading ? "..." : String(totalCount)}
          subtitle={t("dashboard.stats.reportedSub")}
          icon="layers"
        />
        <StatCard
          title={t("dashboard.stats.underReview")}
          value={loading ? "..." : String(underReviewCount)}
          subtitle={t("dashboard.stats.underReviewSub")}
          icon="clock"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title={t("dashboard.stats.inProgress")}
          value={loading ? "..." : String(inProgressCount)}
          subtitle={t("dashboard.stats.inProgressSub")}
          icon="activity"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title={t("dashboard.stats.resolved")}
          value={loading ? "..." : String(resolvedCount)}
          subtitle={t("dashboard.stats.resolvedSub")}
          icon="shield-check"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Citizen Reputation & Civic Standing Bar */}
      {reputation && (
        <Card
          actions={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button variant="outline" size="sm" onClick={() => navigate("/reputation")}>
                {t("dashboard.reputation.viewBtn")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/notifications")}>
                {t("dashboard.reputation.notificationsBtn")}
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="award" size={24} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  {t("dashboard.reputation.title")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.15rem" }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {reputation.score || 0} {t("dashboard.reputation.points")}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--color-primary)",
                      color: "#ffffff",
                    }}
                  >
                    {reputation.tier || "BRONZE"} TIER
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {reputation.badges?.map((b) => (
                <span
                  key={b.badge_key || b.name}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  🏅 {b.name || b.badge_key}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Section: Problems I Reported */}
      <Card
        title={t("dashboard.recentReports.title")}
        subtitle={t("dashboard.recentReports.subtitle")}
        actions={
          <Button variant="primary" size="sm" icon="plus-circle" onClick={() => navigate("/report")}>
            {t("dashboard.reportProblemBtn")}
          </Button>
        }
      >
        {loading ? (
          <LoadingSkeleton lines={3} />
        ) : error ? (
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : myProblems.length === 0 ? (
          <EmptyState
            icon="layers"
            title={t("dashboard.recentReports.emptyTitle")}
            description={t("dashboard.recentReports.emptyDesc")}
            actionLabel={t("dashboard.recentReports.reportNow")}
            onAction={() => navigate("/report")}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {myProblems.map((problem) => (
              <div
                key={problem.id}
                onClick={() => navigate(`/problems/${problem.id}`)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <StatusBadge status={problem.status} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      #{problem.id} &bull; {new Date(problem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                    {problem.title}
                  </h4>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    📍 {problem.district || "District"} {problem.city ? `(${problem.city})` : ""}
                  </div>
                </div>

                <Button variant="outline" size="sm" icon="arrow-right">
                  {language === "hi" ? "केस देखें" : "View Case"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section: Priority Problems Across Platform */}
      {priorityProblems.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                {t("dashboard.prioritySection.title")}
              </h3>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {t("dashboard.prioritySection.subtitle")}
              </p>
            </div>

            <Button variant="outline" size="sm" icon="search" onClick={() => navigate("/explore")}>
              {t("dashboard.exploreBtn")}
            </Button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {priorityProblems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
