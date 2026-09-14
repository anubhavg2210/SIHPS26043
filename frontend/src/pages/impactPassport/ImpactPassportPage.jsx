import { useState, useEffect, useCallback } from "react";
import { useRouter } from "../../context/useRouter";
import { problemApi } from "../../services/api";
import { Card } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { Icon } from "../../components/common/Icons";
import { StatusBadge } from "../../components/common/Badges";

function ImpactPassportPage() {
  const { segments, navigate } = useRouter();
  const id = segments[1];
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPassport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await problemApi.getImpactPassport(id);
      setPassport(res.passport);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load Impact Passport. Make sure you have permission to view it.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPassport();
  }, [loadPassport]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <Icon name="spinner" size={36} color="var(--color-primary)" />
        <p style={{ margin: "1rem 0 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Generating Impact Passport...
        </p>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1.5rem", maxWidth: "600px", margin: "2rem auto" }}>
        <Icon name="alert-triangle" size={36} color="var(--color-danger)" />
        <h3 style={{ margin: "1rem 0 0.5rem", fontSize: "1.25rem" }}>Error</h3>
        <p style={{ margin: "0 0 1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {error}
        </p>
        <Button variant="primary" onClick={() => navigate(`/problems/${id}`)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="ghost" onClick={() => navigate(`/problems/${id}`)}>
          &larr; Back to Problem
        </Button>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Generated: {new Date(passport.outcome.generated_at).toLocaleString()}
        </span>
      </div>

      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>CivicSync Impact Passport</h1>
      
      <Card title="Final Outcome" variant="elevated">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>Overall Status</h3>
          <StatusBadge status={passport.outcome.status} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
          <div>
            <strong>Problem:</strong> <span style={{ color: "var(--text-muted)" }}>{passport.problem?.title}</span>
          </div>
          <div>
            <strong>Solution:</strong> <span style={{ color: "var(--text-muted)" }}>{passport.solutions?.find(s => ['APPROVED', 'SELECTED'].includes(s.status))?.title || "N/A"}</span>
          </div>
          <div>
            <strong>Implementation:</strong> <span style={{ color: "var(--text-muted)" }}>{passport.implementation?.status || "N/A"}</span>
          </div>
          <div>
            <strong>Impact:</strong> <span style={{ color: "var(--text-muted)" }}>{passport.impact ? "Measured" : "N/A"}</span>
          </div>
        </div>
      </Card>

      <Card title="1. Problem Summary">
        <h3 style={{ margin: "0 0 0.5rem" }}>{passport.problem?.title}</h3>
        <p style={{ margin: "0 0 1rem", fontSize: "0.95rem" }}>{passport.problem?.description}</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="badge badge-blue">{passport.problem?.category}</span>
          <span className="badge badge-cyan">{passport.problem?.subcategory}</span>
          {passport.problem?.location && <span className="badge badge-gray">{passport.problem.location}</span>}
          <StatusBadge status={passport.problem?.status} />
        </div>
      </Card>

      {passport.aiAnalysis && (
        <Card title="2. AI Problem Intelligence" icon="cpu">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div><strong>Severity:</strong> <span className="badge badge-red">{passport.aiAnalysis.severity}</span></div>
            <div><strong>Urgency:</strong> <span className="badge badge-orange">{passport.aiAnalysis.urgency}</span></div>
          </div>
          <strong>Required Expertise:</strong>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            {passport.aiAnalysis.required_expertise?.map((req, i) => (
              <span key={i} className="badge badge-outline">{req}</span>
            ))}
          </div>
        </Card>
      )}

      <Card title="3. Community & Priority" icon="users">
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <strong>Community Signal:</strong>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{passport.community?.support_count} supporters</div>
          </div>
          {passport.priority && (
            <div>
              <strong>Priority Level:</strong>
              <div>
                <span className={`badge ${passport.priority.level === 'CRITICAL' ? 'badge-red' : 'badge-blue'}`}>
                  {passport.priority.level}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="4. Expertise & Collaboration" icon="link">
        <div style={{ marginBottom: "1rem" }}>
          <strong>Matched Expertise Roles:</strong>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            {passport.matching?.faculty_matched && <span className="badge badge-indigo">Faculty</span>}
            {passport.matching?.students_matched && <span className="badge badge-indigo">Student</span>}
            {passport.matching?.researchers_matched && <span className="badge badge-indigo">Researcher</span>}
            {passport.matching?.startups_msmes_matched && <span className="badge badge-indigo">Startup/MSME</span>}
            {Object.keys(passport.matching || {}).length === 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No expertise matched yet.</span>}
          </div>
        </div>

        <div>
          <strong>Collaboration Team:</strong>
          {passport.collaboration ? (
            <div style={{ padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <strong>{passport.collaboration.team_name}</strong>
                <StatusBadge status={passport.collaboration.status} />
              </div>
              <div style={{ fontSize: "0.9rem" }}>Members:</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                {passport.collaboration.members.map((m, i) => (
                  <span key={i} className="badge badge-gray">{m.role} ({m.user_role})</span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>No collaboration team formed.</div>
          )}
        </div>
      </Card>

      <Card title="5. Solution Development" icon="check-circle">
        {passport.solutions?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {passport.solutions.map((s, i) => (
              <div key={i} style={{ padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{s.title}</strong>
                  <StatusBadge status={s.status} />
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>{s.summary}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)" }}>No solutions proposed yet.</div>
        )}
      </Card>

      {passport.implementation && (
        <Card title="6. Implementation & Pilot" icon="activity">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div><strong>Pilot Title:</strong> <div>{passport.implementation.title}</div></div>
            <div><strong>Implementing Partner:</strong> <div>{passport.implementation.partner}</div></div>
            <div><strong>Progress:</strong> <div>{passport.implementation.progress}%</div></div>
            <div><strong>Status:</strong> <div><StatusBadge status={passport.implementation.status} /></div></div>
          </div>
        </Card>
      )}

      {passport.evidence?.length > 0 && (
        <Card title="7. Evidence & Verification" icon="file">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {passport.evidence.map((ev, i) => (
              <div key={i} style={{ padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {ev.status === 'VERIFIED' && <Icon name="check-circle" size={16} color="var(--color-success)" />}
                    <strong>{ev.title}</strong>
                  </div>
                  <StatusBadge status={ev.status} />
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Type: {ev.type}</div>
                {ev.remarks && (
                  <div style={{ fontSize: "0.9rem", fontStyle: "italic", marginTop: "0.5rem" }}>"{ev.remarks}"</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {passport.impact && (
        <Card title="8. Impact Measurement" icon="star">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <strong>Overall Impact Score:</strong>
            <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--color-success)" }}>{passport.impact.score}</span>
          </div>
          <hr style={{ border: "0", borderTop: "1px solid var(--border-color)", margin: "1rem 0" }} />
          <strong>Metrics:</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", margin: "1rem 0" }}>
            {passport.impact.metrics.map((m, i) => (
              <div key={i} style={{ padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <strong>{m.metric_name}</strong>
                <div style={{ fontSize: "0.9rem", marginTop: "0.5rem", lineHeight: "1.5" }}>
                  Baseline: {m.baseline_value} {m.unit} <br />
                  Target: {m.target_value} {m.unit} <br />
                  Actual: <strong>{m.actual_value} {m.unit}</strong>
                </div>
              </div>
            ))}
          </div>
          {passport.impact.feedback?.length > 0 && (
            <>
              <strong>Community Feedback:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                {passport.impact.feedback.map((f, i) => (
                  <div key={i} style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
                    "{f.comments}" - Rating: {f.rating}/5
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default ImpactPassportPage;
