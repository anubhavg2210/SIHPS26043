import { useState } from "react";
import { Input } from "../../components/common/FormControls";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Cards";
import { Icon } from "../../components/common/Icons";
import { DemoBadge } from "../../components/common/Badges";
import { useAuth, DEMO_ACCOUNTS } from "../../context/useAuth.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { useToast } from "../../context/useToast.js";

export function LoginPage() {
  const { login, demoSwitchRole } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role) => {
    setError("");
    setLoading(true);
    try {
      const user = await demoSwitchRole(role);
      toast.success(`Authenticated as ${user.role} (${user.name})`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Brand Link */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              color: "var(--text-primary)",
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
              }}
            >
              <Icon name="shield-check" size={22} />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.4rem" }}>CivicSync</span>
          </Link>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Sign in to access your civic innovation workspace
          </p>
        </div>

        {/* Login Card */}
        <Card padding="2rem" style={{ boxShadow: "var(--shadow-md)" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-danger-subtle)",
                border: "1px solid var(--color-danger-border)",
                color: "var(--color-danger)",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Icon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div style={{ position: "relative" }}>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "33px",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Logins Section */}
          <div
            style={{
              marginTop: "1.75rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>
                FAST DEMO LOGIN (AUTHENTICATED)
              </span>
              <DemoBadge />
            </div>

            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
              Click any seeded role below to log in directly via the backend API:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin(acc.role)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.45rem 0.65rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-muted)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.backgroundColor = "var(--color-primary-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                  }}
                >
                  <Icon name="users" size={12} color="var(--color-primary)" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {acc.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Register footer link */}
        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ fontWeight: 600, color: "var(--color-primary)" }}>
            Create one now
          </Link>
        </div>
      </div>
    </div>
  );
}
