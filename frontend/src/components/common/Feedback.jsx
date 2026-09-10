import { Icon } from "./Icons";
import { Button } from "./Button";

export function EmptyState({
  icon = "search",
  title = "No records found",
  description = "There are no items matching your criteria at this moment.",
  actionLabel = null,
  onAction = null,
  actionIcon = "plus-circle",
  className = "",
}) {
  return (
    <div
      className={`cs-empty-state ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px dashed var(--border-color)",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--bg-muted)",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1rem",
        }}
      >
        <Icon name={icon} size={24} />
      </div>

      <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem", color: "var(--text-primary)" }}>
        {title}
      </h4>

      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: "0.875rem",
          color: "var(--text-muted)",
          maxWidth: "400px",
        }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ lines = 3, height = "1.5rem", className = "" }) {
  return (
    <div className={`cs-skeleton-container ${className}`} style={{ width: "100%" }}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse"
          style={{
            height,
            width: idx === lines - 1 && lines > 1 ? "60%" : "100%",
            backgroundColor: "var(--border-color)",
            borderRadius: "var(--radius-sm)",
            marginBottom: idx === lines - 1 ? 0 : "0.75rem",
          }}
        />
      ))}
    </div>
  );
}
