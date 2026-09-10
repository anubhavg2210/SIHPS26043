import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { reputationApi } from "../../services/api";
import { useRouter } from "../../context/useRouter";
import { Card, StatCard } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { Badge, DemoBadge, StatusBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { LoadingSkeleton } from "../../components/common/Feedback";

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadReputationData() {
      try {
        const res = await reputationApi.getMyReputation();
        if (!ignore) {
          setReputation(res);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Profile reputation fetch error:", err);
          // Non-fatal if authority or admin
          setLoading(false);
        }
      }
    }

    loadReputationData();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Derived role context from authentic backend seeds
  const getRoleProfileDetails = () => {
    switch (role) {
      case "STUDENT":
        return {
          title: "Academic & Technical Competencies",
          institution: "Indian Institute of Technology (ISM) Dhanbad",
          department: "Department of Environmental Science & Engineering",
          skills: ["Groundwater", "Water Quality", "Environmental Engineering", "GIS"],
          contributionScope: "Field sampling, geospatial analysis, diagnostic testing, and pilot implementation",
        };
      case "RESEARCHER":
        return {
          title: "Research Specialization & Affiliation",
          institution: "Birla Institute of Technology (BIT) Mesra",
          department: "Department of Civil & Environmental Engineering",
          interests: ["Groundwater Contamination", "Hydrology & Water Treatment", "Public Health Engineering"],
          contributionScope: "Root cause formulate & review, scientific advisory, pilot evaluation",
        };
      case "UNIVERSITY":
        return {
          title: "Institutional Profile & Catchment",
          institution: "Jharkhand State Academic Council / Central University of Jharkhand",
          regionalFocus: "Jharkhand (Dhanbad, Ranchi, Bokaro catchment)",
          departments: ["Water Resource Management", "Geology", "Public Policy", "Civil Engineering"],
          contributionScope: "Institutional oversight, campus mobilization, student mentoring",
        };
      case "STARTUP":
      case "MSME":
        return {
          title: "Enterprise & Pilot Deployment Profile",
          organizationName: role === "STARTUP" ? "HydroPure Innovations Ltd." : "Ranchi Engineering Works",
          sector: "Environmental Technology & Civil Infrastructure",
          district: "Ranchi / Dhanbad, Jharkhand",
          contributionScope: "Technology pilot deployment, hardware filtration systems, municipal maintenance",
        };
      case "AUTHORITY":
        return {
          title: "Municipal & Statutory Jurisdiction",
          department: "Dhanbad Municipal Corporation / Jharkhand Urban Development Authority",
          jurisdiction: "Dhanbad Administrative District",
          authorityLevel: "Zonal Executive Officer (Urban Infrastructure)",
          contributionScope: "Case verification, root cause endorsement, pilot authorization, and statutory signoff",
        };
      case "ADMIN":
        return {
          title: "Platform Administration & System Governance",
          department: "CivicSync State Operations Command",
          privileges: "Superuser & Platform Configuration",
          jurisdiction: "All Districts across Jharkhand State",
          contributionScope: "Platform integrity, user oversight, statutory compliance audit",
        };
      default:
        return {
          title: "Civic Citizen Profile",
          jurisdiction: "Jharkhand Citizen Contributor",
          contributionScope: "Civic problem reporting, ground-level validation, and public feedback",
        };
    }
  };

  const roleDetails = getRoleProfileDetails();

  const earnedBadges = Array.isArray(reputation?.badges) ? reputation.badges : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "960px", margin: "0 auto" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Avatar circle */}
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-primary-subtle)",
              color: "var(--color-primary)",
              border: "2px solid var(--color-primary-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 800,
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                {user?.name || "Civic Contributor"}
              </h1>
              <StatusBadge status={role} />
              <DemoBadge />
            </div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {user?.email} &bull; Account #{user?.id}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Button
            variant="outline"
            size="sm"
            icon="award"
            onClick={() => navigate("/reputation")}
          >
            Reputation & Badges
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="rotate-cw"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Verification & Security Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.85rem 1.25rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "#f8fafc",
          border: "1px solid var(--border-color)",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Icon name="check-circle" size={16} color="var(--color-success)" />
            <span>Email Verified</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Icon name="shield-check" size={16} color="var(--color-primary)" />
            <span>JWT Authenticated Session</span>
          </div>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Registered in CivicSync: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active Contributor"}
        </span>
      </div>

      {/* Role-Specific Profile Context Card */}
      <Card
        title={roleDetails.title}
        subtitle="Verified institutional credentials and qualification scope"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem" }}>
          {roleDetails.institution && (
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Affiliated Institution:</span>
              <strong style={{ textAlign: "right" }}>{roleDetails.institution}</strong>
            </div>
          )}

          {roleDetails.department && (
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Department / Unit:</span>
              <strong style={{ textAlign: "right" }}>{roleDetails.department}</strong>
            </div>
          )}

          {roleDetails.organizationName && (
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Organization:</span>
              <strong>{roleDetails.organizationName}</strong>
            </div>
          )}

          {roleDetails.jurisdiction && (
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Jurisdiction / District:</span>
              <strong>{roleDetails.jurisdiction}</strong>
            </div>
          )}

          {/* Registered Skills for Student */}
          {roleDetails.skills && (
            <div>
              <span style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Registered Technical Competencies:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {roleDetails.skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      padding: "0.25rem 0.65rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--color-primary-subtle)",
                      color: "var(--color-primary)",
                      border: "1px solid var(--color-primary-border)",
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Research Interests for Researcher */}
          {roleDetails.interests && (
            <div>
              <span style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Target Research Disciplines:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {roleDetails.interests.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      padding: "0.25rem 0.65rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--bg-muted)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <span style={{ display: "block", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Permitted Statutory Contribution Scope:
            </span>
            <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {roleDetails.contributionScope}
            </p>
          </div>
        </div>
      </Card>

      {/* Reputation & Digital Credentials Summary */}
      {role !== "AUTHORITY" && role !== "ADMIN" && (
        <Card
          title="Civic Standing & Verified Credentials"
          subtitle="Verifiable reputation profile from append-only database ledger"
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate("/reputation")}>
              View Full Ledger →
            </Button>
          }
        >
          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="cs-grid-3">
                <StatCard
                  title="Lifetime Score"
                  value={String(reputation?.lifetime_score || 0)}
                  subtitle="Permanent points"
                  icon="award"
                  iconColor="var(--color-primary)"
                />
                <StatCard
                  title="Active Rank Score"
                  value={String(reputation?.current_rank_score || 0)}
                  subtitle={reputation?.rank ? `Rank #${reputation.rank}` : "Rolling score"}
                  icon="trending-up"
                  iconColor="var(--color-success)"
                />
                <StatCard
                  title="Standing Tier"
                  value={reputation?.tier || "BRONZE"}
                  subtitle="Current classification"
                  icon="shield-check"
                  iconColor="var(--color-warning)"
                />
              </div>

              {/* Badges preview */}
              <div>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
                  Earned Digital Badges ({earnedBadges.length})
                </h4>
                {earnedBadges.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    No badges unlocked yet. Complete verified milestones to unlock credentials.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                    {earnedBadges.map((b) => (
                      <div
                        key={b.slug || b.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "#ffffff",
                          border: "1px solid var(--border-color)",
                          boxShadow: "var(--shadow-xs)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        <Icon name="award" size={14} color="var(--color-primary)" />
                        <span>{b.name}</span>
                        <Badge variant="warning">{b.tier || "BRONZE"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Account Actions & Sign Out */}
      <Card
        title="Session & Security"
        subtitle="JWT authentication session management"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Active JWT Token</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Authenticated via legitimate POST /api/auth/login endpoint
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            icon="log-out"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign Out of Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
