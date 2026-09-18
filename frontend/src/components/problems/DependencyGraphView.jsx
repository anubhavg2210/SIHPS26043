import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { Modal } from "../common/Modal";
import { dependencyApi, problemApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";
import { useRouter } from "../../context/useRouter.js";

const DEPENDENCY_TYPES = [
  { key: "BLOCKS_SOLUTION", label: "Blocks Solution", desc: "Prerequisite must be resolved before solution deployment" },
  { key: "CAUSES", label: "Causes", desc: "Upstream condition directly causes downstream issue" },
  { key: "EXACERBATES", label: "Exacerbates", desc: "Upstream condition significantly worsens severity" },
  { key: "SHARED_ROOT_CAUSE", label: "Shared Root Cause", desc: "Both problems stem from identical core deficiency" },
  { key: "TEMPORAL_SEQUENCE", label: "Temporal Sequence", desc: "Must be addressed in chronological sequence" },
];

export function DependencyGraphView({ problemId, currentProblem }) {
  const { role } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [dependencies, setDependencies] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [candidateProblems, setCandidateProblems] = useState([]);
  const [error, setError] = useState("");

  // AI Detection State
  const [detecting, setDetecting] = useState(false);

  // Create Dependency Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    depends_on_problem_id: "",
    dependency_type: "BLOCKS_SOLUTION",
    reasoning: "",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Verify Modal (Authority / Admin)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedDepForVerify, setSelectedDepForVerify] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState("UNDER_REVIEW");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  const isAuthorityOrAdmin = role === "AUTHORITY" || role === "ADMIN";
  const canTriggerAI = ["AUTHORITY", "ADMIN", "RESEARCHER", "UNIVERSITY"].includes(role);
  const canPropose = role && role !== "CITIZEN";

  const refreshData = async () => {
    if (!problemId) return;
    try {
      const [depRes, graphRes] = await Promise.all([
        dependencyApi.getProblemDependencies(problemId).catch(() => ({ dependencies: [] })),
        dependencyApi.getDependencyGraph(problemId).catch(() => null),
      ]);
      setDependencies(depRes.dependencies || []);
      setGraphData(graphRes);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dependency mapping");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      if (!problemId) return;
      try {
        const [depRes, graphRes] = await Promise.all([
          dependencyApi.getProblemDependencies(problemId).catch(() => ({ dependencies: [] })),
          dependencyApi.getDependencyGraph(problemId).catch(() => null),
        ]);
        if (!ignore) {
          setDependencies(depRes.dependencies || []);
          setGraphData(graphRes);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load dependency mapping");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [problemId]);

  // Load candidate problems for manual linking
  const handleOpenCreate = async () => {
    setCreateModalOpen(true);
    try {
      const res = await problemApi.getProblems({ limit: 30 });
      // Exclude current problem
      setCandidateProblems((res.problems || []).filter((p) => String(p.id) !== String(problemId)));
    } catch (err) {
      console.error("Failed to load candidates", err);
    }
  };

  // Trigger AI Dependency Detection
  const handleDetectDependencies = async () => {
    setDetecting(true);
    try {
      const res = await dependencyApi.detectDependencies(problemId);
      toast.success(
        res.message || `AI detected ${res.total_detected || 0} candidate systemic dependencies`
      );
      refreshData();
    } catch (err) {
      toast.error(err.message || "Dependency detection failed");
    } finally {
      setDetecting(false);
    }
  };

  // Submit Manual Dependency Link
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.depends_on_problem_id) {
      toast.error("Please select an upstream problem");
      return;
    }
    setSubmittingCreate(true);
    try {
      await dependencyApi.createDependency(problemId, {
        depends_on_problem_id: Number(createForm.depends_on_problem_id),
        dependency_type: createForm.dependency_type,
        reasoning: createForm.reasoning.trim() || undefined,
      });
      toast.success("Dependency relationship established");
      setCreateModalOpen(false);
      setCreateForm({
        depends_on_problem_id: "",
        dependency_type: "BLOCKS_SOLUTION",
        reasoning: "",
      });
      refreshData();
    } catch (err) {
      toast.error(err.message || "Failed to create dependency");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Verify Modal
  const handleOpenVerify = (dep) => {
    setSelectedDepForVerify(dep);
    if (dep.verification_status === "PROPOSED") {
      setVerifyStatus("UNDER_REVIEW");
    } else if (dep.verification_status === "UNDER_REVIEW") {
      setVerifyStatus("VERIFIED");
    } else {
      setVerifyStatus("UNDER_REVIEW");
    }
    setVerifyNotes("");
    setVerifyModalOpen(true);
  };

  // Submit Verification
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyNotes.trim()) {
      toast.error("Verification notes are mandatory");
      return;
    }
    setVerifying(true);
    try {
      await dependencyApi.verifyDependency(selectedDepForVerify.id, {
        verification_status: verifyStatus,
        verification_notes: verifyNotes.trim(),
      });
      toast.success(`Dependency verification updated to ${verifyStatus}`);
      setVerifyModalOpen(false);
      refreshData();
    } catch (err) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Bar */}
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
              Systemic Dependency Mapping
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
            </span>
            {graphData?.nodes && (
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-border)",
                }}
              >
                {graphData.nodes.length} Nodes &bull; {graphData.edges?.length || 0} Directed Edges
              </span>
            )}
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Cross-problem prerequisite chains &bull; Prevents isolated solutions from failing due to unaddressed upstream bottlenecks
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {canTriggerAI && (
            <Button
              variant="secondary"
              icon="cpu"
              loading={detecting}
              onClick={handleDetectDependencies}
            >
              {detecting ? "Scanning Interconnections..." : "Detect Dependencies with AI"}
            </Button>
          )}

          {canPropose && (
            <Button
              variant="primary"
              icon="link"
              onClick={handleOpenCreate}
            >
              Map Dependency Link
            </Button>
          )}
        </div>
      </div>

      {/* Dependency Concept Banner */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-primary-subtle)",
          border: "1px solid var(--color-primary-border)",
          fontSize: "0.85rem",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <Icon name="info" size={16} />
        <span>
          <strong>Causal Directed Flow:</strong> Problems do not exist in isolation. Resolving groundwater contamination often requires first remediating upstream industrial discharge or municipal storm drains.
        </span>
      </div>

      {/* Content Area */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Analyzing systemic dependencies...
          </p>
        </Card>
      ) : error ? (
        <Card style={{ backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
          {error}
        </Card>
      ) : dependencies.length === 0 ? (
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
            <Icon name="link" size={24} />
          </div>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>
            No Verified or Proposed Dependencies Found
          </h4>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "440px" }}>
            Click &ldquo;Detect Dependencies with AI&rdquo; to analyze semantic similarities, geographic proximity, and shared root causes across the district.
          </p>
          <Button
            variant="primary"
            icon="cpu"
            loading={detecting}
            onClick={handleDetectDependencies}
          >
            Detect Dependencies with AI
          </Button>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {dependencies.map((dep) => {
            // If current problem depends on other: other is upstream prerequisite
            // If other problem depends on current: current is upstream
            const otherProblemTitle = dep.depends_on_title || dep.upstream_title || `Problem #${dep.depends_on_problem_id}`;
            const otherProblemCategory = dep.depends_on_category || "Civic";
            const otherProblemDistrict = dep.depends_on_district || "District";

            return (
              <div
                key={dep.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                {/* Visual Directed Edge Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1rem",
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-muted)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {/* Upstream Problem Card */}
                  <div
                    style={{
                      padding: "0.6rem 0.8rem",
                      backgroundColor: "#ffffff",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                      Upstream Prerequisite
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "var(--color-primary)",
                        marginTop: "0.15rem",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(`/problems/${dep.depends_on_problem_id}`)}
                    >
                      {otherProblemTitle} &rarr;
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      {otherProblemCategory} &bull; {otherProblemDistrict}
                    </div>
                  </div>

                  {/* Flow Relationship Badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "var(--color-primary)",
                        color: "#ffffff",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dep.dependency_type}
                    </span>
                    <span style={{ fontSize: "1.2rem", color: "var(--color-primary)" }}>&rarr;</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      {Math.round(dep.confidence || 0)}% Signal
                    </span>
                  </div>

                  {/* Downstream (Current Problem) */}
                  <div
                    style={{
                      padding: "0.6rem 0.8rem",
                      backgroundColor: "#ffffff",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                      Downstream Dependent
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", marginTop: "0.15rem" }}>
                      {currentProblem?.title || `Problem #${problemId}`}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      {currentProblem?.category} &bull; {currentProblem?.district}
                    </div>
                  </div>
                </div>

                {/* Details & Reasoning */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    {dep.reasoning && (
                      <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <strong>Causal Reasoning:</strong> {dep.reasoning}
                      </p>
                    )}
                    {dep.verification_notes && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--color-success)",
                          backgroundColor: "var(--color-success-subtle)",
                          padding: "0.4rem 0.6rem",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-success-border)",
                        }}
                      >
                        <strong>Authority Verification Note:</strong> {dep.verification_notes}
                      </div>
                    )}
                  </div>

                  {/* Status & Verify Action */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", minWidth: "140px" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor:
                          dep.verification_status === "VERIFIED"
                            ? "var(--color-success-subtle)"
                            : dep.verification_status === "UNDER_REVIEW"
                            ? "var(--color-info-subtle)"
                            : "var(--color-warning-subtle)",
                        color:
                          dep.verification_status === "VERIFIED"
                            ? "var(--color-success)"
                            : dep.verification_status === "UNDER_REVIEW"
                            ? "var(--color-info)"
                            : "var(--color-warning)",
                      }}
                    >
                      {dep.verification_status}
                    </span>

                    {isAuthorityOrAdmin && dep.verification_status !== "VERIFIED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon="shield-check"
                        onClick={() => handleOpenVerify(dep)}
                      >
                        Verify Edge
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dependency Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Map Systemic Dependency Link"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="cs-form-group">
            <label className="cs-label">
              Select Upstream Prerequisite Problem <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={createForm.depends_on_problem_id}
              onChange={(e) => setCreateForm({ ...createForm, depends_on_problem_id: e.target.value })}
              required
            >
              <option value="">-- Choose upstream problem --</option>
              {candidateProblems.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.title} ({p.district || "District"})
                </option>
              ))}
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Dependency Relationship Type</label>
            <select
              className="cs-select"
              value={createForm.dependency_type}
              onChange={(e) => setCreateForm({ ...createForm, dependency_type: e.target.value })}
            >
              {DEPENDENCY_TYPES.map((dt) => (
                <option key={dt.key} value={dt.key}>
                  {dt.label} — {dt.desc}
                </option>
              ))}
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Engineering / Operational Rationale</label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="e.g., Installing community filtration units will quickly fail unless industrial discharge upstream is stopped first."
              value={createForm.reasoning}
              onChange={(e) => setCreateForm({ ...createForm, reasoning: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={submittingCreate}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingCreate}>
              Establish Prerequisite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Verify Modal (Authority / Admin) */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Authority Dependency Verification"
      >
        <form onSubmit={handleVerifySubmit}>
          <div className="cs-form-group">
            <label className="cs-label">
              Verification Status <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={verifyStatus}
              onChange={(e) => setVerifyStatus(e.target.value)}
            >
              <option value="UNDER_REVIEW">UNDER_REVIEW (Commission inter-departmental review)</option>
              <option value="VERIFIED">VERIFIED (Confirm prerequisite dependency)</option>
              <option value="REJECTED">REJECTED (No causal linkage found)</option>
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">
              Statutory Verification Notes <span className="required">*</span>
            </label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="Specify jurisdictional confirmation, engineering report reference, or synchronization order..."
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerifyModalOpen(false)}
              disabled={verifying}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={verifying}>
              Confirm Edge Verification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
