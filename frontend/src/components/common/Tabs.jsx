import { Icon } from "./Icons";

export function Tabs({
  tabs = [], // [{ id: 'tab1', label: 'Tab 1', icon?: '...', count?: 5 }]
  activeTab,
  onChange,
  variant = "line", // line, pill
  className = "",
}) {
  return (
    <div
      className={`cs-tabs-container ${className}`}
      style={{
        display: "flex",
        gap: variant === "pill" ? "0.5rem" : "1.5rem",
        borderBottom: variant === "line" ? "1px solid var(--border-color)" : "none",
        overflowX: "auto",
        scrollbarWidth: "none",
        paddingBottom: variant === "line" ? "0" : "0.5rem",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === "pill") {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
                backgroundColor: isActive ? "var(--color-primary)" : "var(--bg-muted)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {tab.icon && <Icon name={tab.icon} size={15} />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "var(--border-color)",
                    color: isActive ? "#ffffff" : "var(--text-primary)",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.75rem 0.25rem",
              fontSize: "0.9rem",
              fontWeight: isActive ? 600 : 500,
              border: "none",
              borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              color: isActive ? "var(--color-primary)" : "var(--text-muted)",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
            }}
          >
            {tab.icon && <Icon name={tab.icon} size={16} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: isActive ? "var(--color-primary-subtle)" : "var(--bg-muted)",
                  color: isActive ? "var(--color-primary)" : "var(--text-muted)",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
