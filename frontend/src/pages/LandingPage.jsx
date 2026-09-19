import { useState, useEffect } from "react";
import { Icon } from "../components/common/Icons";
import { useRouter } from "../context/useRouter.js";
import { useAuth } from "../context/useAuth.js";
import { useTranslation } from "../context/useTranslation.js";

export function LandingPage() {
  const { navigate } = useRouter();
  const { isAuthenticated, demoSwitchRole } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  const isHi = language === "hi";

  // Auth Card input state
  const [emailInput, setEmailInput] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0); // 0 = Ranchi Report, 1 = Funnel, 2 = Calendar

  // Auto-rotate the preview slides every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = async (roleKey) => {
    setShowRoleModal(false);
    try {
      await demoSwitchRole(roleKey);
      navigate("/dashboard");
    } catch (err) {
      console.error("Role switch failed:", err);
      navigate("/dashboard");
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setShowRoleModal(true);
    } else {
      navigate("/login");
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--canvas)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color)",
          padding: "0.85rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          backgroundColor: "var(--canvas)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* CivicSync Official Shield Emblem & Name */}
        <div
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              backgroundColor: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            }}
          >
            <Icon name="shield-check" size={19} />
          </div>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "1.45rem",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            CivicSync
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              padding: "0.15rem 0.5rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-accent-subtle)",
              color: "var(--color-accent)",
              marginLeft: "0.25rem",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            {isHi ? "नागरिक नवाचार" : "Civic Innovation"}
          </span>
        </div>

        {/* Center Links (Dual-language translated) */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
          className="hide-mobile"
        >
          <span
            onClick={() => scrollToSection("how-it-works")}
            style={{ cursor: "pointer", transition: "color 150ms ease" }}
            onMouseEnter={(e) => (e.target.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}
          >
            {isHi ? "कार्यप्रणाली" : "How It Works"}
          </span>
          <span
            onClick={() => scrollToSection("stakeholders")}
            style={{ cursor: "pointer", transition: "color 150ms ease" }}
            onMouseEnter={(e) => (e.target.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}
          >
            {isHi ? "हितधारक" : "Stakeholders"}
          </span>
          <span
            onClick={() => scrollToSection("lifecycle")}
            style={{ cursor: "pointer", transition: "color 150ms ease" }}
            onMouseEnter={(e) => (e.target.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}
          >
            {isHi ? "शासन पाइपलाइन" : "Governance Pipeline"}
          </span>
        </nav>

        {/* Right Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Language Switcher (EN | हिन्दी) */}
          <button
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "0.4rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              backgroundColor: "var(--bg-muted)",
              transition: "all 150ms ease",
            }}
            title={isHi ? "Switch to English" : "हिंदी में बदलें"}
          >
            <Icon name="globe" size={14} />
            <span>{isHi ? "English" : "हिंदी"}</span>
          </button>

          {isAuthenticated ? (
            <button
              className="cs-btn cs-btn-primary"
              onClick={() => navigate("/dashboard")}
              style={{ padding: "0.55rem 1.25rem" }}
            >
              {isHi ? "डैशबोर्ड →" : "Dashboard →"}
            </button>
          ) : (
            <>
              <button
                className="cs-btn cs-btn-ghost"
                onClick={() => navigate("/login")}
                style={{ padding: "0.55rem 1rem" }}
              >
                {isHi ? "साइन इन" : "Sign In"}
              </button>
              <button
                className="cs-btn cs-btn-primary"
                onClick={() => setShowRoleModal(true)}
                style={{ padding: "0.55rem 1.25rem" }}
              >
                {isHi ? "शुरुआत करें" : "Get Started"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main 50/50 Split Hero Section */}
      <section
        style={{
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          padding: "3.5rem 2rem 4.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1.15fr",
          gap: "3.5rem",
          alignItems: "flex-start",
        }}
      >
        {/* Left Column: Heading + Subtitle + Action Card + Learn More */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* CivicSync Brand mark */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <Icon name="shield-check" size={16} />
            </div>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              CivicSync
            </span>
          </div>

          {/* Large Editorial Serif Headline */}
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.8rem, 4.2vw, 4rem)",
              fontWeight: 500,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {isHi ? (
              <>
                वास्तविक समस्याएं,<br />
                साझा समाधान।
              </>
            ) : (
              <>
                Real problems,<br />
                solved together.
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "480px",
            }}
          >
            {isHi
              ? "गोपनीयता-प्रथम, एआई-सहायता प्राप्त मंच जो नागरिक रिपोर्टों को छात्रों, शोधकर्ताओं, नगर प्राधिकरणों और कार्यान्वयन भागीदारों से जोड़ता है।"
              : "Privacy-first, AI-assisted platform connecting citizen reports with students, researchers, authorities, and implementation partners."}
          </p>

          {/* Clean Authentication & Role Action Card */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "22px",
              padding: "2rem",
              border: "1px solid var(--border-color)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              maxWidth: "440px",
              width: "100%",
            }}
          >
            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
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
                transition: "background-color 150ms ease, transform 150ms ease",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-muted-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isHi ? "Google से आगे बढ़ें" : "Continue with Google"}</span>
            </button>

            {/* OR Divider Line */}
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

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <input
                type="email"
                placeholder={isHi ? "अपना व्यक्तिगत या कार्य ईमेल दर्ज करें" : "Enter your personal or work email"}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-page)",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  outline: "none",
                  transition: "border-color 150ms ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--ink-900)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "12px",
                  backgroundColor: "var(--color-primary)",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity 150ms ease, transform 150ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {isHi ? "ईमेल से आगे बढ़ें" : "Continue with email"}
              </button>
            </form>

            {/* Privacy Subtext */}
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
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

          {/* Learn More Button */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.25rem" }}>
            <button
              onClick={() => scrollToSection("how-it-works")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.2rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <span>{isHi ? "अधिक जानें" : "Learn more"}</span>
              <span>↓</span>
            </button>
          </div>
        </div>

        {/* Right Column: Direct Civic Report Card (No chatbot bubbles, Ranchi Ward 42 Civic Report) */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "24px",
            border: "1px solid var(--border-color)",
            padding: "2.5rem 2.25rem",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "480px",
          }}
        >
          {/* SLIDE 0: Ranchi Ward 42 Civic Report (Exact Match to User's Uploaded Image!) */}
          {activeSlide === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
                    fontWeight: 600,
                    margin: "0 0 0.5rem",
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {isHi ? "राँची वार्ड 42 नागरिक रिपोर्ट" : "Ranchi Ward 42 Civic Report"}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {isHi
                    ? "जमीनी शिकायतों, छात्रों द्वारा प्रस्तावित इंजीनियरिंग समाधानों और एमएसएमई सड़क मरम्मत गति का व्यापक विश्लेषण।"
                    : "Comprehensive analysis of ground-truth grievances, student-proposed engineering solutions, and MSME road repair velocity."}
                </p>
              </div>

              {/* OVERVIEW Section Header */}
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {isHi ? "अवलोकन" : "OVERVIEW"}
              </div>

              {/* 4 Stat Tiles Matching User's Image */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.85rem" }}>
                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    padding: "1rem 0.75rem",
                    borderRadius: "14px",
                    textAlign: "center",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    {isHi ? "नागरिक" : "Citizens"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(1.5rem, 2.2vw, 2rem)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: "4px",
                      lineHeight: 1.1,
                    }}
                  >
                    1,284
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    padding: "1rem 0.75rem",
                    borderRadius: "14px",
                    textAlign: "center",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    {isHi ? "समाधान दर" : "Resolution"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(1.5rem, 2.2vw, 2rem)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: "4px",
                      lineHeight: 1.1,
                    }}
                  >
                    88%
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    padding: "1rem 0.75rem",
                    borderRadius: "14px",
                    textAlign: "center",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    {isHi ? "परियोजनाएं" : "Projects"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(1.5rem, 2.2vw, 2rem)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: "4px",
                      lineHeight: 1.1,
                    }}
                  >
                    45
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    padding: "1rem 0.75rem",
                    borderRadius: "14px",
                    textAlign: "center",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    {isHi ? "प्रस्ताव" : "Proposals"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(1.5rem, 2.2vw, 2rem)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: "4px",
                      lineHeight: 1.1,
                    }}
                  >
                    186
                  </div>
                </div>
              </div>

              {/* Trend Box Matching User's Image */}
              <div
                style={{
                  backgroundColor: "var(--bg-page)",
                  padding: "1.1rem 1.35rem",
                  borderRadius: "16px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  {isHi
                    ? "रुझान: समाधान का समय 18 से घटकर 4.2 दिन हुआ"
                    : "Trend: Resolution turnaround reduced from 18 to 4.2 days"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {isHi
                    ? "एआई क्लस्टरिंग ने 74% अनावश्यक इंजीनियर दौरों को हटाया। छात्र इंजीनियरिंग प्रस्तावों को पीडब्ल्यूडी द्वारा 36 घंटों के भीतर अपनाया गया।"
                    : "AI clustering deduplicated 74% redundant engineer visits. Student engineering proposals were reviewed and adopted by PWD within 36 hours."}
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: Ranchi Resolution Funnel Bar Graph */}
          {activeSlide === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isHi ? "राँची नागरिक समाधान फ़नल" : "Ranchi Civic Resolution Funnel"}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {isHi ? "पिछले 30 दिनों की प्रगति" : "Pipeline throughput over past 30 days"}
                  </p>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", borderRadius: "100px", backgroundColor: "var(--color-success-subtle)", color: "var(--color-success)", fontWeight: 600 }}>
                  {isHi ? "सक्रिय गति" : "Active Velocity"}
                </span>
              </div>

              {/* SVG Bar Chart with 5 pastel pill bars */}
              <div style={{ height: "220px", width: "100%", display: "flex", alignItems: "flex-end", gap: "1.2rem", padding: "10px 10px 0", borderBottom: "1px solid var(--border-color)", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  <span>400</span>
                  <span>300</span>
                  <span>200</span>
                  <span>100</span>
                  <span>0</span>
                </div>

                <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "flex-end", justifyContent: "space-around", paddingLeft: "28px" }}>
                  {/* Bar 1 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "16%" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#2563EB" }}>420</span>
                    <div style={{ width: "100%", height: "170px", backgroundColor: "#60A5FA", borderRadius: "8px 8px 0 0" }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", whiteSpace: "nowrap" }}>
                      {isHi ? "दर्ज" : "Reported"}
                    </span>
                  </div>

                  {/* Bar 2 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "16%" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#059669" }}>210</span>
                    <div style={{ width: "100%", height: "110px", backgroundColor: "#34D399", borderRadius: "8px 8px 0 0" }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", whiteSpace: "nowrap" }}>
                      {isHi ? "क्लस्टर" : "Clustered"}
                    </span>
                  </div>

                  {/* Bar 3 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "16%" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#D97706" }}>115</span>
                    <div style={{ width: "100%", height: "70px", backgroundColor: "#FBBF24", borderRadius: "8px 8px 0 0" }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", whiteSpace: "nowrap" }}>
                      {isHi ? "स्वीकृत" : "Adopted"}
                    </span>
                  </div>

                  {/* Bar 4 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "16%" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#7C3AED" }}>68</span>
                    <div style={{ width: "100%", height: "45px", backgroundColor: "#A78BFA", borderRadius: "8px 8px 0 0" }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", whiteSpace: "nowrap" }}>
                      {isHi ? "आवंटित" : "Assigned"}
                    </span>
                  </div>

                  {/* Bar 5 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "16%" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#E11D48" }}>45</span>
                    <div style={{ width: "100%", height: "30px", backgroundColor: "#FB7185", borderRadius: "8px 8px 0 0" }} />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", whiteSpace: "nowrap" }}>
                      {isHi ? "सत्यापित" : "Verified"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Ranchi Infrastructure Work Schedule */}
          {activeSlide === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                    {isHi ? "राँची मेन रोड — एमएसएमई कार्य अनुसूची" : "Ranchi Main Road — MSME Work Schedule"}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {isHi ? "सक्रिय निर्माण और साइट सत्यापन" : "Active construction and site milestone verification"}
                  </p>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "100px", backgroundColor: "var(--color-success-subtle)", color: "var(--color-success)", fontWeight: 600 }}>
                  {isHi ? "प्रगति पर" : "In Progress"}
                </span>
              </div>

              {/* Calendar Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "6px",
                  fontSize: "0.75rem",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  padding: "10px",
                  backgroundColor: "var(--bg-page)",
                }}
              >
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                  <div key={day} style={{ textAlign: "center", fontWeight: 600, color: "var(--text-muted)", padding: "4px 0" }}>
                    {day}
                  </div>
                ))}

                {/* Row 1 */}
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>2</span>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>3</span>
                  <div style={{ marginTop: "2px", padding: "2px 4px", borderRadius: "4px", backgroundColor: "#E0F2FE", color: "#0369A1", fontSize: "0.65rem", fontWeight: 600 }}>
                    {isHi ? "पीडब्ल्यूडी सर्वेक्षण" : "PWD Survey"}
                  </div>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>4</span>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>5</span>
                  <div style={{ marginTop: "2px", padding: "2px 4px", borderRadius: "4px", backgroundColor: "#F3E8FF", color: "#7E22CE", fontSize: "0.65rem", fontWeight: 600 }}>
                    {isHi ? "पाइप आपूर्ति" : "Pipe Delivery"}
                  </div>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>6</span>
                </div>

                {/* Row 2 */}
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>9</span>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>10</span>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>11</span>
                  <div style={{ marginTop: "2px", padding: "2px 4px", borderRadius: "4px", backgroundColor: "#FEF3C7", color: "#B45309", fontSize: "0.65rem", fontWeight: 600 }}>
                    {isHi ? "खुदाई कार्य" : "Excavation"}
                  </div>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>12</span>
                  <div style={{ marginTop: "2px", padding: "2px 4px", borderRadius: "4px", backgroundColor: "#DCFCE7", color: "#15803D", fontSize: "0.65rem", fontWeight: 600 }}>
                    {isHi ? "पुलिया निर्माण" : "Culvert Build"}
                  </div>
                </div>
                <div style={{ minHeight: "50px", padding: "4px", backgroundColor: "var(--bg-card)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>13</span>
                </div>
              </div>
            </div>
          )}

          {/* Carousel Navigation Indicator Dots */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1.75rem" }}>
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                style={{
                  width: activeSlide === idx ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "100px",
                  backgroundColor: activeSlide === idx ? "var(--color-primary)" : "var(--border-color)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 200ms ease",
                }}
                title={
                  idx === 0
                    ? isHi ? "राँची नागरिक रिपोर्ट" : "Ranchi Civic Report"
                    : idx === 1
                    ? isHi ? "समाधान फ़नल" : "Resolution Funnel"
                    : isHi ? "कार्य अनुसूची" : "Work Schedule"
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section: Sequential Civic Governance Pipeline */}
      <section
        id="how-it-works"
        style={{
          padding: "5rem 2rem",
          backgroundColor: "var(--bg-page)",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {isHi ? "सार्वजनिक शासन प्रणाली" : "Public Governance Architecture"}
            </span>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontWeight: 500,
                margin: "0.5rem 0 0.85rem",
                color: "var(--text-primary)",
              }}
            >
              {isHi ? "सिविकसिंक वास्तविक समस्याओं का समाधान कैसे करता है" : "How CivicSync Coordinates Real Solutions"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "640px", margin: "0 auto" }}>
              {isHi
                ? "कभी यह दावा नहीं किया जाता कि 'एआई ने समस्या हल कर दी'। हमेशा नागरिकों, छात्रों, शोधकर्ताओं, नगर प्राधिकरणों और भौतिक कार्यान्वयन को आपस में जोड़ा जाता है।"
                : "Never claiming AI solved a civic issue. Always connecting ground-truth citizen reports with students, verified authorities, and physical MSME execution."}
            </p>
          </div>

          {/* 6 Grid Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {[
              {
                step: "01",
                title: isHi ? "नागरिक जमीनी रिपोर्ट" : "Citizen Ground-Truth Report",
                desc: isHi
                  ? "नागरिक फोटो, ऑडियो और स्थान साक्ष्य के साथ वास्तविक समस्याएं दर्ज करते हैं।"
                  : "Citizens submit verified geotagged reports with photos, audio notes, and urgency indicators.",
                icon: "camera",
                badge: isHi ? "नागरिक" : "Citizen",
              },
              {
                step: "02",
                title: isHi ? "एआई विश्लेषण व क्लस्टरिंग" : "AI Analysis & Semantic Clustering",
                desc: isHi
                  ? "एआई मूल कारणों की पहचान करता है और दोहराई गई शिकायतों को मास्टर चुनौतियों में संकलित करता है।"
                  : "AI identifies root causes, clusters duplicate complaints into actionable challenges, and maps statutory department jurisdiction.",
                icon: "cpu",
                badge: "CivicSync Engine",
              },
              {
                step: "03",
                title: isHi ? "छात्र व विशेषज्ञ तकनीकी प्रस्ताव" : "Student & Expert Proposals",
                desc: isHi
                  ? "छात्र और शोधकर्ता इंजीनियरिंग डिजाइन, लागत अनुमान और कार्यप्रणाली का प्रस्ताव रखते हैं।"
                  : "Students and researchers review structured challenges and submit technical engineering designs, cost estimates, and methodology.",
                icon: "book-open",
                badge: isHi ? "अकादमिक" : "Academia",
              },
              {
                step: "04",
                title: isHi ? "प्राधिकरण समीक्षा व स्वीकृति" : "Authority Review & Adoption",
                desc: isHi
                  ? "नगर प्राधिकरण प्रस्तावों का मूल्यांकन करते हैं और उपयुक्त समाधान को औपचारिक रूप से स्वीकार करते हैं।"
                  : "Municipal authorities evaluate proposals, verify statutory compliance, and formally adopt selected solution blueprints.",
                icon: "shield-check",
                badge: isHi ? "सरकार" : "Government",
              },
              {
                step: "05",
                title: isHi ? "स्टार्टअप व एमएसएमई कार्यान्वयन" : "Startup & MSME Implementation",
                desc: isHi
                  ? "प्राधिकरण स्थानीय ठेकेदारों को कार्य सौंपते हैं, जो निर्माण का टाइमस्टैम्प साक्ष्य अपलोड करते हैं।"
                  : "Authorities assign physical execution to local engineering contractors, who upload timestamped progress proof.",
                icon: "briefcase",
                badge: isHi ? "कार्यान्वयन" : "Implementation",
              },
              {
                step: "06",
                title: isHi ? "बहु-पक्षीय सत्यापन व पारदर्शिता" : "Multi-Party Verification",
                desc: isHi
                  ? "नागरिक और अधिकारी भौतिक समाधान का निरीक्षण करते हैं और काम पूरा होने की पुष्टि करते हैं।"
                  : "Citizens inspect the physical resolution, verify photos/video proof, and close the issue transparently.",
                icon: "check-circle",
                badge: isHi ? "पारदर्शिता" : "Public Visibility",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="cs-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  padding: "1.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      backgroundColor: "var(--color-primary-subtle)",
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={item.icon} size={20} />
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "100px", backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                    {item.badge}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                    {isHi ? `चरण ${item.step}` : `STEP ${item.step}`}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", margin: "0.25rem 0 0.5rem", color: "var(--text-primary)" }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stakeholders Section: 6 Distinct Roles */}
      <section
        id="stakeholders"
        style={{
          padding: "5rem 2rem",
          backgroundColor: "var(--canvas)",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {isHi ? "बहु-हितधारक तंत्र" : "Multi-Role Ecosystem"}
            </span>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontWeight: 500,
                margin: "0.5rem 0 0.85rem",
                color: "var(--text-primary)",
              }}
            >
              {isHi ? "प्रत्येक नागरिक भागीदार के लिए निर्मित" : "Built for Every Civic Stakeholder"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
              {isHi
                ? "अपनी भूमिका चुनें और समर्पित कार्यक्षेत्र, लाइव चुनौतियां व पारदर्शी समन्वय डैशबोर्ड देखें।"
                : "Select your role to explore dedicated tools, live challenges, and transparent coordination dashboards."}
            </p>
          </div>

          {/* 6 Role Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {[
              {
                role: "CITIZEN",
                title: isHi ? "नागरिक" : "Citizen",
                desc: isHi
                  ? "जमीनी समस्याएं दर्ज करें, प्राधिकरण की प्रगति ट्रैक करें और साक्ष्य के साथ समाधान सत्यापित करें।"
                  : "Report ground-truth civic problems, track authority adoption, and verify physical resolution with geotagged evidence.",
                icon: "user",
                cta: isHi ? "नागरिक के रूप में प्रवेश करें" : "Enter as Citizen",
              },
              {
                role: "STUDENT",
                title: isHi ? "छात्र / शोधकर्ता" : "Student / Researcher",
                desc: isHi
                  ? "वास्तविक समस्याओं को देखें, इंजीनियरिंग समाधान प्रस्तावित करें और अपना नवाचार पोर्टफोलियो बनाएं।"
                  : "Access real civic problem statements, submit technical solution designs, and build your verified Civic Innovation Portfolio.",
                icon: "book-open",
                cta: isHi ? "छात्र के रूप में प्रवेश करें" : "Enter as Student",
              },
              {
                role: "UNIVERSITY",
                title: isHi ? "शैक्षणिक संस्थान" : "Academic Institution",
                desc: isHi
                  ? "संकाय विभागों को संगठित करें, छात्रों के सामुदायिक योगदान को ट्रैक करें और पायलट प्रायोजित करें।"
                  : "Mobilize department engineering faculties, track student community service credits, and sponsor high-impact pilot projects.",
                icon: "award",
                cta: isHi ? "संस्थान के रूप में प्रवेश करें" : "Enter as Institution",
              },
              {
                role: "MSME",
                title: isHi ? "स्टार्टअप / एमएसएमई ठेकेदार" : "Startup / MSME Contractor",
                desc: isHi
                  ? "नगरपालिका कार्य आदेश प्राप्त करें, निर्माण चरण प्रबंधित करें और प्रगति साक्ष्य अपलोड करें।"
                  : "Receive municipal work assignments, manage milestones, and submit physical proof of execution to release milestone funds.",
                icon: "briefcase",
                cta: isHi ? "स्टार्टअप / एमएसएमई के रूप में प्रवेश करें" : "Enter as Startup / MSME",
              },
              {
                role: "AUTHORITY",
                title: isHi ? "नगरपालिका प्राधिकरण" : "Municipal Authority",
                desc: isHi
                  ? "संकलित चुनौतियों की समीक्षा करें, छात्र प्रस्तावों को अपनाएं और पारदर्शी कार्य आदेश जारी करें।"
                  : "Review deduplicated master challenges, adopt verified student proposals, and issue transparent contractor work orders.",
                icon: "shield-check",
                cta: isHi ? "प्राधिकरण के रूप में प्रवेश करें" : "Enter as Authority",
              },
              {
                role: "ADMIN",
                title: isHi ? "प्लेटफॉर्म प्रशासक" : "Platform Administrator",
                desc: isHi
                  ? "प्रणाली की स्थिति की निगरानी करें, संस्थागत क्रेडेंशियल सत्यापित करें और एसएलए अनुपालन सुनिश्चित करें।"
                  : "Monitor platform health, verify institutional credentials, and oversee public integrity and SLA compliance.",
                icon: "activity",
                cta: isHi ? "प्रशासक के रूप में प्रवेश करें" : "Enter as Administrator",
              },
            ].map((item) => (
              <div
                key={item.role}
                className="cs-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "1.75rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        backgroundColor: "var(--color-primary-subtle)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={item.icon} size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", margin: 0, color: "var(--text-primary)" }}>
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {item.desc}
                  </p>
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <button
                    className="cs-btn cs-btn-secondary"
                    onClick={() => handleRoleSelect(item.role)}
                    style={{ width: "100%", padding: "0.65rem 1rem", fontSize: "0.85rem" }}
                  >
                    <span>{item.cta}</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Civic Innovation Commitment Banner */}
      <section
        id="lifecycle"
        style={{
          padding: "4rem 2rem",
          backgroundColor: "var(--bg-muted)",
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              backgroundColor: "var(--color-primary)",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <Icon name="shield-check" size={22} />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.75rem, 3vw, 2.35rem)",
              fontWeight: 500,
              margin: "0 0 1rem",
              color: "var(--text-primary)",
            }}
          >
            {isHi
              ? "“छात्र समाधान प्रस्तावित करते हैं। प्राधिकरण उन्हें अपनाते हैं। स्टार्टअप कार्यान्वयन करते हैं। नागरिक सत्यापन करते हैं।”"
              : "“Students propose solutions. Authorities adopt them. Startups implement. Citizens verify.”"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, margin: "0 0 1.75rem" }}>
            {isHi
              ? "सिविकसिंक नागरिक नवाचार के हर चरण में पारदर्शी सार्वजनिक शासन और सत्यापन योग्य मील के पत्थर सुनिश्चित करता है।"
              : "CivicSync coordinates genuine societal problem-solving through verified governance milestones across every stage."}
          </p>
          <button
            className="cs-btn cs-btn-primary"
            onClick={() => setShowRoleModal(true)}
            style={{ padding: "0.85rem 2rem", fontSize: "0.95rem" }}
          >
            {isHi ? "मंच का अन्वेषण करें →" : "Explore Platform →"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "var(--canvas)",
          padding: "3.5rem 2rem 2.5rem",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "2.5rem",
            marginBottom: "3rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                }}
              >
                <Icon name="shield-check" size={16} />
              </div>
              <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "1.25rem", color: "var(--text-primary)" }}>
                CivicSync
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "300px", lineHeight: 1.6 }}>
              {isHi
                ? "एआई-सहायता प्राप्त नागरिक समस्या रिपोर्टिंग और बहु-हितधारक समाधान समन्वय मंच।"
                : "AI-assisted civic problem reporting and multi-stakeholder solution coordination platform."}
            </p>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>
              {isHi ? "मंच" : "Platform"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span onClick={() => navigate("/explore")} style={{ cursor: "pointer" }}>{isHi ? "सार्वजनिक चुनौतियां" : "Public Challenges"}</span>
              <span onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>{isHi ? "कार्यक्षेत्र" : "Workspaces"}</span>
              <span onClick={() => navigate("/rankings")} style={{ cursor: "pointer" }}>{isHi ? "संस्थागत रैंकिंग" : "Institutional Rankings"}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>
              {isHi ? "शासन" : "Governance"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span>{isHi ? "गोपनीयता-प्रथम प्रोटोकॉल" : "Privacy-First Protocol"}</span>
              <span>{isHi ? "वैधानिक अनुपालन" : "Statutory Compliance"}</span>
              <span>{isHi ? "पारदर्शिता चार्टर" : "Transparency Charter"}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>
              {isHi ? "हितधारक" : "Stakeholders"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span onClick={() => handleRoleSelect("CITIZEN")} style={{ cursor: "pointer" }}>{isHi ? "नागरिक" : "Citizens"}</span>
              <span onClick={() => handleRoleSelect("STUDENT")} style={{ cursor: "pointer" }}>{isHi ? "छात्र" : "Students"}</span>
              <span onClick={() => handleRoleSelect("AUTHORITY")} style={{ cursor: "pointer" }}>{isHi ? "प्राधिकरण" : "Authorities"}</span>
              <span onClick={() => handleRoleSelect("MSME")} style={{ cursor: "pointer" }}>{isHi ? "स्टार्टअप / एमएसएमई" : "Startups / MSMEs"}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>&copy; {new Date().getFullYear()} CivicSync. All rights reserved.</div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <span>{isHi ? "गोपनीयता" : "Privacy"}</span>
            <span>{isHi ? "सेवा की शर्तें" : "Terms of Service"}</span>
            <span>{isHi ? "खुला डेटा मानक" : "Open Data Standard"}</span>
          </div>
        </div>
      </footer>

      {/* Quick Role Selection Modal */}
      {showRoleModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(24, 24, 22, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem",
          }}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "24px",
              padding: "2.25rem",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      backgroundColor: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                    }}
                  >
                    <Icon name="shield-check" size={16} />
                  </div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.45rem", margin: 0, color: "var(--text-primary)" }}>
                    {isHi ? "अपनी भूमिका चुनें" : "Select Your Role"}
                  </h3>
                </div>
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {isHi
                    ? "वह कार्यक्षेत्र चुनें जिसे आप अनुभव करना चाहते हैं:"
                    : "Choose which stakeholder view you want to experience:"}
                </p>
              </div>

              <button
                onClick={() => setShowRoleModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.25rem",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1.5rem 0" }}>
              {[
                {
                  role: "CITIZEN",
                  label: isHi ? "नागरिक" : "Citizen",
                  desc: isHi ? "समस्या दर्ज करें और सत्यापन ट्रैक करें" : "Report problems & track verified progress",
                },
                {
                  role: "STUDENT",
                  label: isHi ? "छात्र / शोधकर्ता" : "Student / Researcher",
                  desc: isHi ? "चुनौतियां देखें और तकनीकी समाधान दें" : "View challenges & submit technical proposals",
                },
                {
                  role: "AUTHORITY",
                  label: isHi ? "नगरपालिका प्राधिकरण" : "Municipal Authority",
                  desc: isHi ? "प्रस्ताव अपनाएं और कार्य आदेश जारी करें" : "Review proposals & issue implementation orders",
                },
                {
                  role: "MSME",
                  label: isHi ? "स्टार्टअप / एमएसएमई" : "Startup / MSME",
                  desc: isHi ? "परियोजनाएं कार्यान्वित करें और साक्ष्य दें" : "Execute projects & upload milestone proof",
                },
                {
                  role: "UNIVERSITY",
                  label: isHi ? "शैक्षणिक संस्थान" : "Academic Institution",
                  desc: isHi ? "विभाग सहभागिता और शोध दल" : "Department engagement & research teams",
                },
                {
                  role: "ADMIN",
                  label: isHi ? "प्लेटफॉर्म प्रशासन" : "Platform Oversight",
                  desc: isHi ? "विश्वसनीयता, एसएलए और सार्वजनिक शासन" : "Integrity, SLAs, and public governance",
                },
              ].map((item) => (
                <button
                  key={item.role}
                  onClick={() => handleRoleSelect(item.role)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.9rem 1.2rem",
                    borderRadius: "14px",
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-muted-hover)";
                    e.currentTarget.style.borderColor = "var(--ink-700)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-muted)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {item.desc}
                    </div>
                  </div>
                  <span style={{ fontSize: "1rem", color: "var(--text-primary)" }}>&rarr;</span>
                </button>
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  navigate("/login");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {isHi ? "या ईमेल और पासवर्ड से साइन इन करें" : "Or sign in with an existing email & password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
