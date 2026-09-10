export function Badge({
  children,
  variant = "default", // default, primary, secondary, success, warning, danger, info, demo
  className = "",
  style = {},
  ...props
}) {
  const getColors = () => {
    switch (variant) {
      case "primary":
        return { bg: "var(--color-primary-subtle)", color: "var(--color-primary)", border: "var(--color-primary-border)" };
      case "secondary":
        return { bg: "var(--color-secondary-subtle)", color: "var(--color-secondary)", border: "var(--color-secondary-border)" };
      case "success":
        return { bg: "var(--color-success-subtle)", color: "var(--color-success)", border: "var(--color-success-border)" };
      case "warning":
        return { bg: "var(--color-warning-subtle)", color: "var(--color-warning)", border: "var(--color-warning-border)" };
      case "danger":
        return { bg: "var(--color-danger-subtle)", color: "var(--color-danger)", border: "var(--color-danger-border)" };
      case "info":
        return { bg: "var(--color-info-subtle)", color: "var(--color-info)", border: "var(--color-info-border)" };
      case "demo":
        return { bg: "#fef3c7", color: "#92400e", border: "#f59e0b", borderStyle: "dashed" };
      default:
        return { bg: "var(--bg-muted)", color: "var(--text-secondary)", border: "var(--border-color)" };
    }
  };

  const colors = getColors();

  return (
    <span
      className={`cs-badge ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px ${colors.borderStyle || "solid"} ${colors.border}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = "" }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();
  const label = normalized.replace(/_/g, " ");

  const getStatusVariant = () => {
    switch (normalized) {
      case "REPORTED":
        return "info";
      case "UNDER_REVIEW":
        return "warning";
      case "VERIFIED":
      case "APPROVED":
      case "RESOLVED":
      case "COMPLETED":
        return "success";
      case "ASSIGNED":
      case "PILOT":
      case "PILOT_READY":
        return "primary";
      case "IN_PROGRESS":
      case "IMPLEMENTING":
        return "warning";
      case "BLOCKED":
      case "REJECTED":
      case "TERMINATED":
      case "PRIMARY":
        return "danger";
      case "CONTRIBUTING":
      default:
        return "default";
    }
  };

  return (
    <Badge variant={getStatusVariant()} className={className}>
      {label}
    </Badge>
  );
}

export function DemoBadge({ className = "" }) {
  return (
    <Badge variant="demo" className={className}>
      DEMO DATA
    </Badge>
  );
}

export function PriorityBadge({ priority, priorityScore, priorityTier, className = "" }) {
  const score = priority != null ? Number(priority) : (priorityScore != null ? Number(priorityScore) : null);
  let variant = "default";
  let label = priorityTier || "NORMAL";

  if (score !== null && !isNaN(score)) {
    if (score >= 80) {
      variant = "danger";
      label = `CRITICAL (${score})`;
    } else if (score >= 60) {
      variant = "warning";
      label = `HIGH (${score})`;
    } else if (score >= 40) {
      variant = "info";
      label = `MEDIUM (${score})`;
    } else {
      variant = "success";
      label = `LOW (${score})`;
    }
  } else if (priorityTier) {
    const norm = String(priorityTier).toUpperCase();
    if (norm === "CRITICAL") variant = "danger";
    else if (norm === "HIGH") variant = "warning";
    else if (norm === "MEDIUM") variant = "info";
    else variant = "success";
    label = norm;
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
