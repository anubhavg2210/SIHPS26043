import { useEffect } from "react";
import { Icon } from "./Icons";

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle = null,
  children,
  footer = null,
  maxWidth = "550px",
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "modalIn 200ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>{title}</h3>
            {subtitle && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "0.35rem",
              cursor: "pointer",
              color: "var(--text-muted)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "1.5rem",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-muted)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
