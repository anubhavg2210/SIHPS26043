import { useState, useEffect } from "react";
import { reputationApi } from "../../services/api";
import { Card } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { Badge, DemoBadge, StatusBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState("PEOPLE"); // PEOPLE | UNIVERSITIES | ORGANIZATIONS
  const [peopleRoleFilter, setPeopleRoleFilter] = useState("ALL"); // ALL | STUDENT | RESEARCHER | CITIZEN

  const [loading, setLoading] = useState(true);
  const [peopleRankings, setPeopleRankings] = useState([]);
  const [uniRankings, setUniRankings] = useState([]);
  const [orgRankings, setOrgRankings] = useState([]);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadRankingsData() {
      try {
        if (activeTab === "PEOPLE") {
          const params = { limit: 25 };
          if (peopleRoleFilter !== "ALL") {
            params.role = peopleRoleFilter;
          }
          const res = await reputationApi.getUserRankings(params);
          if (!ignore) {
            setPeopleRankings(Array.isArray(res?.users) ? res.users : []);
            setLoading(false);
          }
        } else if (activeTab === "UNIVERSITIES") {
          const res = await reputationApi.getUniversityRankings();
          if (!ignore) {
            setUniRankings(Array.isArray(res?.universities) ? res.universities : []);
            setLoading(false);
          }
        } else if (activeTab === "ORGANIZATIONS") {
          const res = await reputationApi.getOrganizationRankings();
          if (!ignore) {
            setOrgRankings(Array.isArray(res?.organizations) ? res.organizations : []);
            setLoading(false);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load rankings:", err);
          setError(err.message || "Unable to retrieve leaderboard standings");
          setLoading(false);
        }
      }
    }

    loadRankingsData();

    return () => {
      ignore = true;
    };
  }, [activeTab, peopleRoleFilter, reloadKey]);

  const getRankMedal = (rank) => {
    switch (rank) {
      case 1:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "#fef3c7",
              color: "#b45309",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "1px solid #fde68a",
            }}
          >
            🥇 1
          </span>
        );
      case 2:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "#f1f5f9",
              color: "#475569",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "1px solid #cbd5e1",
            }}
          >
            🥈 2
          </span>
        );
      case 3:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "#ffedd5",
              color: "#c2410c",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "1px solid #fed7aa",
            }}
          >
            🥉 3
          </span>
        );
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--bg-muted)",
              color: "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            #{rank}
          </span>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              CivicSync Leaderboards & Recognition
            </h1>
            <DemoBadge />
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Recognizing verified societal contributions, empirical diagnoses, and sustainable implementation across Jharkhand.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon="rotate-cw"
          onClick={() => {
            setLoading(true);
            setError("");
            setReloadKey((k) => k + 1);
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Main Tab Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant={activeTab === "PEOPLE" ? "primary" : "ghost"}
            size="sm"
            icon="users"
            onClick={() => {
              setActiveTab("PEOPLE");
              setLoading(true);
            }}
          >
            Contributors & Citizens
          </Button>
          <Button
            variant={activeTab === "UNIVERSITIES" ? "primary" : "ghost"}
            size="sm"
            icon="graduation-cap"
            onClick={() => {
              setActiveTab("UNIVERSITIES");
              setLoading(true);
            }}
          >
            Universities & Campuses
          </Button>
          <Button
            variant={activeTab === "ORGANIZATIONS" ? "primary" : "ghost"}
            size="sm"
            icon="building"
            onClick={() => {
              setActiveTab("ORGANIZATIONS");
              setLoading(true);
            }}
          >
            Startups & MSMEs
          </Button>
        </div>

        {/* Sub-filter for PEOPLE tab */}
        {activeTab === "PEOPLE" && (
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Role:
            </span>
            {["ALL", "STUDENT", "RESEARCHER", "CITIZEN"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setPeopleRoleFilter(r);
                  setLoading(true);
                }}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid",
                  borderColor: peopleRoleFilter === r ? "var(--color-primary)" : "var(--border-color)",
                  backgroundColor: peopleRoleFilter === r ? "var(--color-primary-subtle)" : "#ffffff",
                  color: peopleRoleFilter === r ? "var(--color-primary)" : "var(--text-secondary)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {r === "ALL" ? "All Roles" : r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <Card><LoadingSkeleton lines={6} /></Card>
      ) : error ? (
        <Card style={{ textAlign: "center", padding: "3rem", backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
          <Icon name="alert-circle" size={36} />
          <h4 style={{ margin: "0.75rem 0 0.25rem" }}>Unable to load leaderboards</h4>
          <p style={{ margin: "0 0 1rem", fontSize: "0.875rem" }}>{error}</p>
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
      ) : activeTab === "PEOPLE" ? (
        /* TAB 1: PEOPLE / CONTRIBUTORS */
        peopleRankings.length === 0 ? (
          <EmptyState
            icon="users"
            title="No contributors ranked yet"
            description="Verified student researchers, scientific advisors, and active citizens will appear here as reputation points are approved."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {peopleRankings.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  padding: "0.85rem 1.1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: "220px" }}>
                  {getRankMedal(user.rank)}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{user.name}</span>
                      <StatusBadge status={user.role} />
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Tier: <strong>{user.tier || "BRONZE"}</strong> &bull; #{user.id}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", fontSize: "0.85rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Rank Score</div>
                    <strong style={{ fontSize: "1.1rem", color: "var(--color-primary)" }}>
                      {user.current_rank_score || 0} pts
                    </strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Lifetime Points</div>
                    <strong>{user.lifetime_score || 0}</strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Verified Impact</div>
                    <strong style={{ color: "var(--color-success)" }}>
                      {user.verified_impact_score ? Number(user.verified_impact_score).toFixed(1) : "0.0"}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "UNIVERSITIES" ? (
        /* TAB 2: UNIVERSITIES */
        uniRankings.length === 0 ? (
          <EmptyState
            icon="graduation-cap"
            title="No universities ranked yet"
            description="Institutional standing aggregates active student and researcher contributions across academic departments."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {uniRankings.map((uni) => (
              <div
                key={uni.institution_id || uni.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  padding: "0.85rem 1.1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: "240px" }}>
                  {getRankMedal(uni.rank)}
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{uni.name}</span>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      📍 {uni.district ? `${uni.district}, ${uni.state || "Jharkhand"}` : "Jharkhand"} &bull; Tier: <strong>{uni.tier || "BRONZE"}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", fontSize: "0.85rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Campus Score</div>
                    <strong style={{ fontSize: "1.1rem", color: "var(--color-primary)" }}>
                      {uni.active_rank_score || 0} pts
                    </strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Students</div>
                    <strong>{uni.active_students_count || 0}</strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Researchers</div>
                    <strong>{uni.active_researchers_count || 0}</strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Approved Solutions</div>
                    <strong style={{ color: "var(--color-success)" }}>{uni.approved_solutions_count || 0}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* TAB 3: ORGANIZATIONS */
        orgRankings.length === 0 ? (
          <EmptyState
            icon="building"
            title="No organizations ranked yet"
            description="Startups and MSMEs are recognized through completed municipal pilot deployments and verified societal outcomes."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {orgRankings.map((org) => (
              <div
                key={org.organization_id || org.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  padding: "0.85rem 1.1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: "240px" }}>
                  {getRankMedal(org.rank)}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{org.name}</span>
                      <Badge variant={org.organization_type === "STARTUP" ? "primary" : "default"}>
                        {org.organization_type || "MSME"}
                      </Badge>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      📍 {org.district || "Jharkhand"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", fontSize: "0.85rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Score</div>
                    <strong style={{ fontSize: "1.1rem", color: "var(--color-primary)" }}>
                      {org.active_rank_score || 0} pts
                    </strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Completed Pilots</div>
                    <strong>{org.completed_pilots_count || 0}</strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Verified Impact</div>
                    <strong style={{ color: "var(--color-success)" }}>
                      {org.verified_impact_score ? Number(org.verified_impact_score).toFixed(1) : "0.0"}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* "How Ranking Works" Educational Section */}
      <Card
        title="How CivicSync Recognition & Ranking Operates"
        subtitle="Rigorous evidence standards, rolling time-decay, and anti-gaming principles"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", fontSize: "0.85rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "0.35rem" }}>
              <Icon name="shield-check" size={16} />
              <span>Verified Contributions Only</span>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Reputation is earned exclusively when submissions pass authority review, root-cause diagnoses achieve technical verification, and implementation pilots deliver documented impact.
            </p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--color-success)", marginBottom: "0.35rem" }}>
              <Icon name="clock" size={16} />
              <span>Rolling Time-Weighted Decay</span>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Active rank scores reflect sustained participation: contributions count 100% in Year 1, 50% in Year 2, and 25% thereafter, ensuring leaderboards remain vibrant and active.
            </p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--color-warning)", marginBottom: "0.35rem" }}>
              <Icon name="lock" size={16} />
              <span>Authority & Admin Exclusion</span>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Municipal authorities and administrators oversee governance, verification, and statutory evaluation; they are strictly excluded from earning points and competing on leaderboards.
            </p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--color-secondary)", marginBottom: "0.35rem" }}>
              <Icon name="zap" size={16} />
              <span>Quality Multipliers</span>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Higher quality peer evaluations, verified community satisfaction, and sustained long-term metrics grant multipliers, while spam or duplicate proposals are rejected.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
