import { useState } from "react";
import { Icon } from "../common/Icons";
import { useAuth } from "../../context/useAuth.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { StatusBadge } from "../common/Badges";
import { useTranslation } from "../../context/useTranslation.js";

export function Sidebar() {
  const { user, role, logout } = useAuth();
  const { path } = useRouter();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // Helper to determine active state
  const isActive = (itemPath) => {
    if (itemPath === "/dashboard" && (path === "/dashboard" || path === "/")) {
      return true;
    }
    return path.startsWith(itemPath);
  };

  // Role-filtered navigation definitions
  const getNavItems = () => {
    const commonItems = [
      { path: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
      { path: "/explore", label: t("nav.explore"), icon: "search" },
    ];

    let roleItems;

    switch (role) {
      case "CITIZEN":
        roleItems = [
          { path: "/report", label: t("nav.report"), icon: "plus-circle" },
          { path: "/my-reports", label: t("nav.myReports"), icon: "layers" },
        ];
        break;

      case "STUDENT":
        roleItems = [
          { path: "/matches", label: "Matching Skills", icon: "target" },
          { path: "/collaborations", label: "Collaborations", icon: "users" },
          { path: "/solutions", label: "Solutions", icon: "cpu" },
        ];
        break;

      case "RESEARCHER":
        roleItems = [
          { path: "/matches", label: "Research Matches", icon: "microscope" },
          { path: "/collaborations", label: "Collaborations", icon: "users" },
          { path: "/solutions", label: "Solutions", icon: "cpu" },
        ];
        break;

      case "UNIVERSITY":
        roleItems = [
          { path: "/matches", label: "Matched Problems", icon: "building" },
          { path: "/collaborations", label: "Faculty & Students", icon: "graduation-cap" },
          { path: "/solutions", label: "Solutions", icon: "cpu" },
          { path: "/impact", label: "Institutional Impact", icon: "activity" },
        ];
        break;

      case "STARTUP":
      case "MSME":
        roleItems = [
          { path: "/matches", label: "Innovation Matches", icon: "rocket" },
          { path: "/solutions", label: "Solutions", icon: "cpu" },
          { path: "/impact", label: "Pilots & Projects", icon: "activity" },
        ];
        break;

      case "AUTHORITY":
        roleItems = [
          { path: "/report", label: t("nav.report"), icon: "plus-circle" },
          { path: "/explore", label: "Priority Problems", icon: "alert-triangle" },
          { path: "/solutions", label: "Solution Review", icon: "cpu" },
          { path: "/impact", label: "Implementation & Pilot", icon: "activity" },
          { path: "/dashboard/analytics", label: "Analytics Dashboard", icon: "activity" },
          { path: "/dashboard/trust", label: "Trust & Anti-Gaming", icon: "shield-check" },
        ];
        break;

      case "ADMIN":
        roleItems = [
          { path: "/report", label: t("nav.report"), icon: "plus-circle" },
          { path: "/solutions", label: "Solution Review", icon: "cpu" },
          { path: "/impact", label: "Impact & Pilots", icon: "activity" },
          { path: "/dashboard/analytics", label: "Analytics Dashboard", icon: "activity" },
          { path: "/dashboard/trust", label: "Trust & Anti-Gaming", icon: "shield-check" },
        ];
        break;

      default:
        roleItems = [{ path: "/report", label: t("nav.report"), icon: "plus-circle" }];
    }

    const trailingItems = [
      { path: "/notifications", label: t("nav.notifications"), icon: "bell" },
      { path: "/reputation", label: t("nav.reputation"), icon: "award" },
      { path: "/rankings", label: t("nav.leaderboards"), icon: "trending-up" },
      { path: "/profile", label: t("nav.profile"), icon: "shield-check" },
    ];

    return [...commonItems, ...roleItems, ...trailingItems];
  };

  const navItems = getNavItems();

  return (
    <aside
      style={{
        width: collapsed ? "78px" : "260px",
        minHeight: "100vh",
        backgroundColor: "var(--bg-sidebar)",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        transition: "width var(--transition-normal)",
        flexShrink: 0,
        zIndex: 50,
        borderRight: "1px solid #1e293b",
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "1.25rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <Link
          to="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 0 15px rgba(37, 99, 235, 0.4)",
              flexShrink: 0,
            }}
          >
            <Icon name="shield-check" size={22} />
          </div>

          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
                CivicSync
              </div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>
                SIH 2026 Innovation
              </div>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "0.35rem",
            display: collapsed ? "none" : "flex",
            alignItems: "center",
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="menu" size={18} />
        </button>
      </div>

      {/* Role Pill Banner */}
      {!collapsed && user && (
        <div
          style={{
            padding: "0.75rem 1.25rem",
            backgroundColor: "#162032",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>Logged as:</span>
          <StatusBadge status={role} />
        </div>
      )}

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: "1rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          overflowY: "auto",
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: collapsed ? "0.75rem" : "0.75rem 1rem",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--radius-md)",
                color: active ? "#ffffff" : "#94a3b8",
                backgroundColor: active ? "var(--color-primary)" : "transparent",
                fontWeight: active ? 600 : 500,
                fontSize: "0.875rem",
                textDecoration: "none",
                transition: "all var(--transition-fast)",
              }}
              title={collapsed ? item.label : undefined}
            >
              <div style={{ color: active ? "#ffffff" : "#94a3b8", display: "flex" }}>
                <Icon name={item.icon} size={19} />
              </div>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Footprint & Logout */}
      <div
        style={{
          padding: "1rem 0.75rem",
          borderTop: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {!collapsed && user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "#162032",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary-dark)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.875rem",
                border: "1px solid #3b82f6",
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: "0.65rem 0.85rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "transparent",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
            transition: "background var(--transition-fast)",
          }}
          title="Log out"
        >
          <Icon name="log-out" size={17} />
          {!collapsed && <span>{t("nav.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
