import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { StatusBadge } from "../common/Badges";
import { Modal } from "../common/Modal";
import { MatchScoreIndicator } from "../common/ProgressBar";
import { solutionApi, problemApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";

const SUBMISSION_ALLOWED_ROLES = ["STUDENT", "RESEARCHER", "STARTUP", "MSME", "UNIVERSITY"];
const EVALUATION_ALLOWED_ROLES = ["AUTHORITY", "ADMIN"];

const EVALUATION_DIMENSIONS = [
  { key: "impact_score", label: "Impact", weight: "25% (x5)", desc: "Extent of problem resolution and citizen well-being improvement" },
  { key: "feasibility_score", label: "Feasibility & Technology", weight: "20% (x4)", desc: "Technical maturity, deployability in local geography" },
  { key: "cost_efficiency_score", label: "Cost Efficiency", weight: "15% (x3)", desc: "Capital & operational expenditure vs expected benefits" },
  { key: "scalability_score", label: "Scalability", weight: "15% (x3)", desc: "Ease of expansion to neighboring districts and clusters" },
  { key: "evidence_score", label: "Evidence & Validation", weight: "15% (x3)", desc: "Rigorous empirical proof-of-concept, lab testing, or pilot data" },
  { key: "risk_score", label: "Risk Mitigation", weight: "10% (x2)", desc: "Environmental, socio-political, and operational contingency buffers" },
];

export function SolutionsView({ problemId }) {
  const { role, user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("all"); // "all" | "ranked"
  const [loading, setLoading] = useState(true);
  const [solutions, setSolutions] = useState([]);
  const [rankedSolutions, setRankedSolutions] = useState([]);
  const [error, setError] = useState("");

  // Submit Solution Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [solutionForm, setSolutionForm] = useState({
    title: "",
    description: "",
    methodology: "",
    technology: "",
    expected_impact: "",
    estimated_cost: "",
    implementation_time: "",
    scalability: "",
    required_resources: "",
    risks: "",
    evidence: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    
    // Check size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit");
      return;
    }
    
    const allowedTypes = ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".ppt") && !file.name.endsWith(".pptx")) {
      toast.error("Only PDF, PPT, and PPTX files are supported");
      return;
    }
    
    setSelectedFile(file);
  };

  // Evaluate Modal (Authority / Admin)
  const [evaluateModalOpen, setEvaluateModalOpen] = useState(false);
  const [selectedSolutionForEval, setSelectedSolutionForEval] = useState(null);
  const [evalScores, setEvalScores] = useState({
    impact_score: 4,
    feasibility_score: 4,
    cost_efficiency_score: 4,
    scalability_score: 4,
    evidence_score: 3,
    risk_score: 4,
  });
  const [evalRecommendation, setEvalRecommendation] = useState("RECOMMENDED");
  const [evalComments, setEvalComments] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  // Status Change Modal (Authority / Admin)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedSolutionForStatus, setSelectedSolutionForStatus] = useState(null);
  const [targetStatus, setTargetStatus] = useState("UNDER_EVALUATION");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const canSubmit = SUBMISSION_ALLOWED_ROLES.includes(role);
  const canEvaluate = EVALUATION_ALLOWED_ROLES.includes(role);

  const refreshData = async () => {
    if (!problemId) return;
    try {
      const [allRes, rankRes] = await Promise.all([
        solutionApi.getSolutionsForProblem(problemId, { limit: 50 }).catch(() => ({ solutions: [] })),
        solutionApi.getRankedSolutions(problemId).catch(() => ({ ranked_solutions: [] })),
      ]);
      setSolutions(allRes.solutions || []);
      setRankedSolutions(rankRes.ranked_solutions || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load solutions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      if (!problemId) return;
      try {
        const [allRes, rankRes] = await Promise.all([
          solutionApi.getSolutionsForProblem(problemId, { limit: 50 }).catch(() => ({ solutions: [] })),
          solutionApi.getRankedSolutions(problemId).catch(() => ({ ranked_solutions: [] })),
        ]);
        if (!ignore) {
          setSolutions(allRes.solutions || []);
          setRankedSolutions(rankRes.ranked_solutions || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load solutions");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [problemId]);

  // Pre-fill demo scenario solution if empty
  const handlePrefillScenario = () => {
    setSolutionForm({
      title: "Solar-Powered Multi-Stage Hydro-Filtration & Biochar Remediation",
      description:
        "Modular decentralized groundwater remediation plant utilizing dual-stage activated biochar adsorption, electrocoagulation for heavy metal settling, and UV sterilization powered by local photovoltaic arrays.",
      methodology:
        "Subterranean extraction piped through 3-stage filtration: (1) Gravel sediment filter, (2) Activated bamboo biochar adsorption chamber, (3) Solar UV disinfection. Zero chemical additive byproduct.",
      technology: "Activated Biochar, Solar Photovoltaic (2kW), Electrocoagulation Cell, IoT Turbidity & TDS Sensors",
      expected_impact:
        "Reduces groundwater TDS from 1400ppm to <250ppm, eliminates industrial heavy metals, supplying potable water to 500+ residents.",
      estimated_cost: "250000",
      implementation_time: "45 Days",
      scalability: "Modular containerized skid design deployable to any village borewell with 48 hours setup.",
      required_resources: "Land parcel (15x15 ft), community water point access, 2 trained local pump operators.",
      risks: "Filter media replacement required bi-annually; local village water committee trained for maintenance.",
      evidence: "Field tested in Bokaro industrial belt (Lab Report #CS-2026-W09).",
    });
  };

  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    if (!solutionForm.title.trim() || !solutionForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if ((role === "STUDENT" || role === "UNIVERSITY") && !selectedFile) {
      toast.error("Please upload a solution document (PDF/PPT/PPTX)");
      return;
    }
    setSubmitting(true);
    try {
      let uploadedUrl = solutionForm.evidence;

      if (selectedFile) {
        setUploadProgress(10);
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(selectedFile);
        });
        
        const base64Data = await base64Promise;
        setUploadProgress(50);
        
        const uploadRes = await problemApi.uploadEvidence({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64Data
        });
        
        uploadedUrl = uploadRes.file_url;
        setUploadProgress(100);
      }

      await solutionApi.createSolution(problemId, {
        title: solutionForm.title.trim(),
        description: solutionForm.description.trim(),
        methodology: solutionForm.methodology.trim() || undefined,
        technology: solutionForm.technology.trim() || undefined,
        expected_impact: solutionForm.expected_impact.trim() || undefined,
        estimated_cost: solutionForm.estimated_cost ? Number(solutionForm.estimated_cost) : undefined,
        implementation_time: solutionForm.implementation_time.trim() || undefined,
        scalability: solutionForm.scalability.trim() || undefined,
        required_resources: solutionForm.required_resources.trim() || undefined,
        risks: solutionForm.risks.trim() || undefined,
        evidence: uploadedUrl || undefined,
      });
      toast.success("Solution submitted successfully for municipal evaluation");
      setSubmitModalOpen(false);
      setSolutionForm({
        title: "",
        description: "",
        methodology: "",
        technology: "",
        expected_impact: "",
        estimated_cost: "",
        implementation_time: "",
        scalability: "",
        required_resources: "",
        risks: "",
        evidence: "",
      });
      setSelectedFile(null);
      setUploadProgress(0);
      refreshData();
    } catch (err) {
      toast.error(err.message || "Failed to submit solution");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Evaluate Modal
  const handleOpenEvaluate = (solution) => {
    setSelectedSolutionForEval(solution);
    setEvalScores({
      impact_score: 4,
      feasibility_score: 4,
      cost_efficiency_score: 4,
      scalability_score: 4,
      evidence_score: 3,
      risk_score: 4,
    });
    setEvalRecommendation("RECOMMENDED");
    setEvalComments("");
    setEvaluateModalOpen(true);
  };

  // Calculate dynamic preview composite score (Formula: Impact*5 + Feasibility*4 + Cost*3 + Scalability*3 + Evidence*3 + Risk*2)
  const previewComposite =
    evalScores.impact_score * 5 +
    evalScores.feasibility_score * 4 +
    evalScores.cost_efficiency_score * 3 +
    evalScores.scalability_score * 3 +
    evalScores.evidence_score * 3 +
    evalScores.risk_score * 2;

  // Submit Evaluation
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedSolutionForEval) return;
    setSubmittingEval(true);
    try {
      await solutionApi.submitEvaluation(selectedSolutionForEval.id, {
        impact_score: Number(evalScores.impact_score),
        feasibility_score: Number(evalScores.feasibility_score),
        cost_efficiency_score: Number(evalScores.cost_efficiency_score),
        scalability_score: Number(evalScores.scalability_score),
        evidence_score: Number(evalScores.evidence_score),
        risk_score: Number(evalScores.risk_score),
        recommendation: evalRecommendation,
        comments: evalComments.trim() || undefined,
      });
      toast.success("Multidimensional evaluation submitted successfully");
      setEvaluateModalOpen(false);
      refreshData();
    } catch (err) {
      toast.error(err.message || "Evaluation failed");
    } finally {
      setSubmittingEval(false);
    }
  };

  // Open Status Modal
  const handleOpenStatus = (solution) => {
    setSelectedSolutionForStatus(solution);
    if (solution.status === "SUBMITTED") setTargetStatus("UNDER_EVALUATION");
    else if (solution.status === "UNDER_EVALUATION") setTargetStatus("EVALUATED");
    else if (solution.status === "EVALUATED") setTargetStatus("APPROVED");
    else if (solution.status === "APPROVED") setTargetStatus("PILOT");
    else setTargetStatus(solution.status);
    setStatusModalOpen(true);
  };

  // Submit Status Change
  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    if (!selectedSolutionForStatus) return;
    setSubmittingStatus(true);
    try {
      await solutionApi.updateSolutionStatus(selectedSolutionForStatus.id, {
        status: targetStatus,
      });
      toast.success(`Solution status updated to ${targetStatus}`);
      setStatusModalOpen(false);
      refreshData();
    } catch (err) {
      toast.error(err.message || "Status update failed");
    } finally {
      setSubmittingStatus(false);
    }
  };

  let displayList = activeTab === "ranked" ? rankedSolutions : solutions;
  if (role === "STUDENT" && user) {
    displayList = displayList.filter(sol => Number(sol.submitter_id || sol.submitted_by) === Number(user.id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header & Controls */}
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
              Proposed Solutions & Multidimensional Evaluation
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
            Academic, research & innovation proposals evaluated on 6 statutory criteria (Impact, Feasibility, Cost, Scalability, Evidence, Risk)
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Submissions button (Role restricted) */}
          {canSubmit ? (
            <Button
              variant="primary"
              icon="plus-circle"
              onClick={() => {
                setSubmitModalOpen(true);
                if (!solutionForm.title) handlePrefillScenario();
              }}
            >
              Submit Solution Proposal
            </Button>
          ) : (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-muted)",
                padding: "0.4rem 0.65rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            >
              Solution submission is restricted to Academic & Innovation accounts (University, Student, Researcher, Startup, MSME).
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "all" ? "var(--color-primary)" : "transparent",
            color: activeTab === "all" ? "#ffffff" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          All Solutions ({solutions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ranked")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "ranked" ? "var(--color-primary)" : "transparent",
            color: activeTab === "ranked" ? "#ffffff" : "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>🏆</span> Ranked & Evaluated ({rankedSolutions.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Loading solution proposals...
          </p>
        </Card>
      ) : error ? (
        <Card style={{ backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
          {error}
        </Card>
      ) : displayList.length === 0 ? (
        <Card
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            backgroundColor: "var(--bg-muted)",
            border: "1px dashed var(--border-color)",
            borderRadius: "var(--radius-xl)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
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
            <Icon name="check-circle" size={24} />
          </div>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>
            {activeTab === "ranked"
              ? "No Evaluated Solutions Yet"
              : (role === "STUDENT" ? "You haven't submitted any solutions yet" : "No Solutions Submitted Yet")}
          </h4>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "420px" }}>
            {activeTab === "ranked"
              ? "Municipal authorities evaluate submitted solutions across the 6 normalized dimensions to generate deterministic composite rankings."
              : ((role === "STUDENT" || role === "UNIVERSITY")
                  ? "Propose your solution idea by uploading a document (PDF/PPT/PPTX). You don't need to provide a complete business plan." 
                  : "Registered universities, research labs, student teams, and startups can submit technical proposals to solve this civic challenge.")}
          </p>
          {canSubmit && (
            <Button
              variant="primary"
              icon="plus-circle"
              onClick={() => {
                setSubmitModalOpen(true);
                handlePrefillScenario();
              }}
            >
              Submit Solution Proposal
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {displayList.map((sol, index) => {
            const hasScore =
              (sol.average_score !== undefined && sol.average_score !== null) ||
              (sol.composite_score !== undefined && sol.composite_score !== null);
            const scoreNum = Number(sol.average_score ?? sol.composite_score ?? 0);

            return (
              <div
                key={sol.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-xl)",
                  padding: "2rem",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary-border)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
              >
                {/* Solution Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                      {activeTab === "ranked" && (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor:
                              index === 0
                                ? "rgba(234, 179, 8, 0.15)"
                                : index === 1
                                ? "rgba(148, 163, 184, 0.2)"
                                : "rgba(180, 83, 9, 0.15)",
                            color:
                              index === 0
                                ? "#a16207"
                                : index === 1
                                ? "#475569"
                                : "#9a3412",
                          }}
                        >
                          #{index + 1} Ranked
                        </span>
                      )}
                      <StatusBadge status={sol.status} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Submitted by: <strong>{sol.submitter_name || sol.organization_name || "Academic Contributor"}</strong>
                      </span>
                    </div>

                    <h4 style={{ margin: "0.25rem 0 0", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.01em" }}>
                      {sol.title}
                    </h4>
                  </div>

                  {/* Composite Score Pill if Evaluated */}
                  {hasScore ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        backgroundColor: "var(--bg-muted)",
                        padding: "0.5rem 0.85rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                          Composite Score
                        </div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-primary)" }}>
                          {scoreNum.toFixed(1)} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>/ 100</span>
                        </div>
                      </div>
                      <MatchScoreIndicator score={scoreNum} />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        backgroundColor: "var(--bg-muted)",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Pending Evaluation
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {sol.description}
                </p>

                {/* Specs Grid (Hidden for Students and Universities) */}
                {role !== "STUDENT" && role !== "UNIVERSITY" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.75rem",
                      padding: "0.85rem",
                      backgroundColor: "var(--bg-muted)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {sol.technology && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>TECHNOLOGY</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          {sol.technology}
                        </div>
                      </div>
                    )}

                    {sol.estimated_cost !== null && sol.estimated_cost !== undefined && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>ESTIMATED COST</div>
                        <div style={{ fontWeight: 700, color: "var(--color-primary)", marginTop: "0.15rem" }}>
                          ₹{Number(sol.estimated_cost).toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}

                    {sol.implementation_time && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>TIMELINE</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          {sol.implementation_time}
                        </div>
                      </div>
                    )}

                    {sol.scalability && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>SCALABILITY</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          {sol.scalability}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Methodology Details if available (Hidden for Students and Universities) */}
                {role !== "STUDENT" && role !== "UNIVERSITY" && sol.methodology && (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <strong>Methodology:</strong> {sol.methodology}
                  </div>
                )}

                {/* Expected Impact (Hidden for Students and Universities) */}
                {role !== "STUDENT" && role !== "UNIVERSITY" && sol.expected_impact && (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-success)" }}>
                    <strong>Expected Impact:</strong> {sol.expected_impact}
                  </div>
                )}

                {/* Uploaded Document / Evidence */}
                {sol.evidence && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <a
                      href={sol.evidence.startsWith("http") ? sol.evidence : `http://localhost:5000${sol.evidence.startsWith("/") ? "" : "/"}${sol.evidence}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.5rem 0.8rem",
                        backgroundColor: "var(--color-primary-subtle)",
                        color: "var(--color-primary)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        border: "1px solid var(--color-primary-border)",
                      }}
                    >
                      <Icon name="file-text" size={16} />
                      View Uploaded Document
                    </a>
                  </div>
                )}

                {/* Authority Evaluation Breakdown if present */}
                {((sol.evaluations && sol.evaluations.length > 0) || sol.dimension_averages) && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "0.75rem",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      STATUTORY EVALUATION CRITERIA BREAKDOWN
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "0.5rem",
                      }}
                    >
                      {EVALUATION_DIMENSIONS.map((dim) => {
                        const dimKeyClean = dim.key.replace("_score", "");
                        const val =
                          sol.dimension_averages && sol.dimension_averages[dimKeyClean] !== undefined
                            ? sol.dimension_averages[dimKeyClean]
                            : sol.evaluations?.[0]?.[dim.key];
                        return (
                          <div
                            key={dim.key}
                            style={{
                              padding: "0.5rem",
                              backgroundColor: "#ffffff",
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{dim.label}</div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-primary)" }}>
                              {val ? `${val} / 5` : "N/A"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {sol.evaluations[0]?.comments && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        &ldquo;{sol.evaluations[0]?.comments}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Actions Bar for Authority / Admin */}
                {canEvaluate && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.75rem",
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "0.75rem",
                    }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      icon="activity"
                      onClick={() => handleOpenStatus(sol)}
                    >
                      Update Lifecycle Status
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="check-circle"
                      onClick={() => handleOpenEvaluate(sol)}
                    >
                      Score / Evaluate Solution
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Solution Proposal Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit Solution Proposal"
      >
        <form onSubmit={handleSubmitSolution}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Submitting as: <strong>{role}</strong>
            </span>
            <button
              type="button"
              onClick={handlePrefillScenario}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Fill Demo Scenario Data
            </button>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">
              Solution Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="cs-input"
              placeholder="e.g., Low-cost IoT-based water quality monitoring system"
              value={solutionForm.title}
              onChange={(e) => setSolutionForm({ ...solutionForm, title: e.target.value })}
              required
            />
          </div>

          <div className="cs-form-group">
            <label className="cs-label">
              Solution Description <span className="required">*</span>
            </label>
            <textarea
              className="cs-textarea"
              rows={4}
              placeholder="Explain your proposed solution, how it addresses the problem, and the main idea behind how it would work..."
              value={solutionForm.description}
              onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
              required
            />
          </div>
          
          <div className="cs-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <label className="cs-label" style={{ margin: 0 }}>
                Solution Document <span className="required">*</span>
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Slide 1: Title\nSlide 2: Problem Understanding\nSlide 3: Proposed Solution\nSlide 4: How It Works\nSlide 5: Expected Benefits\nSlide 6: Team & Skills");
                }}
                style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "underline" }}
              >
                Need a format? View Solution Template
              </a>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Upload your solution presentation or PDF. Accepted: PDF, PPT, PPTX (Max 25MB)
            </div>
            
            <input
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={handleFileChange}
              style={{ display: "block", marginBottom: "0.5rem" }}
              required={role === "STUDENT" || role === "UNIVERSITY"}
            />
            {selectedFile && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>

          {role !== "STUDENT" && role !== "UNIVERSITY" && (
            <>
              <div className="cs-grid-2">
                <div className="cs-form-group">
                  <label className="cs-label">Technology & Tools</label>
                  <input
                    type="text"
                    className="cs-input"
                    placeholder="e.g., Activated Biochar, IoT Turbidity Sensors, UV"
                    value={solutionForm.technology}
                    onChange={(e) => setSolutionForm({ ...solutionForm, technology: e.target.value })}
                  />
                </div>

                <div className="cs-form-group">
                  <label className="cs-label">Estimated Budget (INR)</label>
                  <input
                    type="number"
                    className="cs-input"
                    placeholder="250000"
                    min="0"
                    value={solutionForm.estimated_cost}
                    onChange={(e) => setSolutionForm({ ...solutionForm, estimated_cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="cs-grid-2">
                <div className="cs-form-group">
                  <label className="cs-label">Execution Timeline</label>
                  <input
                    type="text"
                    className="cs-input"
                    placeholder="e.g., 45 Days"
                    value={solutionForm.implementation_time}
                    onChange={(e) => setSolutionForm({ ...solutionForm, implementation_time: e.target.value })}
                  />
                </div>

                <div className="cs-form-group">
                  <label className="cs-label">Scalability Potential</label>
                  <input
                    type="text"
                    className="cs-input"
                    placeholder="e.g., Modular containerized skid"
                    value={solutionForm.scalability}
                    onChange={(e) => setSolutionForm({ ...solutionForm, scalability: e.target.value })}
                  />
                </div>
              </div>

              <div className="cs-form-group">
                <label className="cs-label">Technical Methodology</label>
                <textarea
                  className="cs-textarea"
                  rows={2}
                  placeholder="Step-by-step technical implementation stages..."
                  value={solutionForm.methodology}
                  onChange={(e) => setSolutionForm({ ...solutionForm, methodology: e.target.value })}
                />
              </div>

              <div className="cs-form-group">
                <label className="cs-label">Expected Civic Impact</label>
                <input
                  type="text"
                  className="cs-input"
                  placeholder="e.g., Supplies potable drinking water to 500+ residents; reduces TDS to <250ppm"
                  value={solutionForm.expected_impact}
                  onChange={(e) => setSolutionForm({ ...solutionForm, expected_impact: e.target.value })}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit for Authority Evaluation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Evaluate Solution Modal (Authority / Admin) */}
      <Modal
        isOpen={evaluateModalOpen}
        onClose={() => setEvaluateModalOpen(false)}
        title="Statutory Multidimensional Evaluation"
      >
        <form onSubmit={handleSubmitEvaluation}>
          <div style={{ marginBottom: "1rem" }}>
            <h5 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>
              {selectedSolutionForEval?.title}
            </h5>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Rate each dimension from 1 (Poor) to 5 (Outstanding). The composite score is calculated deterministically.
            </div>
          </div>

          {/* Dynamic Score Calculator Callout */}
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "var(--color-primary-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-primary-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary)" }}>
                CALCULATED COMPOSITE SCORE:
              </span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-primary)" }}>
                {previewComposite} / 100
              </div>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.25rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: previewComposite >= 75 ? "var(--color-success)" : "var(--color-warning)",
                color: "#ffffff",
              }}
            >
              {previewComposite >= 75 ? "EXCELLENT CANDIDATE" : "ACCEPTABLE"}
            </span>
          </div>

          {/* Sliders / Inputs for 6 dimensions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {EVALUATION_DIMENSIONS.map((dim) => (
              <div
                key={dim.key}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--bg-muted)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {dim.label} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({dim.weight})</span>
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)" }}>
                    {evalScores[dim.key]} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  style={{ width: "100%", accentColor: "var(--color-primary)" }}
                  value={evalScores[dim.key]}
                  onChange={(e) =>
                    setEvalScores({ ...evalScores, [dim.key]: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            ))}
          </div>

          <div className="cs-form-group" style={{ marginTop: "1rem" }}>
            <label className="cs-label">
              Statutory Recommendation <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={evalRecommendation}
              onChange={(e) => setEvalRecommendation(e.target.value)}
            >
              <option value="RECOMMENDED">RECOMMENDED (Proceed toward Pilot deployment)</option>
              <option value="CONSIDER">CONSIDER (Requires minor modifications/budget review)</option>
              <option value="NOT_RECOMMENDED">NOT_RECOMMENDED (Insufficient feasibility or high risk)</option>
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Evaluator Comments / Review Directives</label>
            <textarea
              className="cs-textarea"
              rows={2}
              placeholder="e.g., Excellent technical feasibility with proven biochar adsorption; low capital overhead."
              value={evalComments}
              onChange={(e) => setEvalComments(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEvaluateModalOpen(false)}
              disabled={submittingEval}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingEval}>
              Record Statutory Evaluation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Modal (Authority / Admin) */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Solution Status"
      >
        <form onSubmit={handleSubmitStatus}>
          <div className="cs-form-group">
            <label className="cs-label">
              Select Target Status <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
            >
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_EVALUATION">UNDER_EVALUATION</option>
              <option value="EVALUATED">EVALUATED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PILOT">PILOT</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusModalOpen(false)}
              disabled={submittingStatus}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingStatus}>
              Update Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
