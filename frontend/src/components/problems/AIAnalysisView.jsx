import { Card } from "../common/Cards";
import { Badge } from "../common/Badges";
import { Icon } from "../common/Icons";

export function AIAnalysisView({ analysis, priorityScore = null, duplicateCheck = null, clusterCheck = null }) {
  if (!analysis) return null;

  const confidencePercent = analysis.confidence
    ? Math.round(Number(analysis.confidence) * (Number(analysis.confidence) <= 1 ? 100 : 1))
    : 80;

  const severityNum = Number(analysis.severity) || 7;
  const urgencyNum = Number(analysis.urgency) || 7;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header Badge Card */}
      <Card
        title="Rule-Based NLP & Problem Classification Engine"
        subtitle="Automated domain classification and capability extraction"
        actions={
          <Badge variant="primary" style={{ textTransform: "none", fontSize: "0.78rem" }}>
            <Icon name="cpu" size={13} />
            <span>Rule-Based NLP Engine</span>
          </Badge>
        }
      >
        {/* Transparent Disclaimer */}
        <div
          style={{
            padding: "0.6rem 0.85rem",
            backgroundColor: "var(--bg-muted)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-color)",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Icon name="help-circle" size={15} color="var(--text-muted)" />
          <span>
            AI-generated classification — rule-based NLP MVP. Verify all parameters before operational decisions.
          </span>
        </div>

        {/* 4 KPI Metric Tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              padding: "0.85rem",
              backgroundColor: "var(--bg-muted)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Primary Domain
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.2rem" }}>
              {analysis.domain || "General"}
            </div>
          </div>

          <div
            style={{
              padding: "0.85rem",
              backgroundColor: "var(--bg-muted)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Subdomain
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.2rem" }}>
              {analysis.subdomain || "General"}
            </div>
          </div>

          <div
            style={{
              padding: "0.85rem",
              backgroundColor: "var(--bg-muted)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Severity & Urgency
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginTop: "0.2rem" }}>
              {severityNum}/10 &bull; {urgencyNum}/10
            </div>
          </div>

          <div
            style={{
              padding: "0.85rem",
              backgroundColor: "var(--color-primary-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-primary-border)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--color-primary)", textTransform: "uppercase", fontWeight: 600 }}>
              Confidence
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-primary)", marginTop: "0.2rem" }}>
              {confidencePercent}%
            </div>
          </div>
        </div>

        {/* Priority Score & Problem Type Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Problem Type:{" "}
            </span>
            <strong style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>
              {analysis.problem_type || "Societal Need"}
            </strong>
          </div>

          {priorityScore !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Calculated Priority Score:
              </span>
              <span
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  color: priorityScore > 60 ? "var(--color-danger)" : "var(--color-primary)",
                  backgroundColor: priorityScore > 60 ? "var(--color-danger-subtle)" : "var(--color-primary-subtle)",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${priorityScore > 60 ? "var(--color-danger-border)" : "var(--color-primary-border)"}`,
                }}
              >
                {priorityScore}/100
              </span>
            </div>
          )}
        </div>

        {/* Problem Summary */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "0.4rem",
            }}
          >
            Synthesized Summary
          </div>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              margin: 0,
              backgroundColor: "var(--bg-muted)",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
            }}
          >
            {analysis.summary || "Problem statement processed and indexed."}
          </p>
        </div>

        {/* REQUIRED EXPERTISE SECTION — THE CORE TRANSITION */}
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--color-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "0.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Icon name="target" size={15} color="var(--color-primary)" />
            <span>Required Expertise Capabilities ({analysis.required_expertise?.length || 0})</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {analysis.required_expertise?.map((skill) => (
              <span
                key={skill}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.85rem",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "1px solid var(--color-primary-border)",
                }}
              >
                <Icon name="check" size={13} color="var(--color-primary)" />
                <span>{skill}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Duplicate and Cluster Insights (if available from problem creation) */}
        {(duplicateCheck || clusterCheck) && (
          <div
            style={{
              marginTop: "1.25rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: "1.5rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}
          >
            {duplicateCheck && (
              <div>
                <span>Duplicate Check: </span>
                <strong style={{ color: duplicateCheck.duplicates_found > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                  {duplicateCheck.duplicates_found > 0
                    ? `${duplicateCheck.duplicates_found} potential matches found`
                    : "Unique problem (0 duplicates)"}
                </strong>
              </div>
            )}

            {clusterCheck && clusterCheck.cluster && (
              <div>
                <span>Problem Cluster: </span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {clusterCheck.cluster.name || "Assigned"}
                </strong>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
