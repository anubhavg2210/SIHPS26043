import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { Modal } from "../common/Modal";
import { rootCauseApi, matchingApi, solutionApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";

const CATEGORIES = [
  "GENERAL",
  "INFRASTRUCTURE",
  "ENVIRONMENTAL",
  "OPERATIONAL",
  "POLICY_REGULATORY",
  "SOCIO_ECONOMIC",
  "TECHNICAL",
  "BIOLOGICAL_HEALTH",
];

const EVIDENCE_TYPES = [
  "FIELD_OBSERVATION",
  "LAB_REPORT",
  "RESEARCH_CITATION",
  "GOVERNMENT_RECORD",
  "DATASET",
  "MEDIA_LINK",
  "COMMUNITY_REPORT",
];

const CITIZEN_EVIDENCE_TYPES = [
  "FIELD_OBSERVATION",
  "COMMUNITY_REPORT",
  "MEDIA_LINK",
];

export function RootCauseView({ problemId }) {
  const { role, user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [causes, setCauses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  // Qualification state for students / startups / msmes
  const [isStudentQualified, setIsStudentQualified] = useState(null);
  const [hasLinkedSolution, setHasLinkedSolution] = useState(null);

  // AI Analysis trigger state
  const [analyzing, setAnalyzing] = useState(false);

  // Propose Modal
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [proposeForm, setProposeForm] = useState({
    cause: "",
    cause_type: "CONTRIBUTING",
    category: "ENVIRONMENTAL",
    reasoning: "",
  });
  const [submittingPropose, setSubmittingPropose] = useState(false);

  // Verification Modal (Authority / Admin)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedCauseForVerify, setSelectedCauseForVerify] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState("UNDER_REVIEW");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Evidence Modal
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedCauseForEvidence, setSelectedCauseForEvidence] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    evidence_type: "FIELD_OBSERVATION",
    title: "",
    description: "",
    evidence_url: "",
  });
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const canTriggerAI = ["AUTHORITY", "ADMIN", "RESEARCHER", "UNIVERSITY"].includes(role);
  const isAuthorityOrAdmin = role === "AUTHORITY" || role === "ADMIN";

  // Check Proposal Permissions against actual backend RBAC:
  // - AUTHORITY, ADMIN, RESEARCHER, UNIVERSITY: Unconditionally allowed
  // - STUDENT: Allowed if student skills match required_expertise OR student is linked to a solution
  // - STARTUP, MSME: Allowed if linked to a solution
  // - CITIZEN: Not allowed to propose formal root causes
  const canPropose = ["AUTHORITY", "ADMIN", "RESEARCHER", "UNIVERSITY", "STUDENT", "STARTUP", "MSME"].includes(role);
  let proposeDisabled = false;
  let proposeDisabledReason = "";

  if (role === "STUDENT") {
    if (isStudentQualified === false && hasLinkedSolution === false) {
      proposeDisabled = true;
      proposeDisabledReason = "Student proposal qualification: Requires matching domain skills or active solution on this problem.";
    }
  } else if (role === "STARTUP" || role === "MSME") {
    if (hasLinkedSolution === false) {
      proposeDisabled = true;
      proposeDisabledReason = "Startup/MSME proposal: Requires an active solution submission on this problem.";
    }
  }

  const allowedEvidenceTypes = role === "CITIZEN" ? CITIZEN_EVIDENCE_TYPES : EVIDENCE_TYPES;

  const refreshData = async () => {
    if (!problemId) return;
    try {
      const [causesRes, sumRes] = await Promise.all([
        rootCauseApi.getProblemRootCauses(problemId),
        rootCauseApi.getProblemRootCausesSummary(problemId).catch(() => null),
      ]);
      setCauses(causesRes.root_causes || []);
      setSummary(sumRes);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load root cause analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      if (!problemId) return;
      try {
        const [causesRes, sumRes] = await Promise.all([
          rootCauseApi.getProblemRootCauses(problemId),
          rootCauseApi.getProblemRootCausesSummary(problemId).catch(() => null),
        ]);
        if (!ignore) {
          setCauses(causesRes.root_causes || []);
          setSummary(sumRes);
          setLoading(false);
        }

        // Verify qualification for STUDENT / STARTUP / MSME against actual backend data
        if (role === "STUDENT") {
          try {
            const [studentMatchesRes, solutionsRes] = await Promise.all([
              matchingApi.getStudentMatches(problemId).catch(() => ({ matches: [] })),
              solutionApi.getSolutionsForProblem(problemId).catch(() => ({ solutions: [] })),
            ]);
            if (!ignore) {
              const matchedList = studentMatchesRes?.matches || [];
              const isMatched = user?.id && matchedList.some((m) => Number(m.user_id || m.id) === Number(user.id));
              const userSolutions = solutionsRes?.solutions || [];
              const hasSol = user?.id && userSolutions.some((s) => Number(s.submitted_by) === Number(user.id));
              setIsStudentQualified(Boolean(isMatched));
              setHasLinkedSolution(Boolean(hasSol));
            }
          } catch {
            if (!ignore) {
              setIsStudentQualified(false);
              setHasLinkedSolution(false);
            }
          }
        } else if (role === "STARTUP" || role === "MSME") {
          try {
            const solutionsRes = await solutionApi.getSolutionsForProblem(problemId).catch(() => ({ solutions: [] }));
            if (!ignore) {
              const userSolutions = solutionsRes?.solutions || [];
              const hasSol = user?.id && userSolutions.some((s) => Number(s.submitted_by) === Number(user.id));
              setHasLinkedSolution(Boolean(hasSol));
            }
          } catch {
            if (!ignore) setHasLinkedSolution(false);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load root cause analysis");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [problemId, role, user?.id]);

  // Trigger AI Root Cause Analysis
  const handleAnalyzeRootCauses = async () => {
    setAnalyzing(true);
    try {
      const res = await rootCauseApi.analyzeRootCauses(problemId);
      toast.success(
        res.message || `AI extracted ${res.total_generated || 0} candidate root causes`
      );
      refreshData();
    } catch (err) {
      toast.error(err.message || "AI root cause analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // Submit Propose Root Cause
  const handleProposeSubmit = async (e) => {
    e.preventDefault();
    setSubmittingPropose(true);
    try {
      await rootCauseApi.createRootCause(problemId, {
        cause: proposeForm.cause.trim(),
        cause_type: proposeForm.cause_type,
        category: proposeForm.category,
        reasoning: proposeForm.reasoning.trim() || undefined,
      });
      toast.success("Root cause proposed successfully");
      setProposeModalOpen(false);
      setProposeForm({
        cause: "",
        cause_type: "CONTRIBUTING",
        category: "ENVIRONMENTAL",
        reasoning: "",
      });
      refreshData();
    } catch (err) {
      toast.error(err.message || "Failed to propose root cause");
    } finally {
      setSubmittingPropose(false);
    }
  };

  // Open Verify Modal
  const handleOpenVerify = (cause) => {
    setSelectedCauseForVerify(cause);
    // Allowed transitions: PROPOSED -> UNDER_REVIEW; UNDER_REVIEW -> VERIFIED/REJECTED; REJECTED -> UNDER_REVIEW
    if (cause.verification_status === "PROPOSED") {
      setVerifyStatus("UNDER_REVIEW");
    } else if (cause.verification_status === "UNDER_REVIEW") {
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
      await rootCauseApi.verifyRootCause(selectedCauseForVerify.id, {
        verification_status: verifyStatus,
        verification_notes: verifyNotes.trim(),
      });
      toast.success(`Root cause verification status set to ${verifyStatus}`);
      setVerifyModalOpen(false);
      refreshData();
    } catch (err) {
      toast.error(err.message || "Verification update failed");
    } finally {
      setVerifying(false);
    }
  };

  // Open Evidence Modal
  const handleOpenEvidence = async (cause) => {
    setSelectedCauseForEvidence(cause);
    setEvidenceModalOpen(true);
    setLoadingEvidence(true);
    try {
      const res = await rootCauseApi.getRootCauseEvidence(cause.id);
      setEvidenceList(res.evidence || []);
    } catch (err) {
      console.error(err);
      setEvidenceList([]);
    } finally {
      setLoadingEvidence(false);
    }
  };

  // Submit Evidence
  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCauseForEvidence) return;
    setSubmittingEvidence(true);
    try {
      await rootCauseApi.addEvidence(selectedCauseForEvidence.id, {
        evidence_type: evidenceForm.evidence_type,
        title: evidenceForm.title.trim(),
        description: evidenceForm.description.trim() || undefined,
        evidence_url: evidenceForm.evidence_url.trim() || undefined,
      });
      toast.success("Evidence attached to root cause");
      // Reload evidence list
      const res = await rootCauseApi.getRootCauseEvidence(selectedCauseForEvidence.id);
      setEvidenceList(res.evidence || []);
      setEvidenceForm({
        evidence_type: "FIELD_OBSERVATION",
        title: "",
        description: "",
        evidence_url: "",
      });
      refreshData(); // Recompute confidence score with evidence boost
    } catch (err) {
      toast.error(err.message || "Failed to attach evidence");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header & Action Controls */}
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
              Root Cause Analysis (RCA)
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
            Independent deterministic confidence &bull; Multi-cause ledger with authority verification gate
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {canTriggerAI && (
            <Button
              variant="secondary"
              icon="cpu"
              loading={analyzing}
              onClick={handleAnalyzeRootCauses}
            >
              {analyzing ? "Analyzing Heuristics..." : "Run AI RCA Engine"}
            </Button>
          )}

          {canPropose && (
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
              <Button
                variant="primary"
                icon="plus"
                disabled={proposeDisabled}
                title={proposeDisabled ? proposeDisabledReason : undefined}
                onClick={() => setProposeModalOpen(true)}
              >
                Propose Root Cause
              </Button>
              {proposeDisabled && (
                <span style={{ fontSize: "0.7rem", color: "var(--color-warning)", fontWeight: 600 }}>
                  🔒 Domain expertise or active solution required
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Bar */}
      {summary && (
        <div className="cs-grid-4">
          <div style={{ padding: "1rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL CAUSES</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
              {summary.total_causes || causes.length}
            </div>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>PRIMARY CAUSE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginTop: "0.25rem" }}>
              {summary.has_primary ? "Identified" : "Unset"}
            </div>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>VERIFIED CAUSES</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-success)", marginTop: "0.25rem" }}>
              {summary.verified_count || 0}
            </div>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>AVG CONFIDENCE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-secondary)", marginTop: "0.25rem" }}>
              {summary.avg_confidence ? `${Math.round(summary.avg_confidence)}%` : "N/A"}
            </div>
          </div>
        </div>
      )}

      {/* Honest AI & Verification Disclaimer */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-info-subtle)",
          border: "1px solid var(--color-info-border)",
          fontSize: "0.85rem",
          color: "var(--color-info)",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <Icon name="info" size={16} />
        <span>
          <strong>Epistemic Separation:</strong> AI confidence is strictly derived from domain keyword matching, hydrogeological indicators, and recurrence signals. Status remains <em>PROPOSED</em> until formal Municipal/Authority verification.
        </span>
      </div>

      {/* Causes List */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Loading root cause analyses...
          </p>
        </Card>
      ) : error ? (
        <Card style={{ backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
          {error}
        </Card>
      ) : causes.length === 0 ? (
        <Card
          style={{
            textAlign: "center",
            padding: "3rem 1.5rem",
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
            <Icon name="layers" size={24} />
          </div>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>No Root Causes Identified Yet</h4>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "420px" }}>
            Run the Rule-Based AI RCA Engine or submit an empirical field observation to begin systematic cause identification.
          </p>
          {canTriggerAI && (
            <Button
              variant="primary"
              icon="cpu"
              loading={analyzing}
              onClick={handleAnalyzeRootCauses}
            >
              Run AI RCA Engine
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {causes.map((cause) => {
            const isPrimary = cause.cause_type === "PRIMARY";
            const isVerified = cause.verification_status === "VERIFIED";

            return (
              <div
                key={cause.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: isPrimary
                    ? "2px solid var(--color-primary)"
                    : "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                {/* Cause Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: isPrimary
                          ? "var(--color-primary)"
                          : "var(--color-secondary-subtle)",
                        color: isPrimary ? "#ffffff" : "var(--color-secondary)",
                      }}
                    >
                      {cause.cause_type}
                    </span>

                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "0.2rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-muted)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      {cause.category}
                    </span>

                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      Source: <strong>{cause.source_type}</strong>
                    </span>
                  </div>

                  {/* Verification Status Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        padding: "0.25rem 0.65rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor:
                          cause.verification_status === "VERIFIED"
                            ? "var(--color-success-subtle)"
                            : cause.verification_status === "UNDER_REVIEW"
                            ? "var(--color-info-subtle)"
                            : cause.verification_status === "REJECTED"
                            ? "var(--color-danger-subtle)"
                            : "var(--color-warning-subtle)",
                        color:
                          cause.verification_status === "VERIFIED"
                            ? "var(--color-success)"
                            : cause.verification_status === "UNDER_REVIEW"
                            ? "var(--color-info)"
                            : cause.verification_status === "REJECTED"
                            ? "var(--color-danger)"
                            : "var(--color-warning)",
                        border: `1px solid ${
                          cause.verification_status === "VERIFIED"
                            ? "var(--color-success-border)"
                            : cause.verification_status === "UNDER_REVIEW"
                            ? "var(--color-info-border)"
                            : cause.verification_status === "REJECTED"
                            ? "var(--color-danger-border)"
                            : "var(--color-warning-border)"
                        }`,
                      }}
                    >
                      {cause.verification_status === "PROPOSED"
                        ? "Awaiting Verification"
                        : cause.verification_status}
                    </span>
                  </div>
                </div>

                {/* Cause Title Statement */}
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", fontWeight: 700 }}>
                  {cause.cause}
                </h4>

                {/* Confidence Bar */}
                <div style={{ marginBottom: "0.85rem", maxWidth: "340px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span>Deterministic AI Confidence</span>
                    <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                      {Math.round(cause.confidence || 0)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--bg-muted)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, cause.confidence || 0))}%`,
                        backgroundColor: "var(--color-primary)",
                      }}
                    />
                  </div>
                </div>

                {/* Reasoning Statement */}
                {cause.reasoning && (
                  <p
                    style={{
                      margin: "0 0 0.75rem",
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      backgroundColor: "var(--bg-muted)",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <strong>Reasoning:</strong> {cause.reasoning}
                  </p>
                )}

                {/* Verification notes if present */}
                {cause.verification_notes && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-success)",
                      backgroundColor: "var(--color-success-subtle)",
                      border: "1px solid var(--color-success-border)",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <strong>Authority Directive:</strong> {cause.verification_notes}
                  </div>
                )}

                {/* Footer Controls: Evidence Button & Verify Button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenEvidence(cause)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <Icon name="layers" size={14} />
                    Evidence Ledger ({cause.evidence_count || 0}) &bull; Attach Evidence
                  </button>

                  {isAuthorityOrAdmin && !isVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon="shield-check"
                      onClick={() => handleOpenVerify(cause)}
                    >
                      Update Verification
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Propose Root Cause Modal */}
      <Modal
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        title="Propose Root Cause"
      >
        <form onSubmit={handleProposeSubmit}>
          <div className="cs-form-group">
            <label className="cs-label">
              Root Cause Statement <span className="required">*</span>
            </label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="e.g. Leachate migration from unlined coal wash dumping pit into primary borewell stratum"
              value={proposeForm.cause}
              onChange={(e) => setProposeForm({ ...proposeForm, cause: e.target.value })}
              required
            />
          </div>

          <div className="cs-grid-2">
            <div className="cs-form-group">
              <label className="cs-label">Cause Type</label>
              <select
                className="cs-select"
                value={proposeForm.cause_type}
                onChange={(e) => setProposeForm({ ...proposeForm, cause_type: e.target.value })}
              >
                <option value="PRIMARY">PRIMARY (Main Bottleneck)</option>
                <option value="CONTRIBUTING">CONTRIBUTING (Aggravating Factor)</option>
              </select>
            </div>

            <div className="cs-form-group">
              <label className="cs-label">Category</label>
              <select
                className="cs-select"
                value={proposeForm.category}
                onChange={(e) => setProposeForm({ ...proposeForm, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Empirical Reasoning / Findings</label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="Provide technical rationale, soil test references, or observed hydrogeological patterns..."
              value={proposeForm.reasoning}
              onChange={(e) => setProposeForm({ ...proposeForm, reasoning: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProposeModalOpen(false)}
              disabled={submittingPropose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingPropose}>
              Submit Proposal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Verification Modal (Authority / Admin) */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Authority Root Cause Verification"
      >
        <form onSubmit={handleVerifySubmit}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            Validating: <strong>{selectedCauseForVerify?.cause}</strong>
          </p>

          <div className="cs-form-group">
            <label className="cs-label">
              Next Verification Status <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={verifyStatus}
              onChange={(e) => setVerifyStatus(e.target.value)}
            >
              {selectedCauseForVerify?.verification_status === "PROPOSED" && (
                <option value="UNDER_REVIEW">UNDER_REVIEW (Commission field inspection)</option>
              )}
              {selectedCauseForVerify?.verification_status === "UNDER_REVIEW" && (
                <>
                  <option value="VERIFIED">VERIFIED (Confirmed by authority)</option>
                  <option value="REJECTED">REJECTED (Empirical tests disproved)</option>
                </>
              )}
              {selectedCauseForVerify?.verification_status === "REJECTED" && (
                <option value="UNDER_REVIEW">UNDER_REVIEW (Re-open inspection)</option>
              )}
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">
              Statutory Verification Notes <span className="required">*</span>
            </label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="Mandatory directive details, lab report reference number, or inspection team name..."
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
              Confirm Verification
            </Button>
          </div>
        </form>
      </Modal>

      {/* Evidence Ledger Modal */}
      <Modal
        isOpen={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        title="Root Cause Evidence Ledger"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h5 style={{ margin: "0 0 0.25rem", fontSize: "0.95rem" }}>
              {selectedCauseForEvidence?.cause}
            </h5>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Attaching empirical evidence increases cause confidence deterministically (+5 pts/record).
            </div>
          </div>

          {/* Evidence List */}
          {loadingEvidence ? (
            <div style={{ textAlign: "center", padding: "1rem" }}>
              <Icon name="spinner" size={20} color="var(--color-primary)" />
            </div>
          ) : evidenceList.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--bg-muted)",
                borderRadius: "var(--radius-sm)",
                textAlign: "center",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              No evidence attached yet. Submit field observations, water quality lab reports, or geo-surveys below.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "220px", overflowY: "auto" }}>
              {evidenceList.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{ev.title}</span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-primary-subtle)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {ev.evidence_type}
                    </span>
                  </div>
                  {ev.description && (
                    <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {ev.description}
                    </p>
                  )}
                  {ev.evidence_url && (
                    <a
                      href={ev.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.75rem", color: "var(--color-primary)", marginTop: "0.25rem", display: "inline-block" }}
                    >
                      View Source Document &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Attach New Evidence Form */}
          <form onSubmit={handleEvidenceSubmit} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <h6 style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", fontWeight: 700 }}>
              Attach New Empirical Record
            </h6>

            {role === "CITIZEN" && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  marginBottom: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-info-subtle)",
                  border: "1px solid var(--color-info-border)",
                  fontSize: "0.78rem",
                  color: "var(--color-info)",
                }}
              >
                <strong>Citizen Evidence Mode:</strong> In accordance with statutory rules, citizens may attach field observations, community reports, or media verification links.
              </div>
            )}

            <div className="cs-grid-2">
              <div className="cs-form-group">
                <label className="cs-label">Evidence Type</label>
                <select
                  className="cs-select"
                  value={evidenceForm.evidence_type}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_type: e.target.value })}
                >
                  {allowedEvidenceTypes.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cs-form-group">
                <label className="cs-label">
                  Record Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="cs-input"
                  placeholder="e.g., Water Board Turbidity & Fluoride Report"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="cs-form-group">
              <label className="cs-label">Description / Test Findings</label>
              <input
                type="text"
                className="cs-input"
                placeholder="Observed pH 5.2, TDS > 1200ppm in Dhanbad sector 4 borewell"
                value={evidenceForm.description}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
              />
            </div>

            <div className="cs-form-group">
              <label className="cs-label">Source Document Link (Optional)</label>
              <input
                type="url"
                className="cs-input"
                placeholder="https://jharkhand.gov.in/water-reports/2026/04"
                value={evidenceForm.evidence_url}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_url: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEvidenceModalOpen(false)}
                disabled={submittingEvidence}
              >
                Close
              </Button>
              <Button type="submit" variant="primary" loading={submittingEvidence}>
                Attach to Ledger
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
