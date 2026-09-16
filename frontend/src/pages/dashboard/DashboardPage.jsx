import { useAuth } from "../../context/useAuth";
import { useRouter } from "../../context/useRouter";
import { StatusBadge } from "../../components/common/Badges";
import { Button } from "../../components/common/Button";
import { useTranslation } from "../../context/useTranslation";

// Role-specific sections
import { CitizenSection } from "../../components/dashboard/CitizenSection";
import { StudentSection } from "../../components/dashboard/StudentSection";
import { AuthoritySection } from "../../components/dashboard/AuthoritySection";
import { ResearcherSection } from "../../components/dashboard/ResearcherSection";
import { UniversitySection } from "../../components/dashboard/UniversitySection";
import { InnovationSection } from "../../components/dashboard/InnovationSection";
import { AdminSection } from "../../components/dashboard/AdminSection";

export function DashboardPage() {
  const { user, role } = useAuth();
  const { navigate } = useRouter();
  const { t } = useTranslation();

  const getRoleDescription = () => {
    switch (role) {
      case "CITIZEN":
        return "Civic Engagement & Ground-Truth Verification Hub";
      case "STUDENT":
        return "Academic Competency & Contribution Opportunity Hub";
      case "RESEARCHER":
        return "Applied Scientific Research & Root Cause Investigation Hub";
      case "UNIVERSITY":
        return "Institutional Participation & Departmental Mobilization Hub";
      case "STARTUP":
        return "Innovation Deployment & Pilot Scaling Hub";
      case "MSME":
        return "Technical Engineering & Local Implementation Hub";
      case "AUTHORITY":
        return "Municipal Command Center & Statutory Directive Oversight";
      case "ADMIN":
        return "System Governance & Multi-Role Platform Oversight";
      default:
        return "Civic Intelligence Platform";
    }
  };

  const renderRoleDashboard = () => {
    switch (role) {
      case "CITIZEN":
        return <CitizenSection />;
      case "STUDENT":
        return <StudentSection user={user} />;
      case "AUTHORITY":
        return <AuthoritySection />;
      case "RESEARCHER":
        return <ResearcherSection />;
      case "UNIVERSITY":
        return <UniversitySection />;
      case "STARTUP":
      case "MSME":
        return <InnovationSection role={role} />;
      case "ADMIN":
        return <AdminSection />;
      default:
        return <CitizenSection />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Shared Dashboard Welcome Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: role === "CITIZEN" ? 0 : "0.35rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              {t("dashboard.welcome")}, {user?.name || "Civic Leader"}
            </h1>
            <StatusBadge status={role} />
          </div>
          {role !== "CITIZEN" && (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {getRoleDescription()} &bull; SIH 2026 CivicSync Network
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {role === "CITIZEN" && (
            <Button
              variant="primary"
              icon="plus-circle"
              onClick={() => navigate("/report")}
            >
              {t("dashboard.reportProblemBtn")}
            </Button>
          )}

          <Button
            variant="outline"
            icon="search"
            onClick={() => navigate("/explore")}
          >
            {t("dashboard.exploreBtn")}
          </Button>
        </div>
      </div>

      {/* Shared Shell: Render Role-Specific Operational Content */}
      {renderRoleDashboard()}
    </div>
  );
}
