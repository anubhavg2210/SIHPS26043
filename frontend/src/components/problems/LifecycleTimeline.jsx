import { useState } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { StatusBadge } from "../common/Badges";
import { problemApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";

import { LIFECYCLE_STAGES, STATUS_FLOW } from "../../constants/lifecycle.js";

export function LifecycleTimeline({ problem, onStatusUpdated }) {
  const { role } = useAuth();
  const toast = useToast();
  const currentStatus = problem?.status || "REPORTED";

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const currentIndex = LIFECYCLE_STAGES.findIndex((s) => s.key === currentStatus);
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

  const isAuthorityOrAdmin = role === "AUTHORITY" || role === "ADMIN";
  const allowedNextStatuses = STATUS_FLOW[currentStatus] || [];

  const handleOpenAdvanceModal = () => {
    if (allowedNextStatuses.length > 0) {
      setSelectedStatus(allowedNextStatuses[0]);
    }
    setNote("");
    setModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    setUpdating(true);
    try {
      await problemApi.updateProblemStatus(problem.id, {
        status: selectedStatus,
        note: note.trim() || undefined,
      });
      toast.success(`Problem lifecycle updated to ${selectedStatus}`);
      setModalOpen(false);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to update problem status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        boxShadow: "var(--shadow-xs)",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Civic Lifecycle Journey</h3>
            <StatusBadge status={currentStatus} />
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Deterministic state machine &bull; Stage {effectiveIndex + 1} of {LIFECYCLE_STAGES.length}:{" "}
            <strong>{LIFECYCLE_STAGES[effectiveIndex]?.label}</strong>
          </p>
        </div>

        {isAuthorityOrAdmin && allowedNextStatuses.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon="arrow-right"
            onClick={handleOpenAdvanceModal}
          >
            Advance Lifecycle
          </Button>
        )}
      </div>

      {/* Horizontal Scrollable Step Bar */}
      <div
        style={{
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minWidth: "900px",
            position: "relative",
          }}
        >
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < effectiveIndex;
            const isCurrent = idx === effectiveIndex;

            let circleBg = "var(--bg-muted)";
            let circleColor = "var(--text-muted)";
            let borderColor = "var(--border-color)";

            if (isCompleted) {
              circleBg = "var(--color-success)";
              circleColor = "#ffffff";
              borderColor = "var(--color-success)";
            } else if (isCurrent) {
              circleBg = "var(--color-primary)";
              circleColor = "#ffffff";
              borderColor = "var(--color-primary)";
            }

            return (
              <div
                key={stage.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  position: "relative",
                  textAlign: "center",
                }}
              >
                {/* Connecting Line */}
                {idx > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      left: "-50%",
                      width: "100%",
                      height: "3px",
                      backgroundColor:
                        idx <= effectiveIndex ? "var(--color-success)" : "var(--border-color)",
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Node Circle */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: circleBg,
                    color: circleColor,
                    border: `2px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    zIndex: 2,
                    boxShadow: isCurrent ? "0 0 0 4px var(--color-primary-subtle)" : "none",
                    transition: "all var(--transition-fast)",
                  }}
                  title={`${stage.label}: ${stage.desc}`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>

                {/* Label */}
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent
                      ? "var(--color-primary)"
                      : isCompleted
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Status Footnote */}
      <div
        style={{
          marginTop: "1rem",
          padding: "0.6rem 0.85rem",
          backgroundColor: "var(--bg-muted)",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
      >
        <Icon name="info" size={14} color="var(--color-primary)" />
        <span>
          <strong>Current Stage Objective:</strong> {LIFECYCLE_STAGES[effectiveIndex]?.desc}. Stages proceed deterministically according to statutory verification.
        </span>
      </div>

      {/* Status Advance Modal for Authority / Admin */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Advance Problem Lifecycle"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
            Current Status: <StatusBadge status={currentStatus} />
          </p>

          <div className="cs-form-group">
            <label className="cs-label">
              Select New Status <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {allowedNextStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Only transitions permitted by state-flow governance are displayed.
            </div>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Transition Note / Directive</label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="e.g., Problem verified by Dhanbad Municipal inspection team; proceeding to root cause analysis."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateStatus} loading={updating}>
              Confirm Transition
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
