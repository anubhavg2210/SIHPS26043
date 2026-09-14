import { useState, useEffect } from "react";
import { Card } from "../common/Cards";
import { Button } from "../common/Button";
import { Icon } from "../common/Icons";
import { EmptyState } from "../common/Feedback";
import { teamApi } from "../../services/api";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { useRouter } from "../../context/useRouter";

// ---------------------------------------------------------------------------
// Role & Status helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
  FORMING: "#7c3aed",
  ACTIVE: "#059669",
  COMPLETED: "#2563eb",
  CLOSED: "#6b7280",
};

const MEMBER_ROLE_ICONS = {
  LEAD: "star",
  FACULTY: "graduation-cap",
  STUDENT: "users",
  RESEARCHER: "microscope",
  STARTUP: "rocket",
  MSME: "briefcase",
  CITIZEN: "user",
};

const MEMBERSHIP_STATUS_COLORS = {
  ACTIVE: "#059669",
  INVITED: "#d97706",
  DECLINED: "#dc2626",
  REMOVED: "#6b7280",
};

const VALID_TRANSITIONS = {
  FORMING: ["ACTIVE", "CLOSED"],
  ACTIVE: ["COMPLETED", "CLOSED"],
  COMPLETED: [],
  CLOSED: [],
};

const VALID_ROLES = ["FACULTY", "STUDENT", "RESEARCHER", "STARTUP", "MSME", "CITIZEN"];

// ---------------------------------------------------------------------------
// TeamView — main component
// ---------------------------------------------------------------------------

