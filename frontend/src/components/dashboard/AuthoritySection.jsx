import { useState, useEffect } from "react";
import { authorityDashboardApi } from "../../services/api";
import { Card, StatCard } from "../common/Cards";
import { Button } from "../common/Button";
import { StatusBadge, PriorityBadge } from "../common/Badges";
import { Icon } from "../common/Icons";
import { EmptyState, LoadingSkeleton } from "../common/Feedback";
import { useRouter } from "../../context/useRouter";

export function AuthoritySection() {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [districtAnalytics, setDistrictAnalytics] = useState([]);
  const [statusAnalytics, setStatusAnalytics] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadAuthorityData() {
      try {
        const [sumRes, prioRes, distRes, statRes, clustRes, recRes] = await Promise.all([
          authorityDashboardApi.getSummary(),
          authorityDashboardApi.getPriority(8),
          authorityDashboardApi.getDistricts(),
          authorityDashboardApi.getStatusAnalytics(),
          authorityDashboardApi.getClusters(),
          authorityDashboardApi.getRecent(8),
        ]);

        if (!ignore) {
          setSummary(sumRes);
          setPriorityQueue(Array.isArray(prioRes?.problems) ? prioRes.problems : []);
          setDistrictAnalytics(Array.isArray(distRes?.districts) ? distRes.districts : (Array.isArray(distRes) ? distRes : []));
          setStatusAnalytics(Array.isArray(statRes?.statuses) ? statRes.statuses : (Array.isArray(statRes) ? statRes : []));
          setClusters(Array.isArray(clustRes?.clusters) ? clustRes.clusters : (Array.isArray(clustRes) ? clustRes : []));
          setRecentActivity(Array.isArray(recRes?.activities) ? recRes.activities : (Array.isArray(recRes) ? recRes : []));
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Authority dashboard fetch error:", err);
          setError(err.message || "Failed to load municipal operational dashboard data");
          setLoading(false);
        }
      }
    }

    loadAuthorityData();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="cs-grid-4">
          <Card><LoadingSkeleton lines={2} /></Card>
          <Card><LoadingSkeleton lines={2} /></Card>
          <Card><LoadingSkeleton lines={2} /></Card>
          <Card><LoadingSkeleton lines={2} /></Card>
        </div>
        <Card><LoadingSkeleton lines={5} /></Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ textAlign: "center", padding: "3rem", backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
        <Icon name="alert-circle" size={36} />
        <h3 style={{ margin: "0.75rem 0 0.25rem" }}>Operational Dashboard Unavailable</h3>
        <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>{error}</p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setLoading(true);
            setError("");
            setReloadKey((k) => k + 1);
          }}
        >
          Retry Connection
        </Button>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 1. Summary Metrics from /api/authority/dashboard/summary */}
      {summary && (
        <div className="cs-grid-4">
          <StatCard
            title="Total Civic Cases"
            value={String(summary.total_problems || 0)}
            subtitle={`${summary.reported || 0} newly reported`}
            icon="layers"
          />
          <StatCard
            title="Critical Priority"
            value={String(summary.critical_priority || 0)}
            subtitle={`${summary.high_priority || 0} high-priority`}
            icon="alert-triangle"
            iconColor="var(--color-danger)"
          />
          <StatCard
            title="In Active Progress"
            value={String(summary.in_progress || 0)}
            subtitle={`${summary.under_review || 0} under review`}
            icon="activity"
            iconColor="var(--color-primary)"
          />
          <StatCard
            title="Problem Clusters"
            value={String(summary.total_clusters || 0)}
            subtitle={`${summary.resolved || 0} cases resolved`}
            icon="share-2"
            iconColor="var(--color-secondary)"
          />
        </div>
      )}

      {/* 2. Priority Problems Queue from /api/authority/dashboard/priority */}
      <Card
        title="High-Priority Escalation Queue"
        subtitle="Cases with priority score ≥ 60 requiring statutory verification, RCA, or solution evaluation"
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="ghost" size="sm" icon="bell" onClick={() => navigate("/notifications")}>
              View Notifications →
            </Button>
            <Button variant="outline" size="sm" icon="external-link" onClick={() => navigate("/explore")}>
              Full Catalog
            </Button>
          </div>
        }
      >
        {!Array.isArray(priorityQueue) || priorityQueue.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="Operational Queue Clear"
            description="No unassigned or critical priority civic challenges requiring immediate authority escalation."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {priorityQueue.map((prob) => {
              const prio = prob.priority_score ?? ((prob.severity || 0) * 5 + (prob.urgency || 0) * 5);
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
                    e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <PriorityBadge priority={prio} />
                      <StatusBadge status={prob.status} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{prob.id} &bull; 📍 {prob.district || "District"}
                      </span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                      {prob.title}
                    </h4>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <div>Severity: <strong>{prob.severity}/10</strong></div>
                      <div>Urgency: <strong>{prob.urgency}/10</strong></div>
                    </div>

                    <Button variant="primary" size="sm" icon="arrow-right">
                      Direct Case
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 3. District & Status Distribution Row */}
      <div className="cs-grid-2" style={{ alignItems: "start" }}>
        {/* District Distribution from /api/authority/dashboard/districts */}
        <Card
          title="District Problem Distribution"
          subtitle="Administrative concentration from municipal database"
        >
          {!Array.isArray(districtAnalytics) || districtAnalytics.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No district data recorded</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {districtAnalytics.map((dist) => (
                <div
                  key={dist.district}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>📍 {dist.district}</span>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--color-danger)" }}>
                      {dist.high_priority} High Prio
                    </span>
                    <span style={{ color: "var(--color-success)" }}>
                      {dist.resolved} Resolved
                    </span>
                    <strong style={{ backgroundColor: "#ffffff", padding: "0.1rem 0.45rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                      {dist.total_problems} Total
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Status Distribution from /api/authority/dashboard/status */}
        <Card
          title="Lifecycle Status Breakdown"
          subtitle="Active cases by statutory resolution stage"
        >
          {!Array.isArray(statusAnalytics) || statusAnalytics.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No status data recorded</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {statusAnalytics.map((st) => (
                <div
                  key={st.status}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.85rem",
                  }}
                >
                  <StatusBadge status={st.status} />
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {st.count} case{st.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 4. Clusters & Recent Activity Row */}
      <div className="cs-grid-2" style={{ alignItems: "start" }}>
        {/* Clusters from /api/authority/dashboard/clusters */}
        <Card
          title="Clustered Problem Groups"
          subtitle="Geographically or thematically related community issues"
        >
          {!Array.isArray(clusters) || clusters.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No active clusters detected</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {clusters.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h5 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
                      {c.cluster_name}
                    </h5>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-primary-subtle)",
                        color: "var(--color-primary)",
                        fontWeight: 600,
                      }}
                    >
                      {c.category}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                    <span>📍 {c.district || "District"}</span>
                    <span><strong>{c.confirmed_report_count || c.report_count}</strong> merged reports</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity from /api/authority/dashboard/recent */}
        <Card
          title="Chronological Audit Activity"
          subtitle="Latest updates and municipal mutations"
        >
          {!Array.isArray(recentActivity) || recentActivity.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No recent activity recorded</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {recentActivity.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => navigate(`/problems/${rec.id}`)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "#ffffff",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    fontSize: "0.825rem",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{rec.title}</span>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {rec.district} &bull; {new Date(rec.updated_at || rec.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <StatusBadge status={rec.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
