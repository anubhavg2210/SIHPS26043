import { useState, useCallback } from "react";
import { Icon } from "../components/common/Icons";
import { ToastContext } from "./useToast.js";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => addToast(msg, "success", dur),
    error: (msg, dur) => addToast(msg, "danger", dur),
    warning: (msg, dur) => addToast(msg, "warning", dur),
    info: (msg, dur) => addToast(msg, "info", dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Floating Toasts Viewport */}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "380px",
          width: "100%",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          let bg = "var(--bg-card)";
          let border = "var(--border-color)";
          let icon = "activity";
          let iconColor = "var(--color-primary)";

          if (t.type === "success") {
            border = "var(--color-success-border)";
            icon = "check-circle";
            iconColor = "var(--color-success)";
          } else if (t.type === "danger") {
            border = "var(--color-danger-border)";
            icon = "alert-triangle";
            iconColor = "var(--color-danger)";
          } else if (t.type === "warning") {
            border = "var(--color-warning-border)";
            icon = "alert-triangle";
            iconColor = "var(--color-warning)";
          } else if (t.type === "info") {
            border = "var(--color-info-border)";
            icon = "activity";
            iconColor = "var(--color-info)";
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 1rem",
                boxShadow: "var(--shadow-lg)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.875rem",
                color: "var(--text-primary)",
                animation: "toastIn 200ms ease-out",
              }}
            >
              <div style={{ color: iconColor, display: "flex", alignItems: "center" }}>
                <Icon name={icon} size={20} />
              </div>
              <div style={{ flex: 1, lineHeight: 1.35 }}>{t.message}</div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.25rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
