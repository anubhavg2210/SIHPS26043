import { useState, useEffect } from "react";
import { reputationApi } from "../../services/api";
import { useRouter } from "../../context/useRouter";
import { Card, StatCard } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { Badge, DemoBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { EmptyState, LoadingSkeleton } from "../../components/common/Feedback";

// Official backend tier thresholds from reputationService.js / Migration 014
const BACKEND_TIERS = [
  { name: "DIAMOND", min: 2500, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { name: "PLATINUM", min: 1000, color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
  { name: "GOLD", min: 500, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { name: "SILVER", min: 200, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  { name: "BRONZE", min: 0, color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
];

// Standard 15 platform badges from backend Migration 014
const STANDARD_BADGES = [
  { slug: "civic-scout", name: "Civic Scout", category: "CITIZEN", tier: "BRONZE", description: "Reported 1 authority-verified civic problem", criteria: "1 verified problem" },
  { slug: "civic-guardian", name: "Civic Guardian", category: "CITIZEN", tier: "SILVER", description: "Reported 5 verified problems and provided constructive community validation", criteria: "5 verified problems" },
  { slug: "community-champion", name: "Community Champion", category: "CITIZEN", tier: "GOLD", description: "10 verified problems leading to verified societal resolution", criteria: "10 verified problems" },

  { slug: "problem-solver", name: "Problem Solver", category: "STUDENT", tier: "BRONZE", description: "Designed 1 approved technical solution for a verified societal problem", criteria: "1 approved solution" },
  { slug: "field-builder", name: "Field Builder", category: "STUDENT", tier: "SILVER", description: "Successfully executed 3 verified pilot implementation milestones", criteria: "3 completed milestones" },
  { slug: "civic-innovator", name: "Civic Innovator", category: "STUDENT", tier: "GOLD", description: "Led or contributed to a completed pilot with verified societal impact score >= 75", criteria: "Impact score >= 75" },

  { slug: "root-cause-analyst", name: "Root Cause Analyst", category: "RESEARCHER", tier: "BRONZE", description: "Formulated 2 authority-verified root cause diagnoses", criteria: "2 verified root causes" },
  { slug: "scientific-advisor", name: "Scientific Advisor", category: "RESEARCHER", tier: "SILVER", description: "Served as technical advisor on 2 approved municipal solutions", criteria: "2 solution advisories" },
  { slug: "impact-scholar", name: "Societal Impact Scholar", category: "RESEARCHER", tier: "GOLD", description: "Research lead on an implementation with verified societal impact score >= 85", criteria: "Lead impact score >= 85" },

  { slug: "active-campus", name: "Active Campus", category: "UNIVERSITY", tier: "BRONZE", description: "Institution with 5+ actively participating students and researchers", criteria: "5+ active contributors" },
  { slug: "civic-hub", name: "Civic Innovation Hub", category: "UNIVERSITY", tier: "SILVER", description: "3 approved municipal solutions originating from campus researchers or students", criteria: "3 approved solutions" },
  { slug: "impact-campus", name: "Impact Campus of the Year", category: "UNIVERSITY", tier: "GOLD", description: "2 completed implementations with verified sustained societal outcomes", criteria: "2 sustained outcomes" },

  { slug: "societal-innovator", name: "Societal Innovator", category: "STARTUP_MSME", tier: "BRONZE", description: "Startup or MSME with 1 approved civic challenge solution", criteria: "1 approved solution" },
  { slug: "pilot-deployer", name: "Pilot Deployer", category: "STARTUP_MSME", tier: "SILVER", description: "Successfully completed 1 municipal pilot project deployment", criteria: "1 completed pilot" },
  { slug: "sustainable-impact-partner", name: "Sustainable Impact Partner", category: "STARTUP_MSME", tier: "GOLD", description: "2 completed deployments with verified impact score >= 80", criteria: "2 pilots with impact >= 80" },
];

export default function ReputationPage() {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState(null);
  const [error, setError] = useState("");
  const [activeBadgeTab, setActiveBadgeTab] = useState("EARNED"); // EARNED | ALL
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadReputation() {
      try {
        const res = await reputationApi.getMyReputation();
        if (!ignore) {
          setReputation(res);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Reputation load error:", err);
          setError(err.message || "Unable to retrieve reputation ledger");
          setLoading(false);
        }
      }
    }

    loadReputation();

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
        <Card><LoadingSkeleton lines={6} /></Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ textAlign: "center", padding: "3rem", backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
        <Icon name="alert-circle" size={36} />
        <h3 style={{ margin: "0.75rem 0 0.25rem" }}>Reputation Ledger Unavailable</h3>
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
    );
  }

  const currentTierName = (reputation?.tier || "BRONZE").toUpperCase();
  const currentTierInfo = BACKEND_TIERS.find((t) => t.name === currentTierName) || BACKEND_TIERS[4];

  // Calculate deterministic progress to next tier
  const tierIndex = BACKEND_TIERS.findIndex((t) => t.name === currentTierName);
  const nextTier = tierIndex > 0 ? BACKEND_TIERS[tierIndex - 1] : null;
  const currentRankScore = Number(reputation?.current_rank_score || 0);

  let tierProgressPct = 100;
  let pointsToNext = 0;
  if (nextTier) {
    const range = nextTier.min - currentTierInfo.min;
    const progress = Math.max(0, currentRankScore - currentTierInfo.min);
    tierProgressPct = Math.min(100, Math.round((progress / range) * 100));
    pointsToNext = Math.max(0, nextTier.min - currentRankScore);
  }

  const earnedBadges = Array.isArray(reputation?.badges) ? reputation.badges : [];
  const earnedSlugs = new Set(earnedBadges.map((b) => b.slug));

  const recentEvents = Array.isArray(reputation?.recent_events) ? reputation.recent_events : [];

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
              Civic Reputation & Digital Credentials
            </h1>
            <DemoBadge />
            <Badge variant="warning">{currentTierName} TIER</Badge>
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Verifiable, evidence-backed societal contributions across Jharkhand. Governed by append-only ledger entries.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button
            variant="outline"
            size="sm"
            icon="trending-up"
            onClick={() => navigate("/rankings")}
          >
            View Leaderboards
          </Button>
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
      </div>

      {/* Core Principle Notice: Lifetime Reputation vs Current Ranking Score */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "#f8fafc",
          border: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.85rem",
        }}
      >
        <Icon name="info" size={20} color="var(--color-primary)" />
        <div style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Understanding CivicSync Recognition:</strong>
          <br />
          &bull; <strong>Lifetime Reputation ({reputation?.lifetime_score || 0} pts):</strong> Permanent, cumulative points earned across all approved civic reports, root-cause diagnoses, and completed pilots.
          <br />
          &bull; <strong>Current Ranking Score ({reputation?.current_rank_score || 0} pts):</strong> Rolling time-weighted score used for active leaderboard standings (100% value within 365 days, 50% between 1–2 years, 25% thereafter) to reward sustained civic engagement.
        </div>
      </div>

      {/* KPI Stat Cards Row */}
      <div className="cs-grid-4">
        <StatCard
          title="Lifetime Reputation"
          value={String(reputation?.lifetime_score || 0)}
          subtitle="Cumulative verified points"
          icon="award"
          iconColor="var(--color-primary)"
        />
        <StatCard
          title="Active Ranking Score"
          value={String(reputation?.current_rank_score || 0)}
          subtitle={reputation?.rank ? `Rank #${reputation.rank} among peers` : "Active rolling standing"}
          icon="trending-up"
          iconColor="var(--color-success)"
        />
        <StatCard
          title="Verified Impact Score"
          value={reputation?.verified_impact_score ? Number(reputation.verified_impact_score).toFixed(1) : "0.0"}
          subtitle="Statutorily audited civic impact"
          icon="activity"
          iconColor="var(--color-warning)"
        />
        <StatCard
          title="Approved Solutions"
          value={String(reputation?.approved_solutions || 0)}
          subtitle={`${reputation?.completed_implementations || 0} implementations finished`}
          icon="cpu"
          iconColor="var(--color-secondary)"
        />
      </div>

      {/* Tier Progression Card */}
      <Card
        title="Standing Tier Progression"
        subtitle={`Current tier: ${currentTierName} • Deterministic threshold criteria`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
              <span style={{ fontWeight: 600 }}>
                {nextTier ? `Progress to ${nextTier.name}` : "Maximum Standing Achieved"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {currentRankScore} / {nextTier ? nextTier.min : currentTierInfo.min} pts ({tierProgressPct}%)
              </span>
            </div>

            {/* Custom progress bar */}
            <div
              style={{
                height: "10px",
                width: "100%",
                backgroundColor: "var(--bg-muted)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${tierProgressPct}%`,
                  backgroundColor: currentTierInfo.color,
                  borderRadius: "var(--radius-full)",
                  transition: "width var(--transition-normal)",
                }}
              />
            </div>

            {nextTier && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Earn <strong>{pointsToNext} more points</strong> in active rolling contributions to advance to {nextTier.name}.
              </p>
            )}
          </div>

          {/* Tier Milestones Roadmap */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {BACKEND_TIERS.slice().reverse().map((t) => {
              const reached = currentRankScore >= t.min;
              const isCurrent = t.name === currentTierName;

              return (
                <div
                  key={t.name}
                  style={{
                    flex: "1 1 150px",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${isCurrent ? t.color : "var(--border-color)"}`,
                    backgroundColor: isCurrent ? t.bg : reached ? "#ffffff" : "var(--bg-muted)",
                    opacity: reached ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: t.color }}>
                      {t.name}
                    </span>
                    {reached && <Icon name="check-circle" size={14} color={t.color} />}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {t.min} pts threshold
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Two-Column Grid: Contribution History & Digital Credentials */}
      <div className="cs-grid-2" style={{ alignItems: "start" }}>
        {/* 1. Contribution History Timeline */}
        <Card
          title="Verifiable Event History"
          subtitle="Append-only reputation ledger records"
        >
          {recentEvents.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No events recorded"
              description="Reputation points are awarded when municipal authorities verify problem submissions, validate root-cause analyses, or approve implementation milestones."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {recentEvents.map((ev) => {
                const isPositive = ev.points >= 0;

                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.85rem",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {/* Points Badge */}
                    <div
                      style={{
                        padding: "0.35rem 0.6rem",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: isPositive ? "var(--color-success-subtle)" : "var(--color-danger-subtle)",
                        color: isPositive ? "var(--color-success)" : "var(--color-danger)",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        minWidth: "60px",
                        textAlign: "center",
                      }}
                    >
                      {isPositive ? `+${ev.points}` : ev.points}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                          {ev.contribution_type ? ev.contribution_type.replace(/_/g, " ") : "Contribution"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(ev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {ev.description || "Verified civic contribution"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 2. Digital Badges & Micro-Credentials */}
        <Card
          title="Digital Credentials & Badges"
          subtitle="Statutorily verified competencies & milestones"
          actions={
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <Button
                variant={activeBadgeTab === "EARNED" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveBadgeTab("EARNED")}
              >
                Earned ({earnedBadges.length})
              </Button>
              <Button
                variant={activeBadgeTab === "ALL" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveBadgeTab("ALL")}
              >
                All Badges ({STANDARD_BADGES.length})
              </Button>
            </div>
          }
        >
          {activeBadgeTab === "EARNED" && earnedBadges.length === 0 ? (
            <EmptyState
              icon="award"
              title="No badges earned yet"
              description="Digital badges are automatically awarded upon completing verified problem evaluations, advisory milestones, and societal impact verifications."
              actionLabel="Explore Available Badges"
              onAction={() => setActiveBadgeTab("ALL")}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(activeBadgeTab === "EARNED"
                ? earnedBadges
                : STANDARD_BADGES
              ).map((badge) => {
                const isEarned = earnedSlugs.has(badge.slug);
                const awardedInfo = earnedBadges.find((b) => b.slug === badge.slug);

                return (
                  <div
                    key={badge.slug || badge.id}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-sm)",
                      border: isEarned
                        ? "1px solid var(--color-primary-border)"
                        : "1px dashed var(--border-color)",
                      backgroundColor: isEarned ? "#ffffff" : "var(--bg-muted)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.85rem",
                      opacity: isEarned ? 1 : 0.7,
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: isEarned ? "var(--color-primary-subtle)" : "var(--border-color)",
                        color: isEarned ? "var(--color-primary)" : "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={isEarned ? "award" : "lock"} size={18} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                          {badge.name}
                        </span>
                        <Badge variant={badge.tier === "GOLD" ? "warning" : badge.tier === "SILVER" ? "default" : "info"}>
                          {badge.tier}
                        </Badge>
                        {isEarned && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: "var(--color-success)",
                              backgroundColor: "var(--color-success-subtle)",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            EARNED
                          </span>
                        )}
                      </div>

                      <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {badge.description}
                      </p>

                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Criteria: <strong>{badge.criteria || "Verified municipal milestone"}</strong>
                        {awardedInfo?.awarded_at && (
                          <span> &bull; Awarded {new Date(awardedInfo.awarded_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
