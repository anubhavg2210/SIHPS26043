import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { StatusBadge } from "../common/Badges";
import { problemApi } from "../../services/api";
import { useAuth } from "../../context/useAuth";

export function CommunityView({ problemId }) {
  const { role, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supports, setSupports] = useState({ count: 0, supported: false });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isModerator = role === "AUTHORITY" || role === "ADMIN";

  useEffect(() => {
    let ignore = false;
    async function loadCommunity() {
      try {
        setLoading(true);
        const [supportRes, commentsRes] = await Promise.all([
          problemApi.getSupports(problemId),
          problemApi.getComments(problemId),
        ]);
        if (!ignore) {
          setSupports({
            count: supportRes.support_count || 0,
            supported: supportRes.supported || false,
          });
          setComments(commentsRes.comments || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError("Failed to load community data");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadCommunity();
    return () => { ignore = true; };
  }, [problemId, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  const handleSupportToggle = async () => {
    if (!isAuthenticated) return;
    try {
      if (supports.supported) {
        const res = await problemApi.removeSupport(problemId);
        setSupports({ count: res.support_count, supported: res.supported });
      } else {
        const res = await problemApi.supportProblem(problemId);
        setSupports({ count: res.support_count, supported: res.supported });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || submitting) return;
    try {
      setSubmitting(true);
      await problemApi.addComment(problemId, { comment: newComment });
      setNewComment("");
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerate = async (commentId, status) => {
    try {
      await problemApi.moderateComment(problemId, commentId, { status });
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Icon name="spinner" size={24} color="var(--color-primary)" />
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading community data...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {error && (
        <div style={{ padding: "1rem", backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)", borderRadius: "var(--radius-md)" }}>
          {error}
        </div>
      )}

      {/* Support Section */}
      <Card title="Community Support" subtitle="Help prioritize this problem by showing your support">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {supports.count}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              people support this problem
            </div>
          </div>
          <Button
            variant={supports.supported ? "success" : "primary"}
            icon={supports.supported ? "check" : "thumbs-up"}
            onClick={handleSupportToggle}
            disabled={!isAuthenticated}
          >
            {supports.supported ? "Supported" : "Support Problem"}
          </Button>
        </div>
      </Card>

      {/* Comments Section */}
      <Card title="Community Comments" subtitle="Share your experience or provide additional context">
        {/* Comment Form */}
        {isAuthenticated && (
          <div style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-color)" }}>
            <textarea
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                minHeight: "80px",
                fontFamily: "inherit",
                resize: "vertical",
                marginBottom: "0.75rem",
                boxSizing: "border-box",
              }}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePostComment}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        )}

        {/* Comment List */}
        {comments.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", padding: "2rem 0" }}>
            No community comments yet. Be the first to share your experience.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "1rem",
                  backgroundColor: "var(--bg-muted)",
                  borderRadius: "var(--radius-md)",
                  borderLeft: c.status === "HIDDEN" ? "3px solid var(--color-danger)" : "3px solid transparent",
                  opacity: c.status === "HIDDEN" ? 0.7 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.user_name}</div>
                    <StatusBadge status={c.user_role} />
                    {c.status !== "VISIBLE" && (
                      <span style={{ fontSize: "0.7rem", backgroundColor: "var(--color-danger)", color: "white", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-sm)" }}>
                        {c.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                  {c.comment}
                </p>

                {/* Moderation Controls */}
                {isModerator && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
                    {c.status !== "HIDDEN" && (
                      <Button variant="outline" size="sm" onClick={() => handleModerate(c.id, "HIDDEN")}>
                        Hide Comment
                      </Button>
                    )}
                    {c.status !== "VISIBLE" && (
                      <Button variant="outline" size="sm" onClick={() => handleModerate(c.id, "VISIBLE")}>
                        Restore Comment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
