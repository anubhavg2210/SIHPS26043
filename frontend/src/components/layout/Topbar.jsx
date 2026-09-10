import { useState, useRef, useEffect } from "react";
import { Icon } from "../common/Icons";
import { useAuth } from "../../context/useAuth.js";
import { useNotification } from "../../context/useNotification.js";
import { useToast } from "../../context/useToast.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { StatusBadge, DemoBadge } from "../common/Badges";

export function Topbar() {
  const { user, role, logout, demoSwitchRole, demoAccounts } = useAuth();
  const { unreadCount } = useNotification();
  const toast = useToast();
  const { navigate } = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [switchingRole, setSwitchingRole] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const demoRef = useRef(null);
  const profileRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (demoRef.current && !demoRef.current.contains(e.target)) {
        setDemoMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleRoleSwitch = async (targetRole) => {
    setDemoMenuOpen(false);
    setSwitchingRole(true);
    try {
      const loggedUser = await demoSwitchRole(targetRole);
      toast.success(`Switched role to ${loggedUser.role} (${loggedUser.name}) via real backend login.`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(`Demo login failed: ${err.message}`);
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <header
      style={{
        height: "68px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
      }}
    >
      {/* Global Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--bg-muted)",
          borderRadius: "var(--radius-md)",
          padding: "0.45rem 0.85rem",
          width: "min(380px, 100%)",
          border: "1px solid transparent",
          transition: "border-color var(--transition-fast)",
        }}
      >
        <Icon name="search" size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search problems, domains, districts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            border: "none",
            background: "none",
            outline: "none",
            marginLeft: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            width: "100%",
          }}
        />
      </form>

      {/* Action Zone: Demo Switcher, Notification, User Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Genuine Backend Demo Role Switcher */}
        <div ref={demoRef} style={{ position: "relative" }}>
          <button
            type="button"
            disabled={switchingRole}
            onClick={() => setDemoMenuOpen(!demoMenuOpen)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.4rem 0.85rem",
              backgroundColor: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              borderRadius: "var(--radius-full)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Perform legitimate backend login using seeded demonstration accounts"
          >
            {switchingRole ? (
              <Icon name="spinner" size={14} color="#92400e" />
            ) : (
              <Icon name="users" size={14} color="#92400e" />
            )}
            <span>Demo Quick-Switch</span>
            <Icon name="chevron-down" size={12} color="#92400e" />
          </button>

          {demoMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "120%",
                right: 0,
                width: "290px",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                padding: "0.5rem 0",
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: "0.5rem 1rem 0.35rem",
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  AUTHENTICATED DEMO ROLES
                </span>
                <DemoBadge />
              </div>

              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {demoAccounts.map((acc) => {
                  const isCurrent = acc.role === role;

                  return (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleRoleSwitch(acc.role)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.6rem 1rem",
                        border: "none",
                        background: isCurrent ? "var(--color-primary-subtle)" : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "background var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: isCurrent ? "var(--color-primary)" : "var(--text-primary)",
                          }}
                        >
                          {acc.label}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {acc.name}
                        </div>
                      </div>

                      {isCurrent ? (
                        <Icon name="check" size={16} color="var(--color-primary)" />
                      ) : (
                        <StatusBadge status={acc.role} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <Link
          to="/notifications"
          style={{
            position: "relative",
            padding: "0.5rem",
            color: "var(--text-secondary)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
          title="View Notifications"
        >
          <Icon name="bell" size={20} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                fontSize: "0.65rem",
                fontWeight: 700,
                borderRadius: "var(--radius-full)",
                padding: "0.1rem 0.35rem",
                lineHeight: 1,
                boxShadow: "0 0 0 2px #ffffff",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Dropdown */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {user?.name || "CivicSync User"}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {role || "CITIZEN"}
              </span>
            </div>

            <Icon name="chevron-down" size={14} color="var(--text-muted)" />
          </button>

          {profileMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "120%",
                right: 0,
                width: "210px",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                padding: "0.4rem 0",
                zIndex: 100,
              }}
            >
              <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user?.email}</div>
              </div>

              <Link
                to="/profile"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Icon name="shield-check" size={16} />
                <span>My Profile</span>
              </Link>

              <Link
                to="/reputation"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Icon name="award" size={16} />
                <span>Reputation & Badges</span>
              </Link>

              <Link
                to="/rankings"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Icon name="trending-up" size={16} />
                <span>State Leaderboards</span>
              </Link>

              <div style={{ borderTop: "1px solid var(--border-color)", margin: "0.25rem 0" }} />

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                  navigate("/");
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "#ef4444",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <Icon name="log-out" size={16} color="#ef4444" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
