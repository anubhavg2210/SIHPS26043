import { useState } from "react";
import { Icon } from "../../components/common/Icons";
import { useAuth } from "../../context/useAuth.js";
import { Link } from "../../context/RouterContext.jsx";
import { useRouter } from "../../context/useRouter.js";
import { useToast } from "../../context/useToast.js";
import { useTranslation } from "../../context/useTranslation.js";

export function LoginPage() {
  const { login, demoSwitchRole } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const { language } = useTranslation();

  const isHi = language === "hi";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isHi ? "कृपया ईमेल और पासवर्ड दोनों दर्ज करें।" : "Please provide both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success(isHi ? `स्वागत है, ${user.name}!` : `Welcome back, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || (isHi ? "अमान्य क्रेडेंशियल। पुनः प्रयास करें।" : "Invalid credentials. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (role) => {
    setError("");
    setLoading(true);
    try {
      const user = await demoSwitchRole(role);
      toast.success(isHi ? `${user.role} (${user.name}) के रूप में जुड़े` : `Connected as ${user.role} (${user.name})`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || (isHi ? "साइन इन विफल रहा।" : "Sign in failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--canvas)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem 1rem",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* CivicSync Official Shield Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.65rem",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Icon name="shield-check" size={20} />
            </div>
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
              CivicSync
            </span>
          </Link>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.5rem",
              fontWeight: 500,
              margin: "0.85rem 0 0.25rem",
              color: "var(--text-primary)",
            }}
          >
            {isHi ? "पुनः स्वागत है" : "Welcome back"}
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {isHi ? "अपने नागरिक नवाचार कार्यक्षेत्र में प्रवेश करें" : "Sign in to access your civic innovation workspace"}
          </p>
        </div>

        {/* Clean Auth Card */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "22px",
            border: "1px solid var(--border-color)",
            padding: "2rem",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                backgroundColor: "var(--color-danger-subtle)",
                border: "1px solid var(--color-danger-border)",
                color: "var(--color-danger)",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Icon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            onClick={() => handleQuickRole("CITIZEN")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              backgroundColor: "var(--bg-muted)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "0.85rem 1.25rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              cursor: "pointer",
              transition: "all 150ms ease",
              width: "100%",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-muted-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-muted)")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isHi ? "Google से आगे बढ़ें" : "Continue with Google"}</span>
          </button>

          {/* OR divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
            <span>{isHi ? "या" : "OR"}</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                {isHi ? "ईमेल पता" : "Email address"}
              </label>
              <input
                type="email"
                placeholder={isHi ? "अपना ईमेल दर्ज करें" : "Enter your personal or work email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-page)",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  {isHi ? "पासवर्ड" : "Password"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  {showPassword ? (isHi ? "छुपाएं" : "Hide") : (isHi ? "दिखाएं" : "Show")}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-page)",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.85rem 1.25rem",
                borderRadius: "12px",
                backgroundColor: "var(--color-primary)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                marginTop: "0.25rem",
                transition: "opacity 150ms ease",
              }}
            >
              {loading
                ? (isHi ? "प्रमाणीकरण जारी..." : "Authenticating...")
                : (isHi ? "ईमेल से आगे बढ़ें" : "Continue with email")}
            </button>
          </form>

          {/* Quick role workspace picker */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {isHi ? "प्रत्यक्ष कार्यक्षेत्र भूमिका पहुंच:" : "Direct workspace role access:"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {[
                { role: "CITIZEN", label: isHi ? "नागरिक" : "Citizen" },
                { role: "STUDENT", label: isHi ? "छात्र" : "Student" },
                { role: "AUTHORITY", label: isHi ? "प्राधिकरण" : "Authority" },
                { role: "MSME", label: isHi ? "स्टार्टअप / एमएसएमई" : "Startup / MSME" },
                { role: "RESEARCHER", label: isHi ? "शोधकर्ता" : "Researcher" },
                { role: "UNIVERSITY", label: isHi ? "विश्वविद्यालय" : "University" },
              ].map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleQuickRole(item.role)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "100px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-page)",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                    e.currentTarget.style.borderColor = "var(--ink-700)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-page)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.4 }}>
            {isHi ? (
              <>
                आगे बढ़कर, आप सिविकसिंक की{" "}
                <span style={{ textDecoration: "underline", cursor: "pointer" }}>गोपनीयता नीति</span> और{" "}
                <span style={{ textDecoration: "underline", cursor: "pointer" }}>सार्वजनिक शासन चार्टर</span> को स्वीकार करते हैं।
              </>
            ) : (
              <>
                By continuing, you acknowledge CivicSync's{" "}
                <span style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span> and{" "}
                <span style={{ textDecoration: "underline", cursor: "pointer" }}>Public Governance Charter</span>.
              </>
            )}
          </div>
        </div>

        {/* Register footer link */}
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          {isHi ? "खाता नहीं है?" : "Don't have an account?"}{" "}
          <Link to="/register" style={{ fontWeight: 600, color: "var(--color-primary)", textDecoration: "underline" }}>
            {isHi ? "नया खाता बनाएं" : "Create one now"}
          </Link>
        </div>
      </div>
    </div>
  );
}
