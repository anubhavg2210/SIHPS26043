import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth.js";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { StatusBadge } from "../common/Badges";
import { ProgressBar } from "../common/ProgressBar";
import { Modal } from "../common/Modal";
import { implementationApi, solutionApi, matchingApi, problemApi } from "../../services/api";
import { useToast } from "../../context/useToast.js";

export function ImplementationView({ problemId }) {
  const toast = useToast();
  const { role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [implementations, setImplementations] = useState([]);
  const [selectedImpl, setSelectedImpl] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [evidence, setEvidence] = useState([]);
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

  // Add Evidence Modal
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    evidence_type: "PHOTO",
  });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  // Verify Evidence Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyingEvidenceId, setVerifyingEvidenceId] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ status: "VERIFIED", remarks: "" });
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Assign Partner Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignData, setAssignData] = useState({ solutions: [], partners: [], loading: false });
  const [assignForm, setAssignForm] = useState({ solutionId: "", partnerId: "", partnerName: "", title: "", expectedCompletionDate: "" });
  const [submittingAssign, setSubmittingAssign] = useState(false);

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
          
          // Also fetch evidence
          const evRes = await implementationApi.getEvidence(selectedImpl.id);
          setEvidence(evRes.evidence || []);
          
          setLoadingUpdates(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setUpdates([]);
          setEvidence([]);
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

  const handleEvidenceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceFile({
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePostEvidence = async (e) => {
    e.preventDefault();
    if (!selectedImpl) return;
    if (!evidenceFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    setSubmittingEvidence(true);
    try {
      // 1. Upload file first
      const uploadRes = await problemApi.uploadEvidence({
        fileName: evidenceFile.name,
        fileType: evidenceFile.type,
        fileData: evidenceFile.dataUrl,
      });

      // 2. Submit evidence
      await implementationApi.addEvidence(selectedImpl.id, {
        title: evidenceForm.title.trim(),
        evidence_type: evidenceForm.evidence_type,
        file_url: uploadRes.file_url || undefined,
      });
      toast.success("Evidence submitted successfully (Pending Verification)");
      setEvidenceModalOpen(false);
      setEvidenceForm({ title: "", evidence_type: "PHOTO" });
      setEvidenceFile(null);
      
      const evRes = await implementationApi.getEvidence(selectedImpl.id);
      setEvidence(evRes.evidence || []);
    } catch (err) {
      toast.error(err.message || "Failed to submit evidence");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleVerifyEvidence = async (e) => {
    e.preventDefault();
    if (!selectedImpl || !verifyingEvidenceId) return;
    setSubmittingVerify(true);
    try {
      await implementationApi.verifyEvidence(selectedImpl.id, verifyingEvidenceId, {
        status: verifyForm.status,
        remarks: verifyForm.remarks.trim() || undefined,
      });
      toast.success(`Evidence marked as ${verifyForm.status}`);
      setVerifyModalOpen(false);
      setVerifyingEvidenceId(null);
      setVerifyForm({ status: "VERIFIED", remarks: "" });
      
      const evRes = await implementationApi.getEvidence(selectedImpl.id);
      setEvidence(evRes.evidence || []);
    } catch (err) {
      toast.error(err.message || "Failed to verify evidence");
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleOpenAssignModal = async () => {
    setAssignModalOpen(true);
    setAssignData({ solutions: [], partners: [], loading: true });
    try {
      const [solRes, matchRes] = await Promise.all([
        solutionApi.getRankedSolutions(problemId),
        matchingApi.getMsmeMatches(problemId)
      ]);
      setAssignData({
        solutions: solRes.solutions || [],
        partners: matchRes.matches || [],
        loading: false
      });
      setAssignForm({
        solutionId: solRes.solutions?.[0]?.id || "",
        partnerId: matchRes.matches?.[0]?.user_id || "",
        partnerName: matchRes.matches?.[0]?.name || "",
        title: "Implementation Phase 1",
        expectedCompletionDate: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assignment data.");
      setAssignData({ solutions: [], partners: [], loading: false });
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.solutionId || !assignForm.partnerName) {
      toast.error("Please select a solution and provide a partner name.");
      return;
    }
    setSubmittingAssign(true);
    try {
      await implementationApi.createImplementationForSolution(assignForm.solutionId, {
        title: assignForm.title,
        partner_id: assignForm.partnerId || null,
        partner_name: assignForm.partnerName,
        expected_completion_date: assignForm.expectedCompletionDate || null
      });
      toast.success("Implementation assigned successfully!");
      setAssignModalOpen(false);
      refreshImplementations();
    } catch (err) {
      toast.error(err.message || "Failed to assign implementation.");
    } finally {
      setSubmittingAssign(false);
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
            </span>
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Real-time physical execution milestones &bull; Transparent field updates from project managers & researchers
          </p>
        </div>

        {selectedImpl && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
              variant="outline"
              icon="camera"
              onClick={() => {
                setEvidenceForm({ title: "", evidence_type: "PHOTO" });
                setEvidenceFile(null);
                setEvidenceModalOpen(true);
              }}
            >
              Submit Evidence
            </Button>
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
              Post Update
            </Button>
          </div>
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
          <p style={{ margin: "0 auto 1.5rem", fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "440px" }}>
            Once an approved solution is selected and municipal funding is allocated, pilot milestones, field updates, and live progress will be tracked here.
          </p>
          {role === "AUTHORITY" && (
            <Button variant="primary" icon="plus" onClick={handleOpenAssignModal}>
              Assign Implementation Partner
            </Button>
          )}
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

              {/* Implementation Evidence Section (M13) */}
              <div style={{ marginTop: "2rem" }}>
                <h5 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>
                  Implementation Evidence (M13)
                </h5>
                {evidence.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    No evidence submitted yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {evidence.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--bg-muted)",
                          borderLeft: `3px solid ${
                            ev.verification_status === "VERIFIED"
                              ? "var(--color-success)"
                              : ev.verification_status === "REJECTED"
                              ? "var(--color-danger)"
                              : "var(--color-warning)"
                          }`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", marginRight: "0.5rem" }}>{ev.title}</span>
                            <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem", backgroundColor: "#e2e8f0", borderRadius: "4px" }}>
                              {ev.evidence_type}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>
                              Status: {ev.verification_status}
                            </span>
                            {role === "AUTHORITY" && ev.verification_status === "PENDING" && (
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => {
                                  setVerifyingEvidenceId(ev.id);
                                  setVerifyForm({ status: "VERIFIED", remarks: "" });
                                  setVerifyModalOpen(true);
                                }}
                              >
                                Verify
                              </Button>
                            )}
                          </div>
                        </div>
                        {ev.file_url && (
                          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                            <a href={ev.file_url} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)" }}>
                              View Attached File
                            </a>
                          </div>
                        )}
                        {ev.reviewer_remarks && (
                          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                            <strong>Reviewer Remarks:</strong> {ev.reviewer_remarks}
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

      {/* Add Evidence Modal */}
      <Modal
        isOpen={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        title="Submit Implementation Evidence"
      >
        <form onSubmit={handlePostEvidence}>
          <div className="cs-form-group">
            <label className="cs-label">
              Evidence Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="cs-input"
              placeholder="e.g., Drone footage of Site A"
              value={evidenceForm.title}
              onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
              required
            />
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Evidence Type</label>
            <select
              className="cs-input"
              value={evidenceForm.evidence_type}
              onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_type: e.target.value })}
            >
              <option value="PHOTO">Photo</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
              <option value="LINK">Link</option>
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">File Upload <span className="required">*</span></label>
            <input
              type="file"
              accept={evidenceForm.evidence_type === "VIDEO" ? "video/*" : "image/*,application/pdf"}
              className="cs-input"
              onChange={handleEvidenceFileChange}
              required
            />
            {evidenceFile && <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--color-success)" }}>File selected: {evidenceFile.name}</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button type="button" variant="outline" onClick={() => { setEvidenceModalOpen(false); setEvidenceFile(null); }} disabled={submittingEvidence}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingEvidence}>
              Submit Evidence
            </Button>
          </div>
        </form>
      </Modal>

      {/* Verify Evidence Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Verify Implementation Evidence"
      >
        <form onSubmit={handleVerifyEvidence}>
          <div className="cs-form-group">
            <label className="cs-label">Status</label>
            <select
              className="cs-input"
              value={verifyForm.status}
              onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value })}
            >
              <option value="VERIFIED">Approve (VERIFIED)</option>
              <option value="REJECTED">Reject (REJECTED)</option>
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Review Remarks</label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="Explain your verification decision..."
              value={verifyForm.remarks}
              onChange={(e) => setVerifyForm({ ...verifyForm, remarks: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button type="button" variant="outline" onClick={() => setVerifyModalOpen(false)} disabled={submittingVerify}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingVerify}>
              Confirm Verdict
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Partner Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Implementation Partner"
      >
        {assignData.loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <Icon name="spinner" size={24} color="var(--color-primary)" />
            <p>Loading solutions and recommendations...</p>
          </div>
        ) : (
          <form onSubmit={handleAssignSubmit}>
            <div className="cs-form-group">
              <label className="cs-label">Select Solution <span className="required">*</span></label>
              <select
                className="cs-input"
                value={assignForm.solutionId}
                onChange={(e) => setAssignForm({ ...assignForm, solutionId: e.target.value })}
                required
              >
                <option value="">-- Choose a Solution --</option>
                {assignData.solutions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <div className="cs-form-group">
              <label className="cs-label">Recommended Partner (MSME/Startup)</label>
              <select
                className="cs-input"
                value={assignForm.partnerId}
                onChange={(e) => {
                  const partner = assignData.partners.find(p => String(p.user_id) === String(e.target.value));
                  setAssignForm({
                    ...assignForm,
                    partnerId: e.target.value,
                    partnerName: partner ? partner.name : assignForm.partnerName
                  });
                }}
              >
                <option value="">-- Select or enter manually below --</option>
                {assignData.partners.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.name} (Match: {Math.round(p.match_score * 100)}%)</option>
                ))}
              </select>
            </div>

            <div className="cs-form-group">
              <label className="cs-label">Partner Name <span className="required">*</span></label>
              <input
                type="text"
                className="cs-input"
                placeholder="Partner Name"
                value={assignForm.partnerName}
                onChange={(e) => setAssignForm({ ...assignForm, partnerName: e.target.value })}
                required
              />
            </div>

            <div className="cs-form-group">
              <label className="cs-label">Implementation Title</label>
              <input
                type="text"
                className="cs-input"
                placeholder="Phase 1 Execution"
                value={assignForm.title}
                onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                required
              />
            </div>

            <div className="cs-form-group">
              <label className="cs-label">Expected Completion Date</label>
              <input
                type="date"
                className="cs-input"
                value={assignForm.expectedCompletionDate}
                onChange={(e) => setAssignForm({ ...assignForm, expectedCompletionDate: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)} disabled={submittingAssign}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingAssign}>
                Assign Partner
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
