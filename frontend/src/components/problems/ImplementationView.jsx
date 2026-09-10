import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { StatusBadge } from "../common/Badges";
import { ProgressBar } from "../common/ProgressBar";
import { Modal } from "../common/Modal";
import { implementationApi } from "../../services/api";
import { useToast } from "../../context/useToast.js";

export function ImplementationView({ problemId }) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [implementations, setImplementations] = useState([]);
  const [selectedImpl, setSelectedImpl] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [error, setError] = useState("");

  // Add Update Modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    description: "",
    progress_percentage: "",
  });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const refreshImplementations = async () => {
    if (!problemId) return;
    try {
      const res = await implementationApi.getProblemImplementations(problemId);
      const list = res.implementations || [];
      setImplementations(list);
      if (list.length > 0) {
        setSelectedImpl(list[0]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load implementations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      if (!problemId) return;
      try {
        const res = await implementationApi.getProblemImplementations(problemId);
        const list = res.implementations || [];
        if (!ignore) {
          setImplementations(list);
          if (list.length > 0) {
            setSelectedImpl(list[0]);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load implementations");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [problemId]);

  // Load updates when selectedImpl changes
  useEffect(() => {
    let ignore = false;
    async function fetchUpdates() {
      if (!selectedImpl) return;
      try {
        const res = await implementationApi.getUpdates(selectedImpl.id);
        if (!ignore) {
          setUpdates(res.updates || []);
          setLoadingUpdates(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setUpdates([]);
          setLoadingUpdates(false);
        }
      }
    }
    fetchUpdates();
    return () => {
      ignore = true;
    };
  }, [selectedImpl]);

  // Post update
  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!selectedImpl) return;
    setSubmittingUpdate(true);
    try {
      await implementationApi.addUpdate(selectedImpl.id, {
        title: updateForm.title.trim(),
        description: updateForm.description.trim() || undefined,
        progress_percentage: updateForm.progress_percentage
          ? Number(updateForm.progress_percentage)
          : undefined,
      });
      toast.success("Field update posted successfully");
      setUpdateModalOpen(false);
      setUpdateForm({ title: "", description: "", progress_percentage: "" });
      // Refresh updates and implementation
      const res = await implementationApi.getUpdates(selectedImpl.id);
      setUpdates(res.updates || []);
      refreshImplementations();
    } catch (err) {
      toast.error(err.message || "Failed to post update");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              Pilot & Implementation Tracking
            </h3>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-muted)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-color)",
              }}
            >
              [DEMO DATA]
            </span>
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Real-time physical execution milestones &bull; Transparent field updates from project managers & researchers
          </p>
        </div>

        {selectedImpl && (
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setUpdateForm({
                title: "",
                description: "",
                progress_percentage: String(selectedImpl.progress_percentage || 0),
              });
              setUpdateModalOpen(true);
            }}
          >
            Post Field Progress Update
          </Button>
        )}
      </div>

      {loading ? (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Loading implementation records...
          </p>
        </Card>
      ) : error ? (
        <Card style={{ backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
          {error}
        </Card>
      ) : implementations.length === 0 ? (
        <Card
          style={{
            textAlign: "center",
            padding: "3.5rem 1.5rem",
            backgroundColor: "var(--bg-muted)",
            borderStyle: "dashed",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "#ffffff",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <Icon name="activity" size={24} />
          </div>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>
            No Implementation Has Started for This Problem Yet
          </h4>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "440px" }}>
            Once an approved solution is selected and municipal funding is allocated, pilot milestones, field updates, and live progress will be tracked here.
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Active Implementation Card */}
          {selectedImpl && (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <StatusBadge status={selectedImpl.status} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Lead Partner: <strong>{selectedImpl.partner_name || "IIT ISM Dhanbad / Municipal Corp"}</strong>
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                    {selectedImpl.title || `Implementation Phase: ${selectedImpl.solution_title || "Remediation Deployment"}`}
                  </h4>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>COMPLETION</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-primary)" }}>
                    {selectedImpl.progress_percentage || 0}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: "1.25rem" }}>
                <ProgressBar
                  value={selectedImpl.progress_percentage || 0}
                  color={
                    selectedImpl.progress_percentage >= 100
                      ? "var(--color-success)"
                      : "var(--color-primary)"
                  }
                />
              </div>

              {/* Milestones / Updates Feed */}
              <div>
                <h5 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>
                  Field Activity & Milestone Feed
                </h5>

                {loadingUpdates ? (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <Icon name="spinner" size={20} color="var(--color-primary)" />
                  </div>
                ) : updates.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    No field updates logged yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {updates.map((up) => (
                      <div
                        key={up.id}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--bg-muted)",
                          borderLeft: "3px solid var(--color-primary)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{up.title}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {up.created_at ? new Date(up.created_at).toLocaleDateString() : "Recent"}
                          </span>
                        </div>
                        {up.description && (
                          <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {up.description}
                          </p>
                        )}
                        {up.progress_percentage !== null && (
                          <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary)" }}>
                            Progress logged: {up.progress_percentage}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Update Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Post Field Progress Update"
      >
        <form onSubmit={handlePostUpdate}>
          <div className="cs-form-group">
            <label className="cs-label">
              Milestone / Update Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="cs-input"
              placeholder="e.g., Phase 1 Borewell Filtration Skid Assembled on Site"
              value={updateForm.title}
              onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
              required
            />
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Field Observations & Work Completed</label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="Detail technical work, civic coordination, and current operational status..."
              value={updateForm.description}
              onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
            />
          </div>

          <div className="cs-form-group">
            <label className="cs-label">New Total Progress Percentage (0 - 100)</label>
            <input
              type="number"
              className="cs-input"
              min="0"
              max="100"
              placeholder="50"
              value={updateForm.progress_percentage}
              onChange={(e) => setUpdateForm({ ...updateForm, progress_percentage: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUpdateModalOpen(false)}
              disabled={submittingUpdate}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingUpdate}>
              Publish Update
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
