export function ProgressBar({
  value = 0,
  max = 100,
  showLabel = true,
  label = null,
  color = "var(--color-primary)",
  height = "8px",
  className = "",
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((Number(value) / Number(max)) * 100)));

  return (
    <div className={`cs-progress-container ${className}`} style={{ width: "100%" }}>
      {(showLabel || label) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8rem",
            fontWeight: 600,
            marginBottom: "0.35rem",
            color: "var(--text-secondary)",
          }}
        >
          <span>{label || "Progress"}</span>
          <span style={{ color: "var(--text-primary)" }}>{percentage}%</span>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height,
          backgroundColor: "var(--border-color)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: "var(--radius-full)",
            transition: "width 400ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

export function MatchScoreIndicator({ score = 0, size = "md" }) {
  const num = Math.round(Number(score));
  let color = "var(--color-secondary)";
  if (num < 50) color = "var(--color-warning)";
  if (num < 30) color = "var(--text-muted)";

  const fontSizes = {
    sm: "0.875rem",
    md: "1.15rem",
    lg: "1.5rem",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontWeight: 700,
        fontSize: fontSizes[size] || fontSizes.md,
        color,
      }}
    >
      <span>{num}%</span>
      <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)" }}>
        Match
      </span>
    </div>
  );
}