export function TeamView({ problem }) {
  const { user } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create team form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("STUDENT");

  // Fetch teams for the problem
  useEffect(() => {
    let ignore = false;
    async function fetchTeams() {
      if (!problem?.id) return;
      try {
        const res = await teamApi.getTeamsForProblem(problem.id);
        if (!ignore) {
          const list = res?.teams || [];
          setTeams(list);
          if (list.length > 0 && !selectedTeam) {
            // Auto-select first team (prefer FORMING or ACTIVE)
            const active = list.find((t) => t.status === "FORMING" || t.status === "ACTIVE");
            setSelectedTeam(active || list[0]);
          }
        }
      } catch {
        // Non-fatal
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchTeams();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id]);

  // Reload full team details when selectedTeam changes
  const [teamDetail, setTeamDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchDetail() {
      if (!selectedTeam?.id) {
        setTeamDetail(null);
        return;
      }
      setDetailLoading(true);
      try {
        const res = await teamApi.getTeam(selectedTeam.id);
        if (!ignore) setTeamDetail(res?.team || null);
      } catch {
        if (!ignore) setTeamDetail(null);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }
    fetchDetail();
    return () => { ignore = true; };
  }, [selectedTeam?.id]);

  const currentUserId = user?.id ? Number(user.id) : null;

  const myMembership = teamDetail?.members?.find(
    (m) => Number(m.user_id) === currentUserId
  );
  const isLead = myMembership?.role === "LEAD" && myMembership?.membership_status === "ACTIVE";
  const isInvited = myMembership?.membership_status === "INVITED";
  const isActive = myMembership?.membership_status === "ACTIVE";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const refreshTeamDetail = async (tid) => {
    try {
      const res = await teamApi.getTeam(tid || selectedTeam.id);
      setTeamDetail(res?.team || null);
    } catch {
      // silently fail
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("Team name cannot be empty");
      return;
    }
    setActionLoading(true);
    try {
      const res = await teamApi.createTeam({ problemId: problem.id, name: newTeamName.trim() });
      const created = res?.team;
      toast.success(`Team "${created.name}" created!`);
      setTeams((prev) => [created, ...prev]);
      setSelectedTeam(created);
      setNewTeamName("");
      setShowCreateForm(false);
      await refreshTeamDetail(created.id);
    } catch (err) {
      toast.error(err?.message || "Failed to create team");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvite = async () => {
    const uid = parseInt(inviteUserId, 10);
    if (isNaN(uid) || uid <= 0) {
      toast.error("Please enter a valid User ID");
      return;
    }
    setActionLoading(true);
    try {
      await teamApi.inviteMember(teamDetail.id, { userId: uid, role: inviteRole });
      toast.success("Invitation sent!");
      setInviteUserId("");
      setShowInviteForm(false);
      await refreshTeamDetail();
    } catch (err) {
      toast.error(err?.message || "Failed to send invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await teamApi.acceptInvitation(teamDetail.id);
      toast.success("You have joined the team!");
      await refreshTeamDetail();
    } catch (err) {
      toast.error(err?.message || "Failed to accept invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await teamApi.declineInvitation(teamDetail.id);
      toast.info("Invitation declined");
      await refreshTeamDetail();
    } catch (err) {
      toast.error(err?.message || "Failed to decline invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    setActionLoading(true);
    try {
      await teamApi.removeMember(teamDetail.id, userId);
      toast.success("Member removed");
      await refreshTeamDetail();
    } catch (err) {
      toast.error(err?.message || "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      const res = await teamApi.updateTeamStatus(teamDetail.id, { status: newStatus });
      toast.success(`Team status → ${res.team.status}`);
      setTeamDetail((prev) => ({ ...prev, status: res.team.status }));
      setTeams((prev) => prev.map((t) => t.id === res.team.id ? { ...t, status: res.team.status } : t));
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderMemberRow = (member) => {
    const isSelf = Number(member.user_id) === currentUserId;
    return (
      <div
        key={member.id || member.user_id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: "var(--bg-muted)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--color-primary-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-primary)", flexShrink: 0,
            }}
          >
            <Icon name={MEMBER_ROLE_ICONS[member.role] || "user"} size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
              {member.user_name || `User #${member.user_id}`}
              {isSelf && (
                <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  (You)
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {member.user_role} · Team Role: {member.role}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem",
              borderRadius: "var(--radius-sm)",
              background: `${MEMBERSHIP_STATUS_COLORS[member.membership_status]}20`,
              color: MEMBERSHIP_STATUS_COLORS[member.membership_status],
              border: `1px solid ${MEMBERSHIP_STATUS_COLORS[member.membership_status]}40`,
            }}
          >
            {member.membership_status}
          </span>
          {isLead && !isSelf && member.membership_status === "ACTIVE" && (
            <Button
              variant="danger"
              size="sm"
              icon="x"
              loading={actionLoading}
              onClick={() => handleRemoveMember(member.user_id)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Card title="Collaboration Teams">
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>Loading teams...</div>
        </div>
      </Card>
    );
  }

  const allowedTransitions = teamDetail ? (VALID_TRANSITIONS[teamDetail.status] || []) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Team list selector + create */}
      <Card
        title="Collaboration Teams"
        subtitle={`${teams.length} team${teams.length !== 1 ? "s" : ""} for this problem`}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() => setShowCreateForm((p) => !p)}
          >
            Create Team
          </Button>
        }
      >
        {/* Create Team Form */}
        {showCreateForm && (
          <div
            style={{
              background: "var(--bg-muted)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              marginBottom: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
              New Team for: {problem?.title}
            </div>
            <input
              id="m9-team-name-input"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Groundwater Solution Team"
              maxLength={200}
              style={{
                padding: "0.6rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleCreateTeam}>
                Create Team
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Team Tabs */}
        {teams.length === 0 ? (
          <EmptyState
            icon="users"
            title="No teams yet"
            description="Create a collaboration team to bring matched experts together to solve this problem."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: selectedTeam?.id === team.id
                    ? `2px solid var(--color-primary)`
                    : "1px solid var(--border-color)",
                  background: selectedTeam?.id === team.id ? "var(--color-primary-subtle)" : "var(--bg-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    {team.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {team.member_count ?? "?"} active member{team.member_count !== 1 ? "s" : ""}
                    · Created by {team.creator_name || "Unknown"}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem",
                    borderRadius: "var(--radius-sm)",
                    background: `${STATUS_COLORS[team.status] || "#888"}20`,
                    color: STATUS_COLORS[team.status] || "#888",
                    border: `1px solid ${STATUS_COLORS[team.status] || "#888"}40`,
                  }}
                >
                  {team.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Team Detail */}
      {selectedTeam && (
        <Card
          title={detailLoading ? "Loading team..." : (teamDetail?.name || selectedTeam.name)}
          subtitle={teamDetail ? `Problem: ${teamDetail.problem_title}` : ""}
          actions={
            teamDetail && (
              <span
                style={{
                  fontSize: "0.78rem", fontWeight: 700, padding: "0.25rem 0.7rem",
                  borderRadius: "var(--radius-sm)",
                  background: `${STATUS_COLORS[teamDetail.status] || "#888"}20`,
                  color: STATUS_COLORS[teamDetail.status] || "#888",
                  border: `1px solid ${STATUS_COLORS[teamDetail.status] || "#888"}40`,
                }}
              >
                {teamDetail.status}
              </span>
            )
          }
        >
          {detailLoading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              <Icon name="spinner" size={20} color="var(--color-primary)" />
            </div>
          ) : teamDetail ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Invitation actions for invited users */}
              {isInvited && (
                <div
                  style={{
                    padding: "1rem",
                    background: "#fef3c720",
                    border: "1px solid #fbbf2440",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                      🎉 You have been invited to this team!
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Role: {myMembership?.role}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button variant="success" size="sm" icon="check" loading={actionLoading} onClick={handleAccept}>
                      Accept
                    </Button>
                    <Button variant="outline" size="sm" icon="x" loading={actionLoading} onClick={handleDecline}>
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Members list */}
              <div>
                <div
                  style={{
                    fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginBottom: "0.6rem",
                  }}
                >
                  Team Members ({teamDetail.members?.filter((m) => m.membership_status === "ACTIVE").length || 0} active)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {teamDetail.members?.map(renderMemberRow)}
                </div>
              </div>

              {/* Invite form (LEAD only) */}
              {isLead && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={showInviteForm ? "x" : "user-plus"}
                    onClick={() => setShowInviteForm((p) => !p)}
                  >
                    {showInviteForm ? "Cancel" : "Invite Member"}
                  </Button>
                  {showInviteForm && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "1rem",
                        background: "var(--bg-muted)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        Invite Contributor
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <input
                          id="m9-invite-user-id"
                          type="number"
                          value={inviteUserId}
                          onChange={(e) => setInviteUserId(e.target.value)}
                          placeholder="User ID"
                          style={{
                            padding: "0.5rem 0.75rem",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--bg-primary)",
                            color: "var(--text-primary)",
                            fontSize: "0.875rem",
                            width: 120,
                          }}
                        />
                        <select
                          id="m9-invite-role"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          style={{
                            padding: "0.5rem 0.75rem",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--bg-primary)",
                            color: "var(--text-primary)",
                            fontSize: "0.875rem",
                          }}
                        >
                          {VALID_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={actionLoading}
                          onClick={handleInvite}
                        >
                          Send Invitation
                        </Button>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Tip: Use the Expertise Matching tab to find User IDs of matched contributors.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status controls (LEAD only) */}
              {isLead && allowedTransitions.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center" }}>
                    Change Status:
                  </div>
                  {allowedTransitions.map((s) => (
                    <Button
                      key={s}
                      variant={s === "ACTIVE" ? "success" : s === "COMPLETED" ? "primary" : "outline"}
                      size="sm"
                      loading={actionLoading}
                      onClick={() => handleStatusChange(s)}
                    >
                      → {s}
                    </Button>
                  ))}
                </div>
              )}

              {/* Continue to Solution */}
              {(isLead || isActive) && (
                <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon="arrow-right"
                    iconPosition="right"
                    onClick={() => navigate(`/problems/${problem.id}`)}
                  >
                    View Problem
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon="arrow-right"
                    iconPosition="right"
                    onClick={() => navigate(`/problems/${problem.id}?tab=solutions&team_id=${teamDetail.id}`)}
                  >
                    Continue to Solution
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon="alert-circle" title="Could not load team details" />
          )}
        </Card>
      )}
    </div>
  );
}
