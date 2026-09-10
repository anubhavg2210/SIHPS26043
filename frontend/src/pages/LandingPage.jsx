import { Icon } from "../components/common/Icons";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Cards";
import { useRouter } from "../context/useRouter.js";
import { useAuth } from "../context/useAuth.js";

export function LandingPage() {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1280px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
            }}
          >
            <Icon name="shield-check" size={20} />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text-primary)" }}>
              CivicSync
            </span>
            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
              SIH 2026
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {isAuthenticated ? (
            <Button variant="primary" size="sm" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate("/register")}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: "5rem 1.5rem 4rem",
          textAlign: "center",
          maxWidth: "900px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 0.85rem",
            backgroundColor: "var(--color-primary-subtle)",
            color: "var(--color-primary)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.825rem",
            fontWeight: 600,
            marginBottom: "1.5rem",
            border: "1px solid var(--color-primary-border)",
          }}
        >
          <Icon name="award" size={14} />
          <span>Smart India Hackathon 2026 — Societal Challenge Intelligence</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "0 0 1.25rem",
            lineHeight: 1.15,
          }}
        >
          Turn Real Problems Into <span style={{ color: "var(--color-primary)" }}>Real Solutions</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "var(--text-secondary)",
            margin: "0 auto 2.5rem",
            maxWidth: "720px",
            lineHeight: 1.6,
          }}
        >
          CivicSync connects societal challenges with the right expertise, people, and organizations — and tracks the transparent journey from AI analysis to verified real-world impact.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Button
            variant="primary"
            size="lg"
            icon="plus-circle"
            onClick={() => navigate(isAuthenticated ? "/report" : "/login")}
          >
            Report a Problem
          </Button>
          <Button
            variant="outline"
            size="lg"
            icon="search"
            onClick={() => navigate("/explore")}
          >
            Explore Problems
          </Button>
        </div>
      </section>

      {/* 4 Simple Feature Pillars */}
      <section
        style={{
          padding: "3rem 1.5rem 4rem",
          backgroundColor: "var(--bg-page)",
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              How CivicSync Solves Societal Problems
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Moving beyond passive complaint portals into collaborative real-world problem execution.
            </p>
          </div>

          <div className="cs-grid-4">
            <Card hover style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Icon name="plus-circle" size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>1. Report</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", flex: 1 }}>
                Citizens report real challenges with location, severity, and community impact indicators.
              </p>
            </Card>

            <Card hover style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Icon name="cpu" size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>2. AI Analyse</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", flex: 1 }}>
                Rule-based NLP analysis classifies domain, severity, and detects required expert skill profiles.
              </p>
            </Card>

            <Card hover style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-secondary-subtle)",
                  color: "var(--color-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Icon name="users" size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>3. Collaborate</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", flex: 1 }}>
                Intelligent matching connects problems with universities, researchers, startups, and MSMEs.
              </p>
            </Card>

            <Card hover style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <Icon name="activity" size={22} />
              </div>
              <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>4. Impact</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", flex: 1 }}>
                Track solutions from pilot milestones to verified before-and-after measurable outcomes.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Lightweight "How It Works" Journey Flow */}
      <section style={{ padding: "4rem 1.5rem", maxWidth: "1000px", margin: "0 auto", textAlign: "center", width: "100%" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 2rem" }}>
          The Complete Problem-To-Impact Journey
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {["Problem", "AI Analysis", "Expertise Match", "Collaborate", "Solve", "Verified Impact"].map(
            (step, idx, arr) => (
              <div key={step} style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    padding: "0.6rem 1.2rem",
                    backgroundColor: idx === arr.length - 1 ? "var(--color-secondary-subtle)" : "var(--bg-muted)",
                    color: idx === arr.length - 1 ? "var(--color-secondary)" : "var(--text-primary)",
                    border: `1px solid ${idx === arr.length - 1 ? "var(--color-secondary-border)" : "var(--border-color)"}`,
                    borderRadius: "var(--radius-md)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  {step}
                </div>
                {idx < arr.length - 1 && (
                  <Icon name="arrow-right" size={16} color="var(--text-muted)" />
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* Simple Footer */}
      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border-color)",
          padding: "2rem",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        <div>CivicSync — Built for Smart India Hackathon (SIH 2026)</div>
        <div style={{ marginTop: "0.35rem", fontSize: "0.75rem" }}>
          Empowering citizens, institutions, students, researchers, and authorities to solve real societal challenges.
        </div>
      </footer>
    </div>
  );
}
