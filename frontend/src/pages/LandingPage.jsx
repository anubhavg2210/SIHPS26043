import { Icon } from "../components/common/Icons";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Cards";
import { useRouter } from "../context/useRouter.js";
import { useAuth } from "../context/useAuth.js";

export function LandingPage() {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ backgroundColor: "#fafafb", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation Header */}
      <header
        style={{
          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 100,
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
          padding: "6rem 2rem 5rem",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
          alignItems: "center",
          background: "radial-gradient(ellipse at top right, rgba(224, 231, 255, 0.5), transparent 60%), radial-gradient(ellipse at bottom left, rgba(238, 242, 255, 0.5), transparent 60%)",
        }}
      >
        {/* Left Side: Content */}
        <div style={{ paddingRight: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 1rem",
              backgroundColor: "rgba(37, 99, 235, 0.05)",
              color: "var(--color-primary)",
              borderRadius: "var(--radius-full)",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              marginBottom: "1.5rem",
              border: "1px solid rgba(37, 99, 235, 0.1)",
              textTransform: "uppercase"
            }}
          >
            <Icon name="award" size={14} />
            <span>Smart India Hackathon 2026</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0f172a", // Deep navy
              margin: "0 0 1.5rem",
              lineHeight: 1.1,
            }}
          >
            Real Problems.<br />
            Right Expertise.<br />
            <span style={{ 
              background: "linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Measurable Impact.
            </span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1.1rem, 2vw, 1.25rem)",
              color: "#475569",
              margin: "0 0 2.5rem",
              maxWidth: "540px",
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            CivicSync connects societal challenges with the right people, expertise, and organizations — from citizen reporting to verified real-world impact.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(isAuthenticated ? "/report" : "/login")}
              style={{ padding: "1rem 2rem", fontSize: "1rem", borderRadius: "var(--radius-full)" }}
            >
              Report a Problem &rarr;
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/explore")}
              style={{ padding: "1rem 2rem", fontSize: "1rem", borderRadius: "var(--radius-full)", backgroundColor: "#ffffff" }}
            >
              Explore Challenges
            </Button>
          </div>
        </div>

        {/* Right Side: Visual */}
        <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
          {/* Main Visual Card */}
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-2xl)",
              border: "1px solid rgba(0,0,0,0.05)",
              padding: "2.5rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.04)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "2rem" }}>
              CIVICSYNC INTELLIGENCE
            </div>

            {/* Step 1 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}>
                <Icon name="user" size={16} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Citizen Challenge</div>
                <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.25rem" }}>Unsafe Drinking Water</div>
              </div>
            </div>

            <div style={{ width: "2px", height: "24px", backgroundColor: "rgba(0,0,0,0.05)", marginLeft: "15px", marginBottom: "1.5rem" }} />

            {/* Step 2 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
                <Icon name="cpu" size={16} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>AI Analysis</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", backgroundColor: "#f1f5f9", borderRadius: "100px", color: "#475569" }}>Water Quality</span>
                  <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", backgroundColor: "#f1f5f9", borderRadius: "100px", color: "#475569" }}>Env. Engineering</span>
                  <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", backgroundColor: "#f1f5f9", borderRadius: "100px", color: "#475569" }}>IoT</span>
                </div>
              </div>
            </div>

            <div style={{ width: "2px", height: "24px", backgroundColor: "rgba(0,0,0,0.05)", marginLeft: "15px", marginBottom: "1.5rem" }} />

            {/* Step 3 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <Icon name="users" size={16} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Academic Expertise</div>
                <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.25rem" }}>Faculty + Students</div>
              </div>
            </div>

            <div style={{ width: "2px", height: "24px", backgroundColor: "rgba(0,0,0,0.05)", marginLeft: "15px", marginBottom: "1.5rem" }} />

            {/* Step 4 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
                <Icon name="check-circle" size={16} />
              </div>
              <div style={{ display: "flex", alignItems: "center", height: "32px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Solution &rarr; Impact</div>
              </div>
            </div>

          </div>

          {/* Floating Card 1 */}
          <div style={{
            position: "absolute",
            top: "10%",
            right: "-5%",
            backgroundColor: "#ffffff",
            padding: "1rem",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            zIndex: 2,
          }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
              <Icon name="sparkles" size={16} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>AI Insight</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>3 expertise areas identified</div>
            </div>
          </div>

          {/* Floating Card 2 */}
          <div style={{
            position: "absolute",
            bottom: "20%",
            left: "-10%",
            backgroundColor: "#ffffff",
            padding: "1rem",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            zIndex: 2,
          }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
              <Icon name="target" size={16} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>Expertise Match</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Faculty + Students</div>
            </div>
          </div>
        </div>
      </section>

      {/* Capability Strip */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", borderBottom: "1px solid rgba(0,0,0,0.05)", backgroundColor: "#ffffff", padding: "1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>
            <Icon name="cpu" size={16} /> AI Challenge Intelligence
          </div>
          <div style={{ color: "#cbd5e1" }}>&bull;</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>
            <Icon name="users" size={16} /> Explainable Expertise Matching
          </div>
          <div style={{ color: "#cbd5e1" }}>&bull;</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>
            <Icon name="git-branch" size={16} /> Collaborative Solutions
          </div>
          <div style={{ color: "#cbd5e1" }}>&bull;</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>
            <Icon name="check-circle" size={16} /> Verified Impact
          </div>
        </div>
      </div>

      {/* Second Section: Workflow */}
      <section
        style={{
          padding: "6rem 2rem 6rem",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
              How CivicSync Solves Societal Problems
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto" }}>
              Moving beyond passive complaint portals into collaborative real-world problem execution.
            </p>
          </div>

          {/* Workflow Journey */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", gap: "1rem", flexWrap: "wrap" }}>
            {/* Connecting Line (Desktop) */}
            <div style={{ position: "absolute", top: "40px", left: "10%", right: "10%", height: "2px", background: "linear-gradient(90deg, rgba(37,99,235,0.1) 0%, rgba(37,99,235,0.3) 50%, rgba(37,99,235,0.1) 100%)", zIndex: 0 }} />

            {[
              { num: "01", title: "REPORT", desc: "Citizen reports a real problem", icon: "edit-3" },
              { num: "02", title: "UNDERSTAND", desc: "AI structures the challenge", icon: "cpu" },
              { num: "03", title: "MATCH", desc: "Find relevant expertise", icon: "users" },
              { num: "04", title: "SOLVE", desc: "Collaborate and submit solutions", icon: "lightbulb" },
              { num: "05", title: "IMPACT", desc: "Implement and measure results", icon: "star" },
            ].map((step, index) => (
              <div key={step.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: "150px", zIndex: 1, textAlign: "center", marginBottom: "2rem" }}>
                <div style={{ 
                  width: "80px", 
                  height: "80px", 
                  borderRadius: "var(--radius-xl)", 
                  backgroundColor: "#ffffff", 
                  border: "1px solid rgba(0,0,0,0.05)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center", 
                  marginBottom: "1.5rem",
                  color: "var(--color-primary)",
                }}>
                   <Icon name={step.icon} size={24} />
                   <div style={{ fontSize: "0.65rem", fontWeight: 800, marginTop: "0.3rem", color: "#94a3b8" }}>{step.num}</div>
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem", letterSpacing: "0.05em" }}>{step.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, maxWidth: "160px" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid rgba(0,0,0,0.05)",
          backgroundColor: "#fafafb",
          padding: "3rem 2rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>CivicSync — Built for Smart India Hackathon (SIH 2026)</div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", maxWidth: "500px", margin: "0 auto" }}>
          Empowering citizens, institutions, students, researchers, and authorities to solve real societal challenges.
        </div>
      </footer>
    </div>
  );
}
