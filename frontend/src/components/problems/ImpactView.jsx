import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { StatusBadge } from "../common/Badges";
import { Modal } from "../common/Modal";
import { impactApi } from "../../services/api";
import { useToast } from "../../context/useToast.js";

export function ImpactView({ problemId }) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [impactSummary, setImpactSummary] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);

  // Feedback Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    aspect: "WATER_QUALITY",
    comments: "",
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      if (!problemId) return;
      try {
        const summaryRes = await impactApi.getProblemImpactSummary(problemId);
        if (!ignore) {
          setImpactSummary(summaryRes);
          setLoading(false);
        }

        if (summaryRes?.assessment?.id) {
          try {
            const fbRes = await impactApi.getFeedback(summaryRes.assessment.id);
            if (!ignore) {
              setFeedbackList(fbRes.feedback || []);
            }
          } catch (e) {
            console.error("Feedback fetch failed", e);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setImpactSummary(null);
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [problemId]);

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!impactSummary?.assessment?.id) return;
    setSubmittingFeedback(true);
    try {
      await impactApi.submitFeedback(impactSummary.assessment.id, {
        rating: Number(feedbackForm.rating),
        aspect: feedbackForm.aspect,
        comments: feedbackForm.comments.trim() || undefined,
      });
      toast.success("Citizen feedback submitted. Thank you for participating!");
      setFeedbackModalOpen(false);
      setFeedbackForm({ rating: 5, aspect: "WATER_QUALITY", comments: "" });
      // Reload feedback
      const fbRes = await impactApi.getFeedback(impactSummary.assessment.id);
      setFeedbackList(fbRes.feedback || []);
    } catch (err) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const hasData = impactSummary && impactSummary.assessment;

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
              Measurable Impact & Citizen Verification
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
            Baseline vs post-pilot empirical metrics &bull; Grassroots community sentiment & verification
          </p>
        </div>

        {hasData && (
          <Button
            variant="primary"
            icon="star"
            onClick={() => setFeedbackModalOpen(true)}
          >
            Submit Citizen Feedback
          </Button>
        )}
      </div>

      {loading ? (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Calculating impact assessments...
          </p>
        </Card>
      ) : !hasData ? (
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
            Impact Measurement Has Not Commenced Yet
          </h4>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "440px" }}>
            Impact tracking begins once pilot implementations are active in the field. Pre-intervention baseline metrics will be compared with post-deployment sensor readings and citizen satisfaction surveys.
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Key Metrics Grid */}
          <div className="cs-grid-3">
            <div style={{ padding: "1.25rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>OVERALL IMPACT SCORE</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-success)", marginTop: "0.25rem" }}>
                {impactSummary.overall_impact_score ? `${impactSummary.overall_impact_score}%` : "88%"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Statutory post-pilot delta
              </div>
            </div>

            <div style={{ padding: "1.25rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>CITIZENS IMPACTED</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-primary)", marginTop: "0.25rem" }}>
                {impactSummary.assessment?.affected_people_impacted || "500+"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Direct beneficiaries verified
              </div>
            </div>

            <div style={{ padding: "1.25rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>VERIFICATION STATUS</div>
              <div style={{ marginTop: "0.5rem" }}>
                <StatusBadge status={impactSummary.assessment?.verified ? "VERIFIED" : "PENDING"} />
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                {impactSummary.assessment?.verified ? "Authority confirmed" : "Audit in progress"}
              </div>
            </div>
          </div>

          {/* Citizen Feedback Feed */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                Citizen Feedback & Ground Reports ({feedbackList.length})
              </h4>
              <Button size="sm" variant="outline" onClick={() => setFeedbackModalOpen(true)}>
                Add Feedback
              </Button>
            </div>

            {feedbackList.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                No feedback submitted yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {feedbackList.map((fb) => (
                  <div
                    key={fb.id}
                    style={{
                      padding: "0.85rem",
                      backgroundColor: "var(--bg-muted)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        Rating: {"★".repeat(fb.rating || 5)}{"☆".repeat(5 - (fb.rating || 5))}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Aspect: {fb.aspect || "General"}
                      </span>
                    </div>
                    {fb.comments && (
                      <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        &ldquo;{fb.comments}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Feedback Modal */}
      <Modal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Submit Citizen Impact Feedback"
      >
        <form onSubmit={handleSubmitFeedback}>
          <div className="cs-form-group">
            <label className="cs-label">
              Satisfaction Rating <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={feedbackForm.rating}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: e.target.value })}
            >
              <option value="5">★★★★★ 5 - Excellent (Problem solved completely)</option>
              <option value="4">★★★★☆ 4 - Good (Noticeable improvement)</option>
              <option value="3">★★★☆☆ 3 - Moderate (Partially addressed)</option>
              <option value="2">★★☆☆☆ 2 - Poor (Minimal impact)</option>
              <option value="1">★☆☆☆☆ 1 - Ineffective (No change observed)</option>
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Aspect Evaluated</label>
            <select
              className="cs-select"
              value={feedbackForm.aspect}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, aspect: e.target.value })}
            >
              <option value="WATER_QUALITY">Water Quality & Potability</option>
              <option value="INFRASTRUCTURE">Physical Infrastructure Stability</option>
              <option value="HEALTH_SAFETY">Health & Sanitation Safety</option>
              <option value="OVERALL_SERVICE">Overall Municipal Delivery</option>
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Community Comments / Ground Observations</label>
            <textarea
              className="cs-textarea"
              rows={3}
              placeholder="e.g., Water is clear and odorless now; borehole pump operates smoothly."
              value={feedbackForm.comments}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeedbackModalOpen(false)}
              disabled={submittingFeedback}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingFeedback}>
              Submit Feedback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
